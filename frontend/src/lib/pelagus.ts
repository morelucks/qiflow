/**
 * Pelagus (Quai Network wallet) provider helpers.
 *
 * Pelagus injects `window.pelagus` (EIP-1193 style). Its dApp provider API only exposes
 * the Quai-ledger methods (`quai_requestAccounts`, `quai_accounts`, `quai_sendTransaction`,
 * `personal_sign`, `wallet_*`) — there is NO `qi_*` API, so Qi (UTXO) payments cannot be
 * initiated from a web page. Qi payers send from the Pelagus Qi account UI and confirm with
 * the tx hash; only QUAI payments can be triggered here.
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

/** Turn an EIP-1193 provider rejection (often a plain object) into a readable Error. */
export function toWalletError(err: unknown): Error {
  if (err instanceof Error) return err;
  const e = (err ?? {}) as { code?: number; message?: string };
  switch (e.code) {
    case 4001:
      return new Error('Request rejected in Pelagus.');
    case 4100:
      return new Error('Pelagus has not authorized this site/account. Open Pelagus, connect this site, and try again.');
    case 4200:
      return new Error('Pelagus does not support this request method.');
    case 4900:
    case 4901:
      return new Error('Pelagus is disconnected from the network. Check the wallet and try again.');
    default:
      return new Error(e.message || 'Wallet request failed.');
  }
}

export interface PayWithPelagusArgs {
  to: string;
  amount: string; // decimal string
}

/**
 * Connect Pelagus and send a QUAI payment. Resolves with the tx hash and payer address.
 * Throws an Error with a user-readable message on rejection / failure.
 */
export async function payQuaiWithPelagus({ to, amount }: PayWithPelagusArgs): Promise<{ txHash: string; from: string }> {
  const pelagus = getPelagus();
  if (!pelagus) {
    throw new Error('Pelagus wallet not detected. Install it from pelaguswallet.io, or pay from another wallet and paste your transaction hash below.');
  }

  let from: string | undefined;
  try {
    const accounts = (await pelagus.request({ method: 'quai_requestAccounts' })) as string[];
    from = accounts?.[0];
  } catch (err) {
    throw toWalletError(err);
  }
  if (!from) throw new Error('No Pelagus account selected.');

  let txHash: unknown;
  try {
    txHash = await pelagus.request({
      method: 'quai_sendTransaction',
      params: [{ from, to, value: toHexWei(amount) }],
    });
  } catch (err) {
    throw toWalletError(err);
  }

  if (typeof txHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new Error('Pelagus did not return a transaction hash.');
  }
  return { txHash, from };
}
