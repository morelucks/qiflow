import crypto from 'crypto';
import type { PaymentStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import type { CreatePaymentInput, SimulatePaymentInput } from '../schemas/payments.schema.js';
import type { MerchantContext } from '../types/index.js';
import { createError } from '../middleware/errorHandler.js';

export type { MerchantContext };

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

    return {
      id: payment.id,
      paymentCode: payment.paymentCode,
      amount: payment.amount.toString(),
      currency: payment.currency,
      description: payment.description,
      status: payment.status,
      receivingAddress: payment.receivingAddress,
      txHash: payment.txHash,
      merchantName: payment.merchant.businessName,
      expiresAt: payment.expiresAt,
      createdAt: payment.createdAt,
    };
  }

  static async createPayment(merchant: MerchantContext, input: CreatePaymentInput) {
    const paymentCode = `pay_${crypto.randomBytes(12).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity

    const receivingAddress = merchant.walletAddress || '0x0000000000000000000000000000000000000000';

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
      expiresAt: payment.expiresAt,
      createdAt: payment.createdAt,
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
