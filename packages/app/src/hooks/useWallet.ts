import { useState, useCallback, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import { Email } from '../types';
import { CONTRACT_ABI, CONTRACT_ADDRESS, HARDHAT_RPC_URL } from '../config/constants';
import { shortenAddress } from '../utils/helpers';

// Storage key for persisting connection
const STORAGE_KEY = 'blockmail_connection';

interface ConnectionInfo {
  type: 'hardhat' | 'metamask';
  accountIndex?: number;
}

interface UseWalletReturn {
  isConnected: boolean;
  contract: ethers.Contract | null;
  userAddress: string;
  networkName: string;
  emails: Email[];
  isLoadingMessages: boolean;
  isReconnecting: boolean;
  connectHardhat: (accountIndex: number) => Promise<void>;
  connectMetaMask: () => Promise<void>;
  disconnect: () => void;
  addEmail: (email: Email) => void;
  markAsRead: (emailId: string) => void;
}

export function useWallet(
  showToast: (message: string, type: 'success' | 'error') => void
): UseWalletReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [userAddress, setUserAddress] = useState('');
  const [networkName, setNetworkName] = useState('');
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const hasAttemptedReconnect = useRef(false);

  // Load past messages from the blockchain
  const loadMessages = useCallback(async (blockMail: ethers.Contract, address: string) => {
    setIsLoadingMessages(true);
    try {
      const filterTo = blockMail.filters.Message(null, address);
      const filterFrom = blockMail.filters.Message(address, null);

      const [receivedEvents, sentEvents] = await Promise.all([
        blockMail.queryFilter(filterTo),
        blockMail.queryFilter(filterFrom),
      ]);

      const loadedEmails: Email[] = [];

      for (const event of receivedEvents) {
        const log = event as ethers.EventLog;
        const [from, to, cid, , sentAt] = log.args;
        loadedEmails.push({
          id: `${cid}-${sentAt.toString()}-received`,
          from,
          to,
          subject: `Message from ${shortenAddress(from)}`,
          body: `CID: ${cid}`,
          cid,
          timestamp: new Date(Number(sentAt) * 1000),
          read: false,
          direction: 'received',
        });
      }

      for (const event of sentEvents) {
        const log = event as ethers.EventLog;
        const [from, to, cid, , sentAt] = log.args;
        loadedEmails.push({
          id: `${cid}-${sentAt.toString()}-sent`,
          from,
          to,
          subject: `Message to ${shortenAddress(to)}`,
          body: `CID: ${cid}`,
          cid,
          timestamp: new Date(Number(sentAt) * 1000),
          read: true,
          direction: 'sent',
        });
      }

      loadedEmails.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setEmails(loadedEmails);

      if (loadedEmails.length > 0) {
        showToast(`Loaded ${loadedEmails.length} message(s)`, 'success');
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
      showToast('Failed to load messages', 'error');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [showToast]);

  // Connect to local Hardhat node
  const connectHardhat = useCallback(async (accountIndex: number) => {
    try {
      const provider = new ethers.JsonRpcProvider(HARDHAT_RPC_URL);
      const signer = await provider.getSigner(accountIndex);
      const address = await signer.getAddress();

      const blockMail = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setContract(blockMail);
      setUserAddress(address);
      setNetworkName('Hardhat Local');
      setIsConnected(true);

      // Save connection info for auto-reconnect
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        type: 'hardhat', 
        accountIndex 
      } as ConnectionInfo));

      showToast('Connected to Hardhat!', 'success');

      await loadMessages(blockMail, address);

      // Listen for new incoming messages
      blockMail.on('Message', (from: string, to: string, cid: string, _metaHash: string, sentAt: bigint) => {
        if (to.toLowerCase() === address.toLowerCase()) {
          const newEmail: Email = {
            id: `${cid}-${sentAt.toString()}-received`,
            from,
            to,
            subject: `Message from ${shortenAddress(from)}`,
            body: `CID: ${cid}`,
            cid,
            timestamp: new Date(Number(sentAt) * 1000),
            read: false,
            direction: 'received',
          };
          setEmails(prev => [newEmail, ...prev]);
          showToast('New message received!', 'success');
        }
      });
    } catch (err) {
      console.error('Connection failed:', err);
      showToast('Failed to connect. Is Hardhat running?', 'error');
    }
  }, [loadMessages, showToast]);

  // Connect via MetaMask
  const connectMetaMask = useCallback(async () => {
    try {
      if (typeof window.ethereum === 'undefined') {
        showToast('MetaMask not found. Use Hardhat for local development.', 'error');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);

      if (accounts.length === 0) {
        showToast('No accounts found', 'error');
        return;
      }

      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      const blockMail = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      setContract(blockMail);
      setUserAddress(address);
      setNetworkName(network.name || `Chain ${network.chainId}`);
      setIsConnected(true);

      // Save connection info for auto-reconnect
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ 
        type: 'metamask' 
      } as ConnectionInfo));

      showToast('Connected via MetaMask!', 'success');

      await loadMessages(blockMail, address);
    } catch (err) {
      console.error('MetaMask connection failed:', err);
      showToast('MetaMask connection failed', 'error');
    }
  }, [loadMessages, showToast]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (contract) {
      contract.removeAllListeners();
    }
    // Clear saved connection
    localStorage.removeItem(STORAGE_KEY);
    
    setIsConnected(false);
    setContract(null);
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
      } else if (connectionInfo.type === 'metamask') {
        connectMetaMask().finally(() => {
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
  }, [connectHardhat, connectMetaMask]);

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
    userAddress,
    networkName,
    emails,
    isLoadingMessages,
    isReconnecting,
    connectHardhat,
    connectMetaMask,
    disconnect,
    addEmail,
    markAsRead,
  };
}
