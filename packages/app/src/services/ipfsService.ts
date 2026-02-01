/**
 * IPFS / Pinata: upload encrypted payloads and fetch by CID.
 */

import { PinataSDK } from 'pinata';
import { PINATA_JWT, PINATA_GATEWAY } from '../config/constants';

let client: PinataSDK | null = null;

function getClient(): PinataSDK {
  if (!client) {
    client = new PinataSDK({
      pinataJwt: PINATA_JWT,
      pinataGateway: PINATA_GATEWAY,
    });
  }
  return client;
}

export interface EncryptedPayload {
  from: string;
  to: string;
  nonce: string;
  ciphertext: string;
}

/** Upload encrypted email payload to IPFS. Returns CID. */
export async function uploadEncrypted(payload: EncryptedPayload): Promise<string> {
  const result = await getClient().upload.public.json({
    from: payload.from,
    to: payload.to,
    nonce: payload.nonce,
    ciphertext: payload.ciphertext,
  });
  return result.cid;
}

export interface FetchedPayload {
  from?: string;
  to?: string;
  subject?: string;
  body?: string;
  timestamp?: number;
  nonce?: string;
  ciphertext?: string;
}

/** Fetch content by CID from Pinata gateway. */
export async function getByCid(cid: string): Promise<FetchedPayload> {
  const { data } = await getClient().gateways.public.get(cid);
  return (data ?? {}) as FetchedPayload;
}
