import { Email } from '../types';
import { shortenAddress, formatTime } from '../utils/helpers';
import { HARDHAT_ACCOUNTS } from '../config/constants';
import { useEffect, useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { PinataSDK } from 'pinata';

interface EmailListProps {
  userAddress: string,
  contract: ethers.Contract,
  onEmailClick: (email: Email) => void;
  newSentEmail?: Email | null;
}

const pinata = new PinataSDK({
  pinataJwt: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiI5NDFmNTA5Ni0zY2M0LTRjNDItOTUyMC1mM2NmNmUxNjA3MjQiLCJlbWFpbCI6ImFsaXJlemEucmV6YXBvdXIubWVAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiRlJBMSJ9LHsiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjEsImlkIjoiTllDMSJ9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6ImMxODFjYzg3YjNiNmEyZDVkZTNlIiwic2NvcGVkS2V5U2VjcmV0IjoiZGIxMjZkZWE1MGZkYjRmYzg2MTZmNjBmM2I3NmIyZDdhNTVhMmUyNWViMWIxODRhY2E1MGI3YzUzYzA3NzI3NyIsImV4cCI6MTgwMTQxNjgyN30.2n3hPQ-DMvcoW3HqV1oDhDnOp-djpsoq6OPpk-7DOzA',
  pinataGateway: 'chocolate-binding-mite-544.mypinata.cloud'
})


export function EmailList({ userAddress, contract, onEmailClick, newSentEmail }: EmailListProps) {
  const [emails, setEmails] = useState<Email[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Immediately add sent email when passed from ComposeForm
  useEffect(() => {
    if (newSentEmail) {
      setEmails(prev => {
        if (prev.some(e => e.cid === newSentEmail.cid)) {
          return prev; // Already exists
        }
        return [newSentEmail, ...prev];
      });
    }
  }, [newSentEmail]);

  useEffect(() => {
    setIsLoading(true);

    loadEmails(userAddress, contract)
      .then(loadedEmails => {
        setEmails(loadedEmails);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error loading emails:', error);
        setIsLoading(false);
      });

    // Handler for real-time messages
    const handleMessage = async (from: string, to: string, cid: string, timestamp: bigint) => {
      console.log('New Message event:', { from, to, cid, timestamp: timestamp.toString() });

      // Check if this message involves the current user
      const normalizedUser = userAddress.toLowerCase();
      const isRecipient = to.toLowerCase() === normalizedUser;
      const isSender = from.toLowerCase() === normalizedUser;

      if (!isRecipient && !isSender) {
        return; // Not relevant to this user
      }

      try {
        // Fetch email content from Pinata
        const email = await fetchEmailByCid(cid);
        email.direction = isSender ? 'sent' : 'received';

        // Add to emails list (at the top, avoiding duplicates)
        setEmails(prev => {
          if (prev.some(e => e.cid === cid)) {
            return prev; // Already exists
          }
          return [email, ...prev];
        });
      } catch (error) {
        console.error('Failed to fetch new email:', error);
      }
    };

    // Attach listener
    contract.on('Message', handleMessage);
    console.log('Subscribed to Message events');

    return () => {
      contract.off('Message', handleMessage);
      console.log('Unsubscribed from Message events');
    };
  }, [contract, userAddress]);



  return (
    <section className="flex-1 bg-dark-card rounded-2xl border border-white/10 shadow-xl overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-white/10 bg-white/2 flex justify-between items-center">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <span className="w-1 h-5 bg-linear-to-b from-primary to-accent rounded-full" />
          Inbox
        </h2>
        <span className="bg-linear-to-br from-primary to-accent text-white px-3 py-1 rounded-full text-xs font-semibold">
          {emails.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <LoadingState />
        ) : emails.length === 0 ? (
          <EmptyState />
        ) : (
          emails.map(email => (
            <EmailItem
              key={email.id}
              email={email}
              onClick={() => onEmailClick(email)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 mb-6 relative">
        <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-transparent border-t-primary rounded-full animate-spin" />
      </div>
      <h3 className="text-lg font-semibold text-slate-300 mb-2">Loading Messages</h3>
      <p className="text-sm text-slate-500">Fetching your emails from the blockchain...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-4xl mb-6 border border-white/10">
        📬
      </div>
      <h3 className="text-lg font-semibold text-slate-300 mb-2">No messages yet</h3>
      <p className="text-sm text-slate-500">Send your first blockchain-powered email!</p>
      <p className="text-xs text-slate-600 mt-4">
        Try sending to: <span className="address">{HARDHAT_ACCOUNTS[1].address}</span>
      </p>
    </div>
  );
}

interface EmailItemProps {
  email: Email;
  onClick: () => void;
}

function EmailItem({ email, onClick }: EmailItemProps) {
  return (
    <div
      onClick={onClick}
      className={`
        px-6 py-4 border-b border-white/5 cursor-pointer transition-all duration-200
        relative group hover:bg-dark-card-hover
      `}
    >
      {/* Left accent bar */}
      <div className={`
        absolute left-0 top-0 bottom-0 w-0.5 transition-all duration-200
        bg-transparent group-hover:bg-primary/50
      `} />

      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          {email.direction === 'sent' && (
            <span className="w-2 h-2 bg-primary rounded-full glow-primary" />
          )}
          <span className={`
            text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded
            ${email.direction === 'sent'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-primary/10 text-primary-light border border-primary/20'
            }
          `}>
            {email.direction}
          </span>
          <span className="text-sm font-semibold text-slate-200">
            {email.direction === 'sent'
              ? shortenAddress(email.to)
              : shortenAddress(email.from)
            }
          </span>
        </div>
        <span className="text-xs text-slate-500">{formatTime(email.timestamp)}</span>
      </div>

      <div className="text-sm text-slate-400 font-medium mb-1">{email.subject}</div>
      <div className="text-xs text-slate-500 truncate">{email.body}</div>
    </div>
  );
}

async function loadEmails(userAddress: string, contract: ethers.Contract): Promise<Email[]> {
  const filterToMe = contract.filters.Message(null, userAddress);
  const filterFromMe = contract.filters.Message(userAddress, null);

  const eventsTo = await contract.queryFilter(filterToMe);
  const eventsFrom = await contract.queryFilter(filterFromMe);

  // Process received emails
  const receivedEmails = await Promise.all(
    eventsTo.map(async (ev: any) => {
      const email = await fetchEmailByCid(ev.args.cid);
      email.direction = 'received';
      return email;
    })
  );

  // Process sent emails
  const sentEmails = await Promise.all(
    eventsFrom.map(async (ev: any) => {
      const email = await fetchEmailByCid(ev.args.cid);
      email.direction = 'sent';
      return email;
    })
  );

  // Combine and deduplicate (in case user sent to themselves)
  const allEmails = [...receivedEmails, ...sentEmails];
  const uniqueEmails = allEmails.filter((email, index, self) =>
    index === self.findIndex(e => e.cid === email.cid)
  );

  // Sort by timestamp descending
  uniqueEmails.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return uniqueEmails;
}

async function fetchEmailByCid(cid: string): Promise<Email> {
  const data = (await pinata.gateways.public.get(cid)).data as any;

  return {
    id: cid,
    cid,
    from: data.from,
    to: data.to,
    subject: data.subject,
    body: data.body,
    timestamp: new Date(data.timestamp),
  } as Email;
}