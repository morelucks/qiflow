import type { Payment } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { enqueueWebhookEvent } from '../lib/webhook-queue.js';
import { getTransaction, getTransactionReceipt, getBlockNumber } from '../lib/quai-rpc.js';

export type VerificationOutcome = 'pending' | 'confirmed' | 'failed' | 'error';

const WEI_PER_TOKEN = 10n ** 18n;

function toBaseUnits(amount: string): bigint {
  // Decimal(18,8) string -> integer wei (18 decimals)
  const [whole, frac = ''] = amount.split('.');
  const fracPadded = (frac + '0'.repeat(18)).slice(0, 18);
  return BigInt(whole || '0') * WEI_PER_TOKEN + BigInt(fracPadded || '0');
}

function outputsOf(tx: { txOuts?: unknown; outputs?: unknown }): Array<{ address?: string }> {
  const outs = (tx.txOuts ?? tx.outputs) as Array<{ address?: string }> | undefined;
  return Array.isArray(outs) ? outs : [];
}

/** Build the webhook payload shared by every status transition. */
export function paymentEventPayload(event: string, p: Payment) {
  return {
    event,
    payment: {
      id: p.id,
      paymentCode: p.paymentCode,
      amount: p.amount.toString(),
      currency: p.currency,
      status: p.status,
      txHash: p.txHash,
      receivingAddress: p.receivingAddress,
      completedAt: p.completedAt,
    },
  };
}

async function transition(payment: Payment, status: 'COMPLETED' | 'FAILED', txHash: string) {
  const updated = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status,
      txHash,
      completedAt: status === 'COMPLETED' ? new Date() : null,
    },
  });
  const event = `payment.${status.toLowerCase()}`;
  try {
    await enqueueWebhookEvent(updated.merchantId, updated.id, event, paymentEventPayload(event, updated));
  } catch (err) {
    logger.error({ err, paymentId: updated.id }, 'Failed to enqueue payment webhook');
  }
  return updated;
}

/**
 * Check a PROCESSING payment's tx on-chain and finalize it when confirmed.
 * Safe to call repeatedly (idempotent); RPC errors leave the payment untouched.
 */
export async function verifyPaymentOnChain(payment: Payment): Promise<VerificationOutcome> {
  if (payment.status !== 'PROCESSING' || !payment.txHash) return 'pending';

  try {
    const tx = await getTransaction(payment.txHash);
    if (!tx || !tx.blockNumber) return 'pending'; // not yet mined (or not yet propagated)

    const receipt = await getTransactionReceipt(payment.txHash);
    if (!receipt) return 'pending';
    if (receipt.status !== undefined && BigInt(receipt.status) !== 1n) {
      await transition(payment, 'FAILED', payment.txHash);
      return 'failed';
    }

    // Destination + amount checks (Quai account tx exposes `to`/`value`; Qi UTXO tx exposes outputs)
    const want = payment.receivingAddress.toLowerCase();
    if (tx.to) {
      if (tx.to.toLowerCase() !== want) {
        logger.warn({ paymentId: payment.id, to: tx.to, want }, 'Submitted tx pays a different address');
        await transition(payment, 'FAILED', payment.txHash);
        return 'failed';
      }
      if (payment.currency === 'QUAI' && tx.value !== undefined) {
        if (BigInt(tx.value) < toBaseUnits(payment.amount.toString())) {
          logger.warn({ paymentId: payment.id, value: tx.value }, 'Submitted tx underpays');
          await transition(payment, 'FAILED', payment.txHash);
          return 'failed';
        }
      }
    } else {
      const outs = outputsOf(tx);
      if (outs.length > 0 && !outs.some((o) => o.address?.toLowerCase() === want)) {
        logger.warn({ paymentId: payment.id }, 'Submitted Qi tx has no output to the receiving address');
        await transition(payment, 'FAILED', payment.txHash);
        return 'failed';
      }
    }

    // Confirmations
    if (env.CONFIRMATION_THRESHOLD > 1) {
      const head = await getBlockNumber();
      const mined = Number(BigInt(tx.blockNumber));
      if (head !== null && head - mined + 1 < env.CONFIRMATION_THRESHOLD) return 'pending';
    }

    await transition(payment, 'COMPLETED', payment.txHash);
    return 'confirmed';
  } catch (err) {
    logger.warn({ err, paymentId: payment.id }, 'On-chain verification unavailable; will retry');
    return 'error';
  }
}
