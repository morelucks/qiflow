/**
 * Quai Network address helpers.
 *
 * Both ledgers use 20-byte hex addresses; the ledger is encoded in the address itself:
 * the most-significant bit of the SECOND byte is 1 for Qi (UTXO) addresses and 0 for
 * Quai (account) addresses. Mirrors `isQiAddress` in quais.js.
 */
export type Ledger = 'QI' | 'QUAI';

export const QUAI_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export function isValidQuaiNetworkAddress(address: string): boolean {
  return QUAI_ADDRESS_REGEX.test(address);
}

export function isQiAddress(address: string): boolean {
  if (!isValidQuaiNetworkAddress(address)) return false;
  const secondByte = parseInt(address.substring(4, 6), 16);
  return (secondByte & 0x80) === 0x80;
}

export function isQuaiAddress(address: string): boolean {
  return isValidQuaiNetworkAddress(address) && !isQiAddress(address);
}

/** Which currency an address can receive. */
export function addressLedger(address: string): Ledger | null {
  if (!isValidQuaiNetworkAddress(address)) return null;
  return isQiAddress(address) ? 'QI' : 'QUAI';
}
