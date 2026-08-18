import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import type { CreatePaymentLinkInput, UpdatePaymentLinkInput } from '../schemas/payment-links.schema.js';
import { createError } from '../middleware/errorHandler.js';

function generateLinkCode(): string {
  return `pl_${crypto.randomBytes(4).toString('hex')}`;
}

function generatePaymentCode(): string {
  return `pay_${crypto.randomBytes(4).toString('hex')}`;
}

function getCheckoutUrl(linkCode: string): string {
  const baseUrl = process.env.CHECKOUT_BASE_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/pay/link/${linkCode}`;
}

export class PaymentLinksService {
  static async getPublicLink(linkCode: string) {
    const link = await prisma.paymentLink.findUnique({
      where: { linkCode },
      select: {
        id: true,
        linkCode: true,
        name: true,
        amount: true,
        currency: true,
        description: true,
        fixedAmount: true,
        isActive: true,
        merchant: {
          select: {
            id: true,
            businessName: true,
            walletAddress: true,
          },
        },
        _count: {
          select: { payments: true },
        },
      },
    });

    if (!link || !link.isActive) {
      throw createError('This payment link is no longer active or does not exist.', 404, 'LINK_INACTIVE');
    }

    return {
      id: link.id,
      linkCode: link.linkCode,
      name: link.name,
      amount: link.amount ? link.amount.toString() : null,
      currency: link.currency,
      description: link.description,
      fixedAmount: link.fixedAmount,
      isActive: link.isActive,
      merchantName: link.merchant.businessName,
      receivingAddress: link.merchant.walletAddress || '0x0000000000000000000000000000000000000000',
      uses: link._count.payments,
    };
  }

  static async checkoutFromLink(linkCode: string, customAmount?: number) {
    const link = await prisma.paymentLink.findUnique({
      where: { linkCode },
      select: {
        id: true,
        merchantId: true,
        name: true,
        amount: true,
        currency: true,
        description: true,
        fixedAmount: true,
        isActive: true,
        merchant: {
          select: {
            id: true,
            businessName: true,
            walletAddress: true,
          },
        },
      },
    });

    if (!link || !link.isActive) {
      throw createError('This payment link is no longer active or does not exist.', 400, 'LINK_INACTIVE');
    }

    let finalAmount = link.amount ? link.amount.toString() : '5.00';
    if (!link.fixedAmount && customAmount) {
      finalAmount = String(customAmount);
    }

    const paymentCode = generatePaymentCode();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const receivingAddress = link.merchant.walletAddress || '0x0000000000000000000000000000000000000000';

    const payment = await prisma.payment.create({
      data: {
        merchantId: link.merchantId,
        paymentLinkId: link.id,
        paymentCode,
        amount: finalAmount,
        currency: link.currency || 'QI',
        description: link.description || link.name,
        receivingAddress,
        status: 'CREATED',
        expiresAt,
      },
    });

    return {
      paymentCode: payment.paymentCode,
      paymentId: payment.id,
      redirectUrl: `/pay/${payment.paymentCode}`,
    };
  }

  static async listPaymentLinks(merchantId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [links, total] = await Promise.all([
      prisma.paymentLink.findMany({
        where: { merchantId },
        select: {
          id: true,
          merchantId: true,
          linkCode: true,
          name: true,
          amount: true,
          currency: true,
          description: true,
          fixedAmount: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { payments: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.paymentLink.count({ where: { merchantId } }),
    ]);

    const formattedLinks = links.map((link) => ({
      id: link.id,
      merchantId: link.merchantId,
      linkCode: link.linkCode,
      name: link.name,
      amount: link.amount ? link.amount.toString() : null,
      currency: link.currency,
      description: link.description,
      fixedAmount: link.fixedAmount,
      isActive: link.isActive,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      uses: link._count.payments,
      url: getCheckoutUrl(link.linkCode),
    }));

    return {
      links: formattedLinks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async createPaymentLink(merchantId: string, input: CreatePaymentLinkInput) {
    const linkCode = generateLinkCode();

    const link = await prisma.paymentLink.create({
      data: {
        merchantId,
        linkCode,
        name: input.name,
        amount: input.amount ? input.amount : null,
        currency: input.currency || 'QI',
        description: input.description || null,
        fixedAmount: input.fixedAmount ?? true,
        isActive: input.isActive ?? true,
      },
      select: {
        id: true,
        merchantId: true,
        linkCode: true,
        name: true,
        amount: true,
        currency: true,
        description: true,
        fixedAmount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { payments: true },
        },
      },
    });

    return {
      id: link.id,
      merchantId: link.merchantId,
      linkCode: link.linkCode,
      name: link.name,
      amount: link.amount ? link.amount.toString() : null,
      currency: link.currency,
      description: link.description,
      fixedAmount: link.fixedAmount,
      isActive: link.isActive,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      uses: link._count.payments,
      url: getCheckoutUrl(link.linkCode),
    };
  }

  static async getPaymentLink(merchantId: string, id: string) {
    const link = await prisma.paymentLink.findFirst({
      where: { id, merchantId },
      select: {
        id: true,
        merchantId: true,
        linkCode: true,
        name: true,
        amount: true,
        currency: true,
        description: true,
        fixedAmount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { payments: true },
        },
      },
    });

    if (!link) {
      throw createError('Payment link not found', 404, 'NOT_FOUND');
    }

    return {
      id: link.id,
      merchantId: link.merchantId,
      linkCode: link.linkCode,
      name: link.name,
      amount: link.amount ? link.amount.toString() : null,
      currency: link.currency,
      description: link.description,
      fixedAmount: link.fixedAmount,
      isActive: link.isActive,
      createdAt: link.createdAt,
      updatedAt: link.updatedAt,
      uses: link._count.payments,
      url: getCheckoutUrl(link.linkCode),
    };
  }

  static async updatePaymentLink(merchantId: string, id: string, input: UpdatePaymentLinkInput) {
    const existing = await prisma.paymentLink.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      throw createError('Payment link not found', 404, 'NOT_FOUND');
    }

    const updated = await prisma.paymentLink.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.amount !== undefined && { amount: input.amount ? input.amount : null }),
        ...(input.currency !== undefined && { currency: input.currency }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.fixedAmount !== undefined && { fixedAmount: input.fixedAmount }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      select: {
        id: true,
        merchantId: true,
        linkCode: true,
        name: true,
        amount: true,
        currency: true,
        description: true,
        fixedAmount: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { payments: true },
        },
      },
    });

    return {
      id: updated.id,
      merchantId: updated.merchantId,
      linkCode: updated.linkCode,
      name: updated.name,
      amount: updated.amount ? updated.amount.toString() : null,
      currency: updated.currency,
      description: updated.description,
      fixedAmount: updated.fixedAmount,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      uses: updated._count.payments,
      url: getCheckoutUrl(updated.linkCode),
    };
  }

  static async deletePaymentLink(merchantId: string, id: string) {
    const existing = await prisma.paymentLink.findFirst({
      where: { id, merchantId },
    });

    if (!existing) {
      throw createError('Payment link not found', 404, 'NOT_FOUND');
    }

    const deactivated = await prisma.paymentLink.update({
      where: { id },
      data: { isActive: false },
    });

    return {
      id: deactivated.id,
      isActive: deactivated.isActive,
      message: 'Payment link deactivated successfully',
    };
  }
}
