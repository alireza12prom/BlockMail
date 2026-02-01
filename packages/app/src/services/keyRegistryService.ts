/**
 * KeyRegistry contract operations: get/set X25519 public key per address.
 */

import { ethers } from 'ethers';
import type { Contract } from 'ethers';
import { getKeyPair, pkToBytes32, bytes32ToPk } from '../utils/helpers';
import type { KeypairLoader } from './keypairStorage';

export const ZERO_BYTES32 = '0x' + '0'.repeat(64);

/** Get public key for address from contract. Returns null if not set, zero, or on decode error. */
export async function getPublicKey(
  keyRegistry: Contract,
  address: string
): Promise<Uint8Array | null> {
  try {
    const hex = await keyRegistry.pk(address);
    if (!hex || hex === ZERO_BYTES32) return null;
    const h = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (h.length !== 64) return null;
    return bytes32ToPk(hex);
  } catch (e) {
    // e.g. "could not decode result data" when contract at address is not KeyRegistry
    console.warn('KeyRegistry getPublicKey failed:', e);
    return null;
  }
}

/** Get public key as bytes32 hex (with 0x). Returns ZERO_BYTES32 if not set or on error. */
export async function getPublicKeyHex(
  keyRegistry: Contract,
  address: string
): Promise<string> {
  try {
    const hex = await keyRegistry.pk(address);
    return hex ?? ZERO_BYTES32;
  } catch (e) {
    console.warn('KeyRegistry getPublicKeyHex failed:', e);
    return ZERO_BYTES32;
  }
}

/** Format 32-byte key as bytes32 for contract (0x + 64 hex chars, 32 bytes). */
function formatBytes32(pk: Uint8Array): string {
  const hex = pkToBytes32(pk).toLowerCase();
  return ethers.zeroPadValue('0x' + hex, 32);
}

/**
 * Check if an error is "empty/invalid result" (no contract or wrong contract at address).
 * e.g. value="0x", code=BAD_DATA when RPC returns empty bytes.
 */
function isBadDataError(e: unknown): boolean {
  if (e instanceof Error) {
    const msg = e.message.toLowerCase();
    if (msg.includes('could not decode') || msg.includes('bad_data')) return true;
    if (msg.includes('value="0x"')) return true;
  }
  if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'BAD_DATA') return true;
  return false;
}

/** Set public key on contract if current is zero or different. Returns true if tx was sent. */
export async function setPublicKeyIfNeeded(
  keyRegistry: Contract,
  address: string,
  pk: Uint8Array
): Promise<boolean> {
  const pkHex = formatBytes32(pk);
  let current = ZERO_BYTES32;
  try {
    current = await keyRegistry.pk(address);
  } catch (e) {
    // Empty result (0x) = no contract at address or wrong contract; treat as "no key set" and try setPubKey
    if (isBadDataError(e)) {
      console.warn('KeyRegistry pk(address) returned no data (no contract or wrong address?) - will try setPubKey.', e);
    } else {
      throw e;
    }
  }
  if (current && current.toLowerCase() === pkHex.toLowerCase()) return false;
  try {
    const tx = await keyRegistry.setPubKey(pkHex);
    await tx.wait();
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isBadDataError(e) || msg.includes('could not decode') || msg.includes('decode result')) {
      throw new Error(
        'KeyRegistry not found at this address. Deploy KeyRegistry (see packages/contracts), then set VITE_KEY_REGISTRY_ADDRESS in .env to the "KeyRegistry deployed to: 0x..." address.'
      );
    }
    throw e;
  }
}

/** Ensure address has its X25519 public key registered. Uses keypair from storage. */
export async function registerPublicKey(
  keyRegistry: Contract,
  address: string,
  keypairLoader: KeypairLoader
): Promise<boolean> {
  const { pk } = await getKeyPair(keypairLoader.load, keypairLoader.save);
  return setPublicKeyIfNeeded(keyRegistry, address, pk);
}
