/**
 * KeyRegistry contract operations: get/set X25519 public key per address.
 */

import type { Contract } from 'ethers';
import { getKeyPair, pkToBytes32, bytes32ToPk } from '../utils/helpers';
import type { KeypairLoader } from './keypairStorage';

export const ZERO_BYTES32 = '0x' + '0'.repeat(64);

/** Get public key for address from contract. Returns null if not set or zero. */
export async function getPublicKey(
  keyRegistry: Contract,
  address: string
): Promise<Uint8Array | null> {
  const hex = await keyRegistry.pk(address);
  if (!hex || hex === ZERO_BYTES32) return null;
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (h.length !== 64) return null;
  return bytes32ToPk(hex);
}

/** Get public key as bytes32 hex (with 0x). Returns ZERO_BYTES32 if not set. */
export async function getPublicKeyHex(
  keyRegistry: Contract,
  address: string
): Promise<string> {
  const hex = await keyRegistry.pk(address);
  return hex ?? ZERO_BYTES32;
}

/** Set public key on contract if current is zero or different. Returns true if tx was sent. */
export async function setPublicKeyIfNeeded(
  keyRegistry: Contract,
  address: string,
  pk: Uint8Array
): Promise<boolean> {
  const pkHex = '0x' + pkToBytes32(pk);
  const current = await keyRegistry.pk(address);
  if (current && current.toLowerCase() === pkHex.toLowerCase()) return false;
  const tx = await keyRegistry.setPubKey(pkHex);
  await tx.wait();
  return true;
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
