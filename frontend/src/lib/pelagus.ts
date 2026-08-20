/**
 * Minimal Pelagus (Quai Network wallet) provider helpers.
 * Pelagus injects `window.pelagus` (EIP-1193 style). Quai (account) transfers use the
 * `quai_*` methods; Qi (UTXO) transfers use the `qi_*` methods.
 */
export interface PelagusProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  isPelagus?: boolean;
}

declare global {
  interface Window {
    pelagus?: PelagusProvider;
  }
}

export function getPelagus(): PelagusProvider | null {
  if (typeof window === 'undefined') return null;
  return window.pelagus ?? null;
}

const WEI = BigInt(10) ** BigInt(18);

/** Decimal string (up to 18 dp) -> hex wei string. */
export function toHexWei(amount: string): string {
  const [whole, frac = ''] = amount.split('.');
  const fracPadded = (frac + '0'.repeat(18)).slice(0, 18);
  const wei = BigInt(whole || '0') * WEI + BigInt(fracPadded || '0');
  return `0x${wei.toString(16)}`;
}

export interface PayWithPelagusArgs {
  to: string;
  amount: string; // decimal string
  currency: 'QI' | 'QUAI' | string;
}

/**
 * Connect Pelagus and send the payment. Resolves with the tx hash and payer address.
 * Throws an Error with a user-readable message on rejection / failure.
 */
export async function payWithPelagus({ to, amount, currency }: PayWithPelagusArgs): Promise<{ txHash: string; from: string }> {
  const pelagus = getPelagus();
  if (!pelagus) {
    throw new Error('Pelagus wallet not detected. Install it from pelaguswallet.io, or pay manually and paste your transaction hash below.');
  }

  const isQi = currency.toUpperCase() === 'QI';
  const accountsMethod = isQi ? 'qi_requestAccounts' : 'quai_requestAccounts';
  const sendMethod = isQi ? 'qi_sendTransaction' : 'quai_sendTransaction';

  const accounts = (await pelagus.request({ method: accountsMethod })) as string[];
  const from = accounts?.[0];
  if (!from) throw new Error('No wallet account selected.');

  const txHash = (await pelagus.request({
    method: sendMethod,
    params: [{ from, to, value: toHexWei(amount) }],
  })) as string;

  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new Error('Wallet did not return a transaction hash.');
  }
  return { txHash, from };
}
