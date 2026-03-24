// client/src/components/notifications/DisputeConfirmationModal.tsx
import { useState } from 'react';
import { confirmEventPlayed, confirmEventNotPlayed } from '../../api/events';

interface Props {
  eventId: string;
  eventTitle: string;
  notificationId: string;
  onClose: (answered: boolean) => void;
}

export default function DisputeConfirmationModal({ eventId, eventTitle, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnswer = async (played: boolean) => {
    setLoading(true);
    setError(null);
    try {
      if (played) {
        await confirmEventPlayed(eventId);
      } else {
        await confirmEventNotPlayed(eventId);
      }
      onClose(true);
    } catch {
      setError('No se pudo registrar la respuesta. Inténtalo de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={() => onClose(false)} />
      <div className="relative bg-[var(--color-cardBackground)] rounded-xl shadow-xl border border-[var(--color-cardBorder)] w-full max-w-sm p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            ¿Se disputó la partida?
          </h2>
          <p className="text-sm text-[var(--color-textSecondary)]">
            "{eventTitle}"
          </p>
        </div>

        <p className="text-sm text-[var(--color-textSecondary)]">
          Confirma si esta partida llegó a celebrarse. Esto afecta al historial y a los badges de los participantes.
        </p>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex gap-3 mt-2">
          <button
            onClick={() => handleAnswer(true)}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Si, se jugó'}
          </button>
          <button
            onClick={() => handleAnswer(false)}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg border border-[var(--color-cardBorder)] text-[var(--color-text)] font-medium text-sm hover:bg-[var(--color-tableRowHover)] transition-colors disabled:opacity-50"
          >
            No llegó a jugarse
          </button>
        </div>

        <button
          onClick={() => onClose(false)}
          disabled={loading}
          className="text-xs text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors text-center"
        >
          Responder más tarde
        </button>
      </div>
    </div>
  );
}
