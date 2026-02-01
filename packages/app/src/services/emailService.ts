/**
 * High-level email operations: send (encrypt + upload + on-chain), load list, fetch by CID.
 */

import type { Contract } from 'ethers';
import { Email } from '../types';
import { getKeyPair, encryptEmailPayload, decryptEmailPayload, bytes32ToPk } from '../utils/helpers';
import { createKeypairLoader } from './keypairStorage';
import {
  getPublicKey,
  getPublicKeyHex,
  setPublicKeyIfNeeded,
  ZERO_BYTES32,
} from './keyRegistryService';
import { uploadEncrypted, getByCid } from './ipfsService';

export interface SendEmailParams {
  from: string;
  to: string;
  subject: string;
  body: string;
  contract: Contract;
  keyRegistry: Contract;
}

/** Encrypt payload, ensure sender pk registered, upload to IPFS, send message on-chain. Returns sent email. */
export async function sendEmail(params: SendEmailParams): Promise<Email> {
  const { from, to, subject, body, contract, keyRegistry } = params;

  const loader = createKeypairLoader(from);
  const { pk: senderPk, sk: senderSk } = await getKeyPair(loader.load, loader.save);

  const recipientPk = await getPublicKey(keyRegistry, to);
  if (!recipientPk) {
    throw new Error('Recipient has not registered a public key');
  }

  const payload = JSON.stringify({
    from,
    to,
    subject,
    body,
    timestamp: Date.now(),
  });
  const { nonce, ciphertext } = await encryptEmailPayload(payload, recipientPk, senderSk);

  await setPublicKeyIfNeeded(keyRegistry, from, senderPk);

  const cid = await uploadEncrypted({
    from,
    to,
    nonce,
    ciphertext,
  });

  const tx = await contract.sendMessage(to, cid);
  await tx.wait();

  const sentEmail: Email = {
    id: cid,
    cid,
    from,
    to,
    subject,
    body,
    timestamp: new Date(),
    read: true,
    direction: 'sent',
  };
  return sentEmail;
}

export interface LoadEmailsParams {
  userAddress: string;
  contract: Contract;
  keyRegistry: Contract | null;
}

/** Load all emails (sent + received) for user from contract events and IPFS. */
export async function loadEmails(params: LoadEmailsParams): Promise<Email[]> {
  const { userAddress, contract, keyRegistry } = params;

  const filterToMe = contract.filters.Message(null, userAddress);
  const filterFromMe = contract.filters.Message(userAddress, null);

  const [eventsTo, eventsFrom] = await Promise.all([
    contract.queryFilter(filterToMe),
    contract.queryFilter(filterFromMe),
  ]);

  const received = await Promise.all(
    eventsTo.map(async (ev: { args: { cid: string; timestamp?: bigint } }) => {
      const email = await fetchEmailByCid({
        cid: ev.args.cid,
        direction: 'received',
        userAddress,
        keyRegistry,
        eventTimestamp: ev.args.timestamp,
      });
      email.direction = 'received';
      return email;
    })
  );

  const sent = await Promise.all(
    eventsFrom.map(async (ev: { args: { cid: string; timestamp?: bigint } }) => {
      const email = await fetchEmailByCid({
        cid: ev.args.cid,
        direction: 'sent',
        userAddress,
        keyRegistry,
        eventTimestamp: ev.args.timestamp,
      });
      email.direction = 'sent';
      return email;
    })
  );

  const all = [...received, ...sent];
  const unique = all.filter(
    (email, index, self) => index === self.findIndex((e) => e.cid === email.cid)
  );
  unique.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return unique;
}

export interface FetchEmailByCidParams {
  cid: string;
  direction: 'sent' | 'received';
  userAddress: string;
  keyRegistry: Contract | null;
  eventTimestamp?: bigint;
}

/** Fetch one email by CID; decrypt if encrypted and user is recipient. */
export async function fetchEmailByCid(params: FetchEmailByCidParams): Promise<Email> {
  const { cid, direction, userAddress, keyRegistry, eventTimestamp } = params;

  const data = await getByCid(cid);
  const from = (data.from ?? '') as string;
  const to = (data.to ?? '') as string;

  if (data.ciphertext != null && data.nonce != null) {
    if (direction === 'received' && keyRegistry) {
      try {
        const loader = createKeypairLoader(userAddress);
        const { sk: recipientSk } = await getKeyPair(loader.load, loader.save);
        const senderPkHex = await getPublicKeyHex(keyRegistry, from);
        if (senderPkHex !== ZERO_BYTES32) {
          const senderPk = bytes32ToPk(senderPkHex);
          const plain = await decryptEmailPayload(
            data.ciphertext,
            data.nonce,
            senderPk,
            recipientSk
          );
          const parsed = JSON.parse(plain) as {
            subject: string;
            body: string;
            timestamp?: number;
          };
          return {
            id: cid,
            cid,
            from,
            to,
            subject: parsed.subject,
            body: parsed.body,
            timestamp: parsed.timestamp ? new Date(parsed.timestamp) : new Date(),
            read: false,
            direction,
          };
        }
      } catch (e) {
        console.warn('Decrypt failed for CID', cid, e);
      }
    }
    return {
      id: cid,
      cid,
      from,
      to,
      subject: 'Encrypted message',
      body: '(Encrypted)',
      timestamp:
        eventTimestamp != null ? new Date(Number(eventTimestamp) * 1000) : new Date(),
      read: false,
      direction,
    };
  }

  return {
    id: cid,
    cid,
    from,
    to,
    subject: (data.subject ?? '') as string,
    body: (data.body ?? '') as string,
    timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
    read: false,
    direction,
  };
}
