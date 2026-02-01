import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Email } from '../types';
import { CONTRACT_ABI, CONTRACT_ADDRESS, KEY_REGISTRY_ABI, KEY_REGISTRY_ADDRESS, RPC_URL } from '../config/constants';
import { createKeypairLoader } from '../services/keypairStorage';
import { registerPublicKey } from '../services/keyRegistryService';

/** Cache key for last connected wallet (private key stored; kept after disconnect so user can reconnect). */
const CACHED_WALLET_KEY = 'blockmail_cached_wallet';

/** Set when user clicks Disconnect; prevents auto-restore on next page load. Cleared when user connects again. */
const DISCONNECTED_KEY = 'blockmail_disconnected';

/** 1 ETH in wei, for funding new wallets on local Hardhat. */
const ONE_ETH = BigInt(1e18);

/** Fund address on local Hardhat node so it can send txs. No-op if RPC doesn't support hardhat_setBalance. */
async function fundAddressIfHardhat(provider: ethers.JsonRpcProvider, address: string): Promise<void> {
  try {
    const balanceHex = '0x' + ONE_ETH.toString(16);
    await provider.send('hardhat_setBalance', [address, balanceHex]);
  } catch {
    // Not Hardhat or RPC doesn't support hardhat_setBalance; ignore
  }
}

/** Wallet or HDNodeWallet (both have address, privateKey, connect(provider)). */
type SignerLike = ethers.Wallet | ethers.HDNodeWallet;

interface UseWalletReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  contract: ethers.Contract | null;
  keyRegistry: ethers.Contract | null;
  userAddress: string;
  networkName: string;
  emails: Email[];
  /** Address of the cached wallet (last used), if any. Shown in Connect modal for one-click reconnect. */
  cachedWalletAddress: string | null;
  connectWithWallet: (wallet: SignerLike) => Promise<void>;
  /** Reconnect using the cached wallet (from localStorage). No-op if no cache. */
  reconnectCachedWallet: () => Promise<void>;
  disconnect: () => void;
  addEmail: (email: Email) => void;
  markAsRead: (emailId: string) => void;
}

export function useWallet(
  showToast: (message: string, type: 'success' | 'error') => void
): UseWalletReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [keyRegistry, setKeyRegistry] = useState<ethers.Contract | null>(null);
  const [userAddress, setUserAddress] = useState('');
  const [networkName, setNetworkName] = useState('');
  const [emails, setEmails] = useState<Email[]>([]);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [cachedWalletAddress, setCachedWalletAddress] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem(CACHED_WALLET_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw) as { address?: string };
      return data?.address ?? null;
    } catch {
      return null;
    }
  });
  const hasRestoredRef = useRef(false);

  const connectWithWallet = useCallback(
    async (wallet: SignerLike) => {
      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const signer = wallet.connect(provider);
        const address = await signer.getAddress();

        // Fund new wallet on local Hardhat so it can pay for setPubKey and other txs
        await fundAddressIfHardhat(provider, address);

        const blockMail = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        const keyReg = KEY_REGISTRY_ADDRESS
          ? new ethers.Contract(KEY_REGISTRY_ADDRESS, KEY_REGISTRY_ABI, signer)
          : null;

        setContract(blockMail);
        setKeyRegistry(keyReg);
        setUserAddress(address);
        setNetworkName('Hardhat Local');
        setIsConnected(true);

        // Cache wallet so user can reconnect without re-importing (private key in localStorage)
        try {
          localStorage.setItem(
            CACHED_WALLET_KEY,
            JSON.stringify({ address, privateKey: wallet.privateKey })
          );
          setCachedWalletAddress(address);
          localStorage.removeItem(DISCONNECTED_KEY); // allow auto-restore on next load
        } catch {
          // ignore storage errors
        }

        showToast('Wallet connected', 'success');

        if (keyReg) {
          const loader = createKeypairLoader(address);
          registerPublicKey(keyReg, address, loader)
            .then((registered) => {
              if (registered) showToast('Public key registered', 'success');
            })
            .catch((err: unknown) => {
              console.warn('KeyRegistry setPubKey failed:', err);
              showToast('Could not register public key', 'error');
            });
        }
      } catch (err) {
        console.error('Connection failed:', err);
        showToast('Failed to connect. Is Hardhat running?', 'error');
      }
    },
    [showToast]
  );

  // Restore cached wallet on mount only if user did not explicitly disconnect (so reload after disconnect stays disconnected)
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    if (localStorage.getItem(DISCONNECTED_KEY) === 'true') return;

    const raw = localStorage.getItem(CACHED_WALLET_KEY);
    if (!raw) return;

    let data: { address?: string; privateKey?: string };
    try {
      data = JSON.parse(raw);
      if (!data?.privateKey) return;
    } catch {
      return;
    }

    setIsReconnecting(true);
    const wallet = new ethers.Wallet(data.privateKey);
    connectWithWallet(wallet).finally(() => setIsReconnecting(false));
  }, [connectWithWallet]);

  // Reconnect using cached wallet (e.g. when user clicks "Reconnect with 0x..." in Connect modal)
  const reconnectCachedWallet = useCallback(async () => {
    const raw = localStorage.getItem(CACHED_WALLET_KEY);
    if (!raw) return;
    let data: { address?: string; privateKey?: string };
    try {
      data = JSON.parse(raw);
      if (!data?.privateKey) return;
    } catch {
      return;
    }
    setIsReconnecting(true);
    try {
      const wallet = new ethers.Wallet(data.privateKey);
      await connectWithWallet(wallet);
    } finally {
      setIsReconnecting(false);
    }
  }, [connectWithWallet]);

  // Disconnect: clear app state, keep cache for "Reconnect with 0x...", but set flag so reload does not auto-restore
  const disconnect = useCallback(async () => {
    if (contract) {
      contract.removeAllListeners();
    }
    try {
      localStorage.setItem(DISCONNECTED_KEY, 'true');
    } catch {
      // ignore
    }
    setIsConnected(false);
    setContract(null);
    setKeyRegistry(null);
    setUserAddress('');
    setNetworkName('');
    setEmails([]);
  }, [contract]);

  // Add email

  const addEmail = useCallback((email: Email) => {
    setEmails(prev => [email, ...prev]);
  }, []);

  // Mark email as read
  const markAsRead = useCallback((emailId: string) => {
    setEmails(prev =>
      prev.map(e => e.id === emailId ? { ...e, read: true } : e)
    );
  }, []);

  return {
    isConnected,
    isReconnecting,
    contract,
    keyRegistry,
    userAddress,
    networkName,
    emails,
    cachedWalletAddress,
    connectWithWallet,
    reconnectCachedWallet,
    disconnect,
    addEmail,
    markAsRead,
  };
}
