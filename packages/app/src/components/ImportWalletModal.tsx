import { useState, useCallback } from 'react';
import { ethers } from 'ethers';

type SignerLike = ethers.Wallet | ethers.HDNodeWallet;

interface ImportWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseWallet: (wallet: SignerLike) => void;
}

type ImportMode = 'mnemonic' | 'privateKey';

export function ImportWalletModal({
  isOpen,
  onClose,
  onUseWallet,
}: ImportWalletModalProps) {
  const [mode, setMode] = useState<ImportMode>('mnemonic');
  const [mnemonic, setMnemonic] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleImport = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    try {
      let wallet: SignerLike;

      if (mode === 'mnemonic') {
        const phrase = mnemonic.trim().replace(/\s+/g, ' ');
        if (!phrase) {
          setError('Enter your recovery phrase');
          setIsConnecting(false);
          return;
        }
        const words = phrase.split(' ');
        if (words.length !== 12 && words.length !== 24) {
          setError('Recovery phrase must be 12 or 24 words');
          setIsConnecting(false);
          return;
        }
        wallet = ethers.HDNodeWallet.fromPhrase(phrase);
      } else {
        const key = privateKey.trim();
        if (!key) {
          setError('Enter your private key');
          setIsConnecting(false);
          return;
        }
        const hex = key.startsWith('0x') ? key : '0x' + key;
        if (hex.length !== 66) {
          setError('Private key must be 32 bytes (64 hex characters)');
          setIsConnecting(false);
          return;
        }
        wallet = new ethers.Wallet(hex);
      }

      await onUseWallet(wallet);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.includes('invalid') ? 'Invalid recovery phrase or private key' : msg);
    } finally {
      setIsConnecting(false);
    }
  }, [mode, mnemonic, privateKey, onUseWallet, onClose]);

  const handleClose = useCallback(() => {
    setMnemonic('');
    setPrivateKey('');
    setError(null);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 z-[60] animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="bg-dark-card rounded-2xl border border-white/10 shadow-2xl max-w-lg w-full animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-white/10 bg-white/2">
          <h3 className="text-xl font-semibold text-slate-100">Import wallet</h3>
          <p className="text-sm text-slate-400 mt-1">
            Enter your recovery phrase or private key to use an existing wallet
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex gap-2 p-1 bg-dark-secondary rounded-xl">
            <button
              type="button"
              onClick={() => setMode('mnemonic')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'mnemonic'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Recovery phrase
            </button>
            <button
              type="button"
              onClick={() => setMode('privateKey')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'privateKey'
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Private key
            </button>
          </div>

          {mode === 'mnemonic' ? (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                12 or 24 word phrase
              </label>
              <textarea
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                placeholder="word1 word2 word3 ..."
                rows={4}
                className="w-full px-4 py-3 bg-dark-secondary border border-white/10 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary resize-none"
                disabled={isConnecting}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Private key (64 hex characters)
              </label>
              <input
                type="password"
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="0x... or hex string"
                className="w-full px-4 py-3 bg-dark-secondary border border-white/10 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-primary font-mono"
                disabled={isConnecting}
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <p className="text-xs text-slate-500">
            Your key is used only in this session. It is not stored by the app.
          </p>

          <button
            type="button"
            onClick={handleImport}
            disabled={isConnecting}
            className="w-full py-3.5 bg-linear-to-br from-primary to-accent text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect'
            )}
          </button>
        </div>

        <div className="px-6 py-4 border-t border-white/10 bg-white/2">
          <button type="button" onClick={handleClose} className="w-full py-2.5 text-slate-400 hover:text-slate-200 rounded-xl transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
