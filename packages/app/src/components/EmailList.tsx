import { Email } from '../types';
import { shortenAddress, formatTime } from '../utils/helpers';
import { HARDHAT_ACCOUNTS } from '../config/constants';

interface EmailListProps {
  emails: Email[];
  isLoading: boolean;
  onEmailClick: (email: Email) => void;
}

export function EmailList({ emails, isLoading, onEmailClick }: EmailListProps) {
  const unreadCount = emails.filter(e => !e.read).length;

  return (
    <section className="flex-1 bg-dark-card rounded-2xl border border-white/10 shadow-xl overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-white/10 bg-white/2 flex justify-between items-center">
        <h2 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <span className="w-1 h-5 bg-linear-to-b from-primary to-accent rounded-full" />
          Inbox
        </h2>
        <span className="bg-linear-to-br from-primary to-accent text-white px-3 py-1 rounded-full text-xs font-semibold">
          {unreadCount} unread
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
        relative group
        ${!email.read ? 'bg-primary/5' : 'hover:bg-dark-card-hover'}
      `}
    >
      {/* Left accent bar */}
      <div className={`
        absolute left-0 top-0 bottom-0 w-0.5 transition-all duration-200
        ${!email.read ? 'bg-primary' : 'bg-transparent group-hover:bg-primary/50'}
      `} />

      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-2">
          {!email.read && (
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
