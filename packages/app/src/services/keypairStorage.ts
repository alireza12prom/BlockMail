/**
 * X25519 secret key storage per Ethereum address (localStorage).
 * Used by KeyRegistry registration and email encrypt/decrypt.
 */

const STORAGE_PREFIX = 'blockmail_x25519_sk_';

function storageKey(address: string): string {
  return STORAGE_PREFIX + address.toLowerCase();
}

export function loadSecretKey(address: string): Promise<Uint8Array | null> {
  const raw = localStorage.getItem(storageKey(address));
  if (!raw) return Promise.resolve(null);
  try {
    const arr = JSON.parse(raw) as number[];
    return Promise.resolve(arr.length === 32 ? new Uint8Array(arr) : null);
  } catch {
    return Promise.resolve(null);
  }
}

export function saveSecretKey(address: string, sk: Uint8Array): Promise<void> {
  localStorage.setItem(storageKey(address), JSON.stringify(Array.from(sk)));
  return Promise.resolve();
}

export type KeypairLoader = {
  load: () => Promise<Uint8Array | null>;
  save: (sk: Uint8Array) => Promise<void>;
};

/** Create load/save callbacks for getKeyPair for a given address. */
export function createKeypairLoader(address: string): KeypairLoader {
  return {
    load: () => loadSecretKey(address),
    save: (sk) => saveSecretKey(address, sk),
  };
}
