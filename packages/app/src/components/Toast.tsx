import { ToastData } from '../types';

interface ToastProps {
  toast: ToastData;
}

export function Toast({ toast }: ToastProps) {
  return (
    <div className={`
      fixed bottom-6 right-6 px-5 py-3 rounded-xl shadow-xl border flex items-center gap-3 animate-slide-in z-50
      ${toast.type === 'success'
        ? 'bg-dark-card border-emerald-500/30'
        : 'bg-dark-card border-red-500/30'
      }
    `}>
      <span className={`
        w-2 h-2 rounded-full
        ${toast.type === 'success' ? 'bg-emerald-500 glow-success' : 'bg-red-500 glow-error'}
      `} />
      <span className="text-sm text-slate-200">{toast.message}</span>
    </div>
  );
}
