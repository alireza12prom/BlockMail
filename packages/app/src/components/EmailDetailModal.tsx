import { Email } from '../types';

interface EmailDetailModalProps {
  email: Email | null;
  onClose: () => void;
  onReply: (address: string) => void;
}

export function EmailDetailModal({ email, onClose, onReply }: EmailDetailModalProps) {
  if (!email) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-dark-card rounded-2xl border border-white/10 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-modal-in"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/10 bg-white/2">
          <h3 className="text-xl font-semibold text-slate-100 mb-4">{email.subject}</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 w-12">From:</span>
              <span className="address">{email.from}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 w-12">To:</span>
              <span className="address">{email.to}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 w-12">At:</span>
              <span className="address">{email.timestamp.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 flex-1 overflow-y-auto text-slate-300 leading-relaxed whitespace-pre-wrap">
          {email.body}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/2 flex justify-end gap-3">
          <button
            className="btn"
            onClick={onClose}
          >
            Close
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              onReply(email.from);
              onClose();
            }}
          >
            Reply
          </button>
        </div>
      </div>
    </div>
  );
}
