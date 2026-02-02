import { ethers } from 'ethers';
import type { Contract } from 'ethers';
import sodium from 'libsodium-wrappers';
import { bytes32ToPk, pkToBytes32 } from '../utils/helpers';

export const ZERO_BYTES32 = '0x' + '0'.repeat(64);

export class KeyRegistryService {
  constructor(
    private keyRegistryContract: Contract, 
  ) {}

  async init(address: string) {
    const sk = sodium.randombytes_buf(sodium.crypto_box_SECRETKEYBYTES);
    const pk = sodium.crypto_scalarmult_base(sk);
    
    let currentHex: string;
    try {
      currentHex = await this.keyRegistryContract.pk(address);
    } catch(e) {
      currentHex = ZERO_BYTES32;
    }
    
    const pkHex = this.formatBytes32(pk);
    if (!currentHex || currentHex === ZERO_BYTES32 || currentHex.toLowerCase() !== pkHex.toLowerCase()) {
      const tx = await this.keyRegistryContract.setPubKey(pkHex);
      await tx.wait();
      console.log('KeyRegistryService: public key set on contract');
    }

    return { pk: this.formatBytes32(pk), sk: this.formatBytes32(sk) };
  }

  async getPubKey(address: string): Promise<Uint8Array | null> {
    let pkHex: string;
    try {
      pkHex = await this.keyRegistryContract.pk(address);
    } catch (error: unknown) {
      // BAD_DATA / value="0x" = no contract at address or wrong contract (e.g. KeyRegistry not deployed)
      const msg = error instanceof Error ? error.message : String(error);
      const isBadData =
        msg.includes('could not decode') ||
        msg.includes('BAD_DATA') ||
        (error && typeof error === 'object' && (error as { code?: string }).code === 'BAD_DATA');
      if (isBadData) {
        console.warn(
          'KeyRegistryService: no contract or empty result at configured address. Is KeyRegistry deployed? Check VITE_KEY_REGISTRY_ADDRESS.'
        );
      } else {
        console.warn('KeyRegistryService: getPubKey failed for', address, msg);
      }
      return null;
    }
    if (!pkHex || pkHex === ZERO_BYTES32) return null;
    return bytes32ToPk(pkHex);
  }

  private formatBytes32(key: Uint8Array): string {
    const hex = pkToBytes32(key).toLowerCase();
    return ethers.zeroPadValue('0x' + hex, 32);
  }
}
