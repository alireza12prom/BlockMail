interface WelcomeScreenProps {
  onConnect: () => void;
}

export function WelcomeScreen({ onConnect }: WelcomeScreenProps) {
  return (
    <div className="flex-1 flex items-center justify-center py-20">
      <div className="text-center max-w-md">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-5xl mb-6 mx-auto border border-white/10">
          🔗
        </div>
        <h2 className="text-2xl font-bold text-slate-100 mb-3">Connect Your Wallet</h2>
        <p className="text-slate-400 mb-8">
          Connect to start sending and receiving blockchain-powered emails.
        </p>
        <button
          onClick={onConnect}
          className="inline-flex items-center gap-2 bg-linear-to-br from-primary to-accent px-8 py-4 rounded-xl text-white font-semibold hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
        >
          Connect Wallet
        </button>
      </div>
    </div>
  );
}
