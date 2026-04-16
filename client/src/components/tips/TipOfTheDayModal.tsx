// client/src/components/tips/TipOfTheDayModal.tsx
import { useState } from 'react';
import { api } from '../../api/axios';
import { useQueryClient } from '@tanstack/react-query';
import type { Tip } from '../../data/tips';
import { getRandomTipExcluding, markTipShown } from '../../data/tips';

interface TipOfTheDayModalProps {
  tip: Tip;
  onClose: () => void;
}

export default function TipOfTheDayModal({ tip, onClose }: TipOfTheDayModalProps) {
  const [current, setCurrent] = useState<Tip>(tip);
  const [disabling, setDisabling] = useState(false);
  const queryClient = useQueryClient();

  const handleClose = () => {
    markTipShown();
    onClose();
  };

  const handleAnother = () => {
    setCurrent(getRandomTipExcluding(current.id));
  };

  const handleDisable = async () => {
    setDisabling(true);
    try {
      await api.patch('/api/profile/me', { showTipOfTheDay: false });
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
    } catch {
      // Si falla, cerramos igualmente
    }
    markTipShown();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-[var(--color-modalBackground)] border border-[var(--color-cardBorder)] rounded-xl shadow-xl w-full max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <div className="flex items-center gap-2">
              {/* Icono bombilla */}
              <svg
                className="w-5 h-5 text-[var(--color-primary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m1.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <span className="text-sm font-semibold text-[var(--color-textSecondary)] uppercase tracking-wide">
                Consejo del día
              </span>
            </div>
            <button
              onClick={handleClose}
              className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors"
              aria-label="Cerrar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tip */}
          <div className="px-5 pb-5">
            <p className="text-[var(--color-text)] text-base leading-relaxed min-h-[3rem]">
              {current.text}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 pb-5 pt-1 border-t border-[var(--color-cardBorder)] mt-1 gap-3">
            <div className="flex flex-col gap-1">
              <button
                onClick={handleAnother}
                className="text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors underline underline-offset-2 text-left"
              >
                Ver otro consejo
              </button>
              <button
                onClick={handleDisable}
                disabled={disabling}
                className="text-xs text-[var(--color-textSecondary)] hover:text-red-500 transition-colors underline underline-offset-2 text-left disabled:opacity-50"
              >
                No volver a mostrar
              </button>
            </div>
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
