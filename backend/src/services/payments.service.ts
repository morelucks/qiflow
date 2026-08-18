import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import type { CreatePaymentInput, SimulatePaymentInput } from '../schemas/payments.schema.js';

export interface MerchantContext {
  id: string;
  email: string;
  businessName?: string;
  walletAddress?: string | null;
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
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Payment code not found' };
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
        ...(input.paymentLinkId ? { paymentLinkId: input.paymentLinkId } : {}),
        ...(input.metadata ? { metadata: JSON.parse(JSON.stringify(input.metadata)) } : {}),
      },
    });

    const baseUrl = process.env.CHECKOUT_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';

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
      checkoutUrl: `${baseUrl}/pay/${payment.paymentCode}`,
    };
  }

  static async listPayments(merchantId: string, page: number, limit: number, status?: string) {
    const where: Record<string, unknown> = { merchantId };
    if (status) {
      where.status = status.toUpperCase();
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
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
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Payment not found' };
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
      throw { statusCode: 404, code: 'NOT_FOUND', message: 'Payment not found' };
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

    // Trigger webhook dispatches
    const webhooks = await prisma.webhook.findMany({
      where: { merchantId, isActive: true },
    });

    const eventName = input.status === 'COMPLETED' ? 'payment.completed' : 'payment.failed';
    for (const hook of webhooks) {
      if (hook.events.includes(eventName) || hook.events.includes('*')) {
        prisma.webhookDelivery
          .create({
            data: {
              webhookId: hook.id,
              paymentId: updatedPayment.id,
              event: eventName,
              payload: {
                event: eventName,
                paymentCode: updatedPayment.paymentCode,
                amount: updatedPayment.amount.toString(),
                currency: updatedPayment.currency,
                status: updatedPayment.status,
                txHash: updatedPayment.txHash,
                timestamp: new Date().toISOString(),
              },
              status: 'DELIVERED',
              statusCode: 200,
              responseBody: JSON.stringify({ received: true }),
              deliveredAt: new Date(),
            },
          })
          .catch(() => {});
      }
    }

    return {
      id: updatedPayment.id,
      paymentCode: updatedPayment.paymentCode,
      status: updatedPayment.status,
      txHash: updatedPayment.txHash,
      completedAt: updatedPayment.completedAt,
    };
  }
}
