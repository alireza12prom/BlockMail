/**
 * Hook: load emails from contract + IPFS, poll for new messages, refresh.
 * Logic is detached from EmailList UI.
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import type { Contract } from 'ethers';
import { Email } from '../types';
import { loadEmails, fetchEmailByCid } from '../services/emailService';

const POLL_INTERVAL_MS = 30 * 1000;

export interface UseEmailsParams {
  userAddress: string;
  contract: Contract | null;
  keyRegistry: Contract | null;
}

export interface UseEmailsReturn {
  emails: Email[];
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  addEmail: (email: Email) => void;
  addNewEmailFromEvent: (cid: string, from: string, eventTimestamp?: bigint) => Promise<Email | null>;
}

export function useEmails({
  userAddress,
  contract,
  keyRegistry,
}: UseEmailsParams): UseEmailsReturn {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastBlockRef = useRef(0);

  const load = useCallback(async () => {
    if (!contract) return;
    const list = await loadEmails({ userAddress, contract, keyRegistry });
    setEmails(list);
  }, [userAddress, contract, keyRegistry]);

  const refresh = useCallback(async () => {
    if (!contract || isRefreshing) return;
    setIsRefreshing(true);
    try {
      const provider = contract.runner?.provider;
      if (provider) {
        lastBlockRef.current = await provider.getBlockNumber();
      }
      await load();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [contract, load, isRefreshing]);

  const addEmail = useCallback((email: Email) => {
    setEmails((prev) => {
      if (prev.some((e) => e.cid === email.cid)) return prev;
      return [email, ...prev];
    });
  }, []);

  const addNewEmailFromEvent = useCallback(
    async (cid: string, from: string, eventTimestamp?: bigint): Promise<Email | null> => {
      if (!contract) return null;
      const isSender = from.toLowerCase() === userAddress.toLowerCase();
      const email = await fetchEmailByCid({
        cid,
        direction: isSender ? 'sent' : 'received',
        userAddress,
        keyRegistry,
        eventTimestamp,
      });
      email.direction = isSender ? 'sent' : 'received';
      return email;
    },
    [userAddress, contract, keyRegistry]
  );

  useEffect(() => {
    if (!contract || !userAddress) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let pollInterval: ReturnType<typeof setInterval>;

    const pollForEvents = async () => {
      try {
        const provider = contract.runner?.provider;
        if (!provider) return;

        const currentBlock = await provider.getBlockNumber();
        if (currentBlock <= lastBlockRef.current) return;

        const filterToMe = contract.filters.Message(null, userAddress);
        const filterFromMe = contract.filters.Message(userAddress, null);

        const [eventsTo, eventsFrom] = await Promise.all([
          contract.queryFilter(filterToMe, lastBlockRef.current + 1, currentBlock),
          contract.queryFilter(filterFromMe, lastBlockRef.current + 1, currentBlock),
        ]);

        for (const ev of [...eventsTo, ...eventsFrom]) {
          const args = (ev as { args: { cid: string; from: string; timestamp?: bigint } }).args;
          const email = await addNewEmailFromEvent(args.cid, args.from, args.timestamp);
          if (email) {
            setEmails((prev) => {
              if (prev.some((e) => e.cid === email.cid)) return prev;
              return [email, ...prev];
            });
          }
        }

        lastBlockRef.current = currentBlock;
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    const init = async () => {
      try {
        await load();
        const provider = contract.runner?.provider;
        if (provider) {
          lastBlockRef.current = await provider.getBlockNumber();
        }
        pollInterval = setInterval(pollForEvents, POLL_INTERVAL_MS);
      } catch (error) {
        console.error('Error loading emails:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [contract, userAddress, keyRegistry, load, addNewEmailFromEvent]);

  return {
    emails,
    isLoading,
    isRefreshing,
    refresh,
    addEmail,
    addNewEmailFromEvent,
  };
}
