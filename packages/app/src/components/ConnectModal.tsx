import { shortenAddress } from '../utils/helpers';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Last used wallet address; if set, show "Reconnect with 0x..." button */
  cachedWalletAddress: string | null;
  onReconnectCached: () => void;
  onOpenCreateWallet: () => void;
  onOpenImportWallet: () => void;
}

export function ConnectModal({
  isOpen,
  onClose,
  cachedWalletAddress,
  onReconnectCached,
  onOpenCreateWallet,
  onOpenImportWallet,
}: ConnectModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-dark-card rounded-2xl border border-white/10 shadow-2xl max-w-md w-full animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-white/10 bg-white/2">
          <h3 className="text-xl font-semibold text-slate-100">Connect Wallet</h3>
          <p className="text-sm text-slate-400 mt-1">
            {cachedWalletAddress ? 'Reconnect or use another wallet' : 'Create a new wallet or import an existing one'}
          </p>
        </div>

        <div className="p-6 space-y-3">
          {cachedWalletAddress && (
            <button
              type="button"
              onClick={() => {
                onReconnectCached();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-primary/20 hover:bg-primary/30 border border-primary/40 hover:border-primary/50 rounded-xl transition-all text-slate-100 font-medium"
            >
              <span className="text-lg">↻</span>
              Reconnect with {shortenAddress(cachedWalletAddress)}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCreateWallet}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/50 rounded-xl transition-all text-slate-100 font-medium"
          >
            <span className="text-lg">+</span>
            Create new wallet
          </button>
          <button
            type="button"
            onClick={onOpenImportWallet}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-primary/30 rounded-xl transition-all text-slate-300 hover:text-slate-100 font-medium"
          >
            <span className="text-lg">↩</span>
            Import wallet
          </button>
        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-white/2">
          <button onClick={onClose} className="w-full btn">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
