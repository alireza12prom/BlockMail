import { HARDHAT_ACCOUNTS } from '../config/constants';
import { shortenAddress } from '../utils/helpers';

interface ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectHardhat: (accountIndex: number) => void;
  onConnectMetaMask: () => void;
}

export function ConnectModal({
  isOpen,
  onClose,
  onConnectHardhat,
  onConnectMetaMask
}: ConnectModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-50 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-dark-card rounded-2xl border border-white/10 shadow-2xl max-w-md w-full animate-modal-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-white/10 bg-white/2">
          <h3 className="text-xl font-semibold text-slate-100">Connect Wallet</h3>
          <p className="text-sm text-slate-400 mt-1">Choose how you want to connect</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Hardhat Local */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full" />
              Hardhat Local (Development)
            </h4>
            <div className="space-y-2">
              {HARDHAT_ACCOUNTS.map((account, index) => (
                <button
                  key={account.address}
                  onClick={() => onConnectHardhat(index)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-dark-secondary hover:bg-primary/10 border border-white/10 hover:border-primary/30 rounded-xl transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-500/20 text-yellow-400 rounded-lg flex items-center justify-center text-sm font-bold">
                      #{index}
                    </div>
                    <div className="text-left">
                      <div className="text-sm font-medium text-slate-200">{account.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{shortenAddress(account.address)}</div>
                    </div>
                  </div>
                  <span className="text-slate-500 group-hover:text-primary transition-colors">→</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-dark-card px-2 text-slate-500">or</span>
            </div>
          </div>

          {/* MetaMask */}
          <button
            onClick={onConnectMetaMask}
            className="w-full flex items-center justify-between px-4 py-3 bg-dark-secondary hover:bg-primary/10 border border-white/10 hover:border-primary/30 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                🦊
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-slate-200">MetaMask Extension</div>
                <div className="text-xs text-slate-500">Connect via browser extension</div>
              </div>
            </div>
            <span className="text-slate-500 group-hover:text-primary transition-colors">→</span>
          </button>
        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-white/2">
          <button
            onClick={onClose}
            className="w-full btn"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
