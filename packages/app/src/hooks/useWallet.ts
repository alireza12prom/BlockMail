import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Email } from '../types';
import { CONTRACT_ABI, CONTRACT_ADDRESS, KEY_REGISTRY_ABI, KEY_REGISTRY_ADDRESS, RPC_URL } from '../config/constants';
import { createKeypairLoader } from '../services/keypairStorage';
import { registerPublicKey } from '../services/keyRegistryService';

/** Cache key for last 3 connected wallets. Stored as array of { address, privateKey }, most recent first. */
const CACHED_WALLETS_KEY = 'blockmail_cached_wallets';
/** Legacy single-wallet cache key (migrated to CACHED_WALLETS_KEY on read). */
const CACHED_WALLET_KEY_LEGACY = 'blockmail_cached_wallet';
const MAX_CACHED_WALLETS = 3;

function getCachedWalletsList(): { address: string; privateKey: string }[] {
  const raw = localStorage.getItem(CACHED_WALLETS_KEY);
  if (!raw) {
    const legacy = localStorage.getItem(CACHED_WALLET_KEY_LEGACY);
    if (legacy) {
      try {
        const one = JSON.parse(legacy) as { address?: string; privateKey?: string };
        if (one?.address && one?.privateKey) {
          const list = [{ address: one.address, privateKey: one.privateKey }];
          localStorage.setItem(CACHED_WALLETS_KEY, JSON.stringify(list));
          localStorage.removeItem(CACHED_WALLET_KEY_LEGACY);
          return list;
        }
      } catch {
        // ignore
      }
    }
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((w: unknown) => w && typeof w === 'object' && 'address' in w && 'privateKey' in w) : [];
  } catch {
    return [];
  }
}

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
  /** Up to 3 latest cached wallet addresses (for Connect modal). */
  cachedWallets: { address: string }[];
  connectWithWallet: (wallet: SignerLike) => Promise<void>;
  /** Reconnect using a cached wallet by address. */
  reconnectCachedWallet: (address: string) => Promise<void>;
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
  const [cachedWallets, setCachedWallets] = useState<{ address: string }[]>(() => {
    const list = getCachedWalletsList();
    return list.map((w) => ({ address: w.address })).slice(0, MAX_CACHED_WALLETS);
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

        // Keep last 3 connected wallets (most recent first)
        try {
          let list = getCachedWalletsList();
          list = list.filter((w) => w.address.toLowerCase() !== address.toLowerCase());
          list.unshift({ address, privateKey: wallet.privateKey });
          list = list.slice(0, MAX_CACHED_WALLETS);
          localStorage.setItem(CACHED_WALLETS_KEY, JSON.stringify(list));
          setCachedWallets(list.map((w) => ({ address: w.address })));
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

    const list = getCachedWalletsList();
    if (list.length === 0) return;

    const first = list[0];
    if (!first?.privateKey) return;

    setIsReconnecting(true);
    const wallet = new ethers.Wallet(first.privateKey);
    connectWithWallet(wallet).finally(() => setIsReconnecting(false));
  }, [connectWithWallet]);

  // Reconnect using a cached wallet by address
  const reconnectCachedWallet = useCallback(
    async (address: string) => {
      const list = getCachedWalletsList();
      const entry = list.find((w) => w.address.toLowerCase() === address.toLowerCase());
      if (!entry?.privateKey) return;
      setIsReconnecting(true);
      try {
        const wallet = new ethers.Wallet(entry.privateKey);
        await connectWithWallet(wallet);
      } finally {
        setIsReconnecting(false);
      }
    },
    [connectWithWallet]
  );

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
    cachedWallets,
    connectWithWallet,
    reconnectCachedWallet,
    disconnect,
    addEmail,
    markAsRead,
  };
}
