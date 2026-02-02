/**
 * Hook: load emails from contract + IPFS, poll for new messages, refresh.
 * Logic is detached from EmailList UI.
 */

import { useEffect, useState, useCallback } from 'react';
import { Email } from '../types';
import { EmailService } from '../services';
import { useWatchContractEvent } from 'wagmi';
import { CONTRACT_ABI } from '../config/constants';
import { sessionService } from '../services/session';

export interface UseEmailsParams {
  emailService: EmailService;
}

export interface UseEmailsReturn {
  emails: Email[];
  isLoading: boolean;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  addEmail: (email: Email) => void;
}

export function useEmails({
  emailService,
}: UseEmailsParams): UseEmailsReturn {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    const list = await emailService.load();
    console.log(list)
    setEmails(list);
  }, [emailService]);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      await load();
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [load, isRefreshing]);

  const addEmail = useCallback((email: Email) => {
    setEmails((prev) => {
      if (prev.some((e) => e.cid === email.cid)) return prev;
      return [email, ...prev];
    });
  }, []);

  useEffect(() => {
    load();
    setIsLoading(false);
  }, [emailService])

  useWatchContractEvent({
    address: import.meta.env.VITE_CONTRACT_ADDRESS as `0x${string}`,
    abi: CONTRACT_ABI,
    eventName: 'Message',
    onLogs(logs) {
      logs.forEach(async (log) => {
        const {cid, to} = log.args as any;
        const address = sessionService.current!.wallet.address;
        
        if (to != address) return;
        console.log('New message received: ', log.args);

        const email = await emailService.getOne(
          { cid: cid, direction: 'received' }
        );

        addEmail(email);
      })
    },
  })

  return {
    emails,
    isLoading,
    isRefreshing,
    refresh,
    addEmail,
  };
}
