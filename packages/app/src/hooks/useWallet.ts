import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Email } from '../types';
import { CONTRACT_ABI, CONTRACT_ADDRESS, KEY_REGISTRY_ABI, KEY_REGISTRY_ADDRESS, RPC_URL } from '../config/constants';
import { getKeyPair, pkToBytes32 } from '../utils/helpers';

// Storage key for persisting connection
const STORAGE_KEY = 'blockmail_connection';
const X25519_STORAGE_PREFIX = 'blockmail_x25519_sk_';

interface ConnectionInfo {
  type: 'hardhat';
  accountIndex: number;
}

interface UseWalletReturn {
  isConnected: boolean;
  contract: ethers.Contract | null;
  keyRegistry: ethers.Contract | null;
  userAddress: string;
  networkName: string;
  emails: Email[];
  isReconnecting: boolean;
  connectHardhat: (accountIndex: number) => Promise<void>;
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
  const hasAttemptedReconnect = useRef(false)

  // Connect to local Hardhat node
  const connectHardhat = useCallback(async (accountIndex: number) => {
    try {
      // Use HTTP provider; Hardhat node works reliably with HTTP for queryFilter/getBlockNumber
      const provider = new ethers.JsonRpcProvider(RPC_URL);
      
      // Get account from hardhat's default accounts
      const accounts = await provider.send('eth_accounts', []);
      const address = accounts[accountIndex];
      
      // Create a signer using the account
      const signer = await provider.getSigner(address);

      const blockMail = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const keyReg = KEY_REGISTRY_ADDRESS
        ? new ethers.Contract(KEY_REGISTRY_ADDRESS, KEY_REGISTRY_ABI, signer)
        : null;

      setContract(blockMail);
      setKeyRegistry(keyReg);
      setUserAddress(address);
      setNetworkName('Hardhat Local');
      setIsConnected(true);

      // Save connection info for auto-reconnect
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        type: 'hardhat', 
        accountIndex 
      } as ConnectionInfo));

      showToast('Connected to Hardhat!', 'success');

      // Register X25519 public key in KeyRegistry when wallet connects
      if (keyReg) {
        const loadSk = () =>
          Promise.resolve(
            (() => {
              const raw = localStorage.getItem(X25519_STORAGE_PREFIX + address.toLowerCase());
              if (!raw) return null;
              const arr = JSON.parse(raw) as number[];
              return arr.length === 32 ? new Uint8Array(arr) : null;
            })()
          );
        const saveSk = (sk: Uint8Array) =>
          Promise.resolve(localStorage.setItem(X25519_STORAGE_PREFIX + address.toLowerCase(), JSON.stringify(Array.from(sk))));

        getKeyPair(loadSk, saveSk)
          .then(async ({ pk }: { pk: Uint8Array }) => {
            const pkHex = '0x' + pkToBytes32(pk);
            const current = await keyReg.pk(address);
            const zero = '0x' + '0'.repeat(64);
            if (current === zero || (current && current.toLowerCase() !== pkHex.toLowerCase())) {
              const tx = await keyReg.setPubKey(pkHex);
              await tx.wait();
              showToast('Public key registered', 'success');
            }
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
  }, [showToast]);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (contract) {
      contract.removeAllListeners();
    }
    // Clear saved connection
    localStorage.removeItem(STORAGE_KEY);
    
    setIsConnected(false);
    setContract(null);
    setKeyRegistry(null);
    setUserAddress('');
    setNetworkName('');
    setEmails([]);
  }, [contract]);

  // Auto-reconnect on mount
  useEffect(() => {
    if (hasAttemptedReconnect.current) return;
    hasAttemptedReconnect.current = true;

    const savedConnection = localStorage.getItem(STORAGE_KEY);
    if (!savedConnection) return;

    try {
      const connectionInfo: ConnectionInfo = JSON.parse(savedConnection);
      setIsReconnecting(true);

      if (connectionInfo.type === 'hardhat' && connectionInfo.accountIndex !== undefined) {
        connectHardhat(connectionInfo.accountIndex).finally(() => {
          setIsReconnecting(false);
        });
      } else {
        setIsReconnecting(false);
      }
    } catch (err) {
      console.error('Failed to restore connection:', err);
      localStorage.removeItem(STORAGE_KEY);
      setIsReconnecting(false);
    }
  }, [connectHardhat]);

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
    contract,
    keyRegistry,
    userAddress,
    networkName,
    emails,
    isReconnecting,
    connectHardhat,
    disconnect,
    addEmail,
    markAsRead,
  };
}
