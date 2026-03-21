import { AlertTriangle } from 'lucide-react';

export const ConfirmModal = ({ open, title, message, onConfirm, onCancel, confirmLabel = 'Excluir', danger = true }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
      <div className="glass-card w-full max-w-sm p-6 text-center" data-testid="confirm-modal">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${danger ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
          <AlertTriangle size={22} className={danger ? 'text-red-400' : 'text-amber-400'} />
        </div>
        <h3 className="text-white font-bold text-lg mb-2" style={{ fontFamily: 'Manrope' }}>
          {title || 'Confirmar exclusão'}
        </h3>
        <p className="text-slate-400 text-sm mb-6">
          {message || 'Tem certeza que deseja apagar este item? Esta ação não pode ser desfeita.'}
        </p>
        <div className="flex gap-3">
          <button
            data-testid="confirm-cancel-btn"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            data-testid="confirm-ok-btn"
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition-colors ${danger ? 'bg-red-600/80 hover:bg-red-600' : 'bg-amber-600/80 hover:bg-amber-600'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
