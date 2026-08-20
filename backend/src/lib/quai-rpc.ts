import { env } from '../config/env.js';

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

export interface RpcTransaction {
  hash: string;
  blockNumber: string | null;
  from?: string;
  to?: string | null;
  value?: string;
  // Qi (UTXO) transactions expose outputs instead of a single `to`
  txOuts?: Array<{ address?: string; denomination?: string }>;
  outputs?: Array<{ address?: string; denomination?: string }>;
  type?: string;
}

export interface RpcReceipt {
  status?: string;
  blockNumber?: string;
  transactionHash?: string;
}

/** Minimal JSON-RPC client for a Quai node (quai_* namespace mirrors eth_*). */
export async function quaiRpc<T>(method: string, params: unknown[] = []): Promise<T | null> {
  const res = await fetch(env.QUAI_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`RPC ${method} failed with HTTP ${res.status}`);
  }
  const json = (await res.json()) as JsonRpcResponse<T>;
  if (json.error) {
    throw new Error(`RPC ${method} error ${json.error.code}: ${json.error.message}`);
  }
  return json.result ?? null;
}

export const getTransaction = (hash: string) =>
  quaiRpc<RpcTransaction>('quai_getTransactionByHash', [hash]);
export const getTransactionReceipt = (hash: string) =>
  quaiRpc<RpcReceipt>('quai_getTransactionReceipt', [hash]);
export const getBlockNumber = async () => {
  const hex = await quaiRpc<string>('quai_blockNumber');
  return hex ? Number(BigInt(hex)) : null;
};
