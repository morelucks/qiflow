import crypto from 'crypto';
import type { PaymentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { CreatePaymentInput, SimulatePaymentInput, SubmitTransactionInput } from '../schemas/payments.schema.js';
import type { MerchantContext } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';
import { verifyPaymentOnChain } from './payment-verifier.js';
import { logger } from '../lib/logger.js';

export type { MerchantContext };

function getPaymentCheckoutUrl(paymentCode: string): string {
  const baseUrl = process.env.CHECKOUT_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/pay/${paymentCode}`;
}

export class PaymentsService {
  static async getPublicPayment(code: string) {
    const payment = await prisma.payment.findUnique({
      where: { paymentCode: code },
      include: {
        merchant: {
          select: {
            businessName: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!payment) {
      throw createError('Payment code not found', 404, 'NOT_FOUND');
    }

    // Lazily expire stale sessions
    if ((payment.status === 'CREATED' || payment.status === 'PENDING') && payment.expiresAt < new Date()) {
      payment.status = (
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'EXPIRED' } })
      ).status;
    }

    // Lazily verify a submitted tx (the checkout page polls this endpoint)
    if (payment.status === 'PROCESSING' && payment.txHash) {
      const outcome = await verifyPaymentOnChain(payment);
      if (outcome === 'confirmed' || outcome === 'failed') {
        const fresh = await prisma.payment.findUnique({ where: { id: payment.id } });
        if (fresh) {
          payment.status = fresh.status;
          payment.txHash = fresh.txHash;
          payment.completedAt = fresh.completedAt;
        }
      }
    }

    return {
      id: payment.id,
      paymentCode: payment.paymentCode,
      amount: payment.amount.toString(),
      currency: payment.currency,
      description: payment.description,
      status: payment.status,
      receivingAddress: payment.receivingAddress,
      txHash: payment.txHash,
      completedAt: payment.completedAt,
      merchantName: payment.merchant.businessName,
      checkoutUrl: getPaymentCheckoutUrl(payment.paymentCode),
      expiresAt: payment.expiresAt,
      createdAt: payment.createdAt,
    };
  }

  static async createPayment(merchant: MerchantContext, input: CreatePaymentInput) {
    const paymentCode = `pay_${crypto.randomBytes(12).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    if (!merchant.walletAddress) {
      throw createError(
        'Set your receiving wallet address in Settings before creating payments.',
        400,
        'WALLET_NOT_SET',
      );
    }
    const receivingAddress = merchant.walletAddress;

    const payment = await prisma.payment.create({
      data: {
        merchantId: merchant.id,
        paymentCode,
        amount: input.amount,
        currency: input.currency,
        receivingAddress,
        expiresAt,
        status: 'CREATED',
        ...(input.description ? { description: input.description } : {}),
      },
    });

    return {
      id: payment.id,
      paymentCode: payment.paymentCode,
      amount: payment.amount.toString(),
      currency: payment.currency,
      description: payment.description,
      status: payment.status,
      receivingAddress: payment.receivingAddress,
      checkoutUrl: getPaymentCheckoutUrl(payment.paymentCode),
      expiresAt: payment.expiresAt,
      createdAt: payment.createdAt,
    };
  }

  /**
   * Public: a payer reports the on-chain tx hash for a checkout session.
   * Moves the payment to PROCESSING; confirmation happens via on-chain verification.
   */
  static async submitTransaction(code: string, input: SubmitTransactionInput) {
    const payment = await prisma.payment.findUnique({ where: { paymentCode: code } });
    if (!payment) {
      throw createError('Payment code not found', 404, 'NOT_FOUND');
    }
    if (payment.status === 'COMPLETED') {
      throw createError('This payment has already been completed.', 409, 'ALREADY_COMPLETED');
    }
    if (payment.status === 'EXPIRED' || payment.status === 'CANCELLED' || payment.status === 'FAILED') {
      throw createError(`This payment is ${payment.status.toLowerCase()} and can no longer accept a transaction.`, 409, 'PAYMENT_CLOSED');
    }
    if (payment.status === 'PROCESSING' && payment.txHash && payment.txHash !== input.txHash) {
      throw createError('A different transaction is already being verified for this payment.', 409, 'TX_ALREADY_SUBMITTED');
    }
    if (payment.expiresAt < new Date()) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'EXPIRED' } });
      throw createError('This payment session has expired.', 410, 'PAYMENT_EXPIRED');
    }

    const updated = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PROCESSING',
        txHash: input.txHash,
        ...(input.payerAddress
          ? { metadata: { ...((payment.metadata as object) ?? {}), payerAddress: input.payerAddress.toLowerCase() } }
          : {}),
      },
    });

    // Kick off verification immediately; the checkout page keeps polling until final.
    verifyPaymentOnChain(updated).catch((err) =>
      logger.warn({ err, paymentId: updated.id }, 'Initial verification attempt failed'),
    );

    return {
      id: updated.id,
      paymentCode: updated.paymentCode,
      status: updated.status,
      txHash: updated.txHash,
      checkoutUrl: getPaymentCheckoutUrl(updated.paymentCode),
    };
  }

  static async listPayments(merchantId: string, page: number = 1, limit: number = 20, status?: string) {
    const skip = (page - 1) * limit;

    const where = {
      merchantId,
      ...(status ? { status: status as PaymentStatus } : {}),
    };

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      payments: payments.map((p) => ({
        id: p.id,
        paymentCode: p.paymentCode,
        amount: p.amount.toString(),
        currency: p.currency,
        description: p.description,
        status: p.status,
        receivingAddress: p.receivingAddress,
        txHash: p.txHash,
        checkoutUrl: getPaymentCheckoutUrl(p.paymentCode),
        expiresAt: p.expiresAt,
        completedAt: p.completedAt,
        createdAt: p.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getPayment(merchantId: string, id: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        merchantId,
        OR: [{ id }, { paymentCode: id }],
      },
    });

    if (!payment) {
      throw createError('Payment not found', 404, 'NOT_FOUND');
    }

    return {
      id: payment.id,
      paymentCode: payment.paymentCode,
      amount: payment.amount.toString(),
      currency: payment.currency,
      description: payment.description,
      status: payment.status,
      receivingAddress: payment.receivingAddress,
      txHash: payment.txHash,
      checkoutUrl: getPaymentCheckoutUrl(payment.paymentCode),
      expiresAt: payment.expiresAt,
      completedAt: payment.completedAt,
      createdAt: payment.createdAt,
    };
  }

  static async simulatePayment(merchantId: string, id: string, input: SimulatePaymentInput) {
    const payment = await prisma.payment.findFirst({
      where: {
        merchantId,
        OR: [{ id }, { paymentCode: id }],
      },
    });

    if (!payment) {
      throw createError('Payment not found', 404, 'NOT_FOUND');
    }

    const txHash = input.txHash || `0x${crypto.randomBytes(32).toString('hex')}`;
    const completedAt = input.status === 'COMPLETED' ? new Date() : null;

    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: input.status,
        txHash,
        completedAt,
      },
    });

    // Trigger webhooks for payment status change
    const webhooks = await prisma.webhook.findMany({
      where: {
        merchantId,
        isActive: true,
      },
    });

    const eventName = `payment.${input.status.toLowerCase()}`;

    for (const webhook of webhooks) {
      if (webhook.events.includes(eventName) || webhook.events.includes('payment.*')) {
        const payload = {
          event: eventName,
          payment: {
            id: updatedPayment.id,
            paymentCode: updatedPayment.paymentCode,
            amount: updatedPayment.amount.toString(),
            currency: updatedPayment.currency,
            status: updatedPayment.status,
            txHash: updatedPayment.txHash,
            completedAt: updatedPayment.completedAt,
          },
        };

        await prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            paymentId: updatedPayment.id,
            event: eventName,
            payload,
            status: 'PENDING',
            attempt: 1,
          },
        });
      }
    }

    return {
      id: updatedPayment.id,
      paymentCode: updatedPayment.paymentCode,
      amount: updatedPayment.amount.toString(),
      currency: updatedPayment.currency,
      status: updatedPayment.status,
      txHash: updatedPayment.txHash,
      completedAt: updatedPayment.completedAt,
    };
  }
}
