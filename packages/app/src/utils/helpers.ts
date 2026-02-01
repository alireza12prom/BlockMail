import sodium from "libsodium-wrappers";

// Shorten Ethereum address for display
export function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Format relative time
export function formatTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  return date.toLocaleDateString();
}

export async function getKeyPair(load: ()=>Promise<Uint8Array|null>, save: (sk:Uint8Array)=>Promise<void>) {
  await sodium.ready;

  let sk = await load();
  if (!sk) {
    sk = sodium.randombytes_buf(sodium.crypto_box_SECRETKEYBYTES);
    await save(sk);
  }
  const pk = sodium.crypto_scalarmult_base(sk);
  return { pk, sk };
}

/** Encrypt plaintext for a recipient (crypto_box). Returns hex nonce + ciphertext for storage. */
export async function encryptEmailPayload(
  plaintext: string,
  recipientPk: Uint8Array,
  senderSk: Uint8Array
): Promise<{ nonce: string; ciphertext: string }> {
  await sodium.ready;
  const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
  const message = sodium.from_string(plaintext);
  const ciphertext = sodium.crypto_box_easy(message, nonce, recipientPk, senderSk);
  return {
    nonce: sodium.to_hex(nonce),
    ciphertext: sodium.to_hex(ciphertext),
  };
}

/** Decrypt ciphertext from a sender (crypto_box_open_easy). */
export async function decryptEmailPayload(
  ciphertextHex: string,
  nonceHex: string,
  senderPk: Uint8Array,
  recipientSk: Uint8Array
): Promise<string> {
  await sodium.ready;
  const ciphertext = sodium.from_hex(ciphertextHex);
  const nonce = sodium.from_hex(nonceHex);
  const message = sodium.crypto_box_open_easy(ciphertext, nonce, senderPk, recipientSk);
  return sodium.to_string(message);
}

/** Convert 32-byte X25519 public key to bytes32 hex for KeyRegistry contract. */
export function pkToBytes32(pk: Uint8Array): string {
  if (pk.length !== 32) throw new Error('pk must be 32 bytes');
  return Array.from(pk)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .padStart(64, '0')
    .slice(0, 64);
}

/** Convert KeyRegistry bytes32 (hex string) to 32-byte Uint8Array. */
export function bytes32ToPk(hex: string): Uint8Array {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (h.length !== 64) throw new Error('bytes32 hex must be 64 chars');
  const arr = new Uint8Array(32);
  for (let i = 0; i < 32; i++) arr[i] = parseInt(h.slice(i * 2, i * 2 + 2), 16);
  return arr;
}