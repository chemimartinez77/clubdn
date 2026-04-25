import { useState } from 'react';
import { api } from '../../api/axios';
import SpinRuleta from './SpinRuleta';
import SpinSpotlight from './SpinSpotlight';

interface Player {
  id: string;
  name: string;
  nick?: string | null;
  avatarUrl?: string | null;
}

interface SpinResult {
  spinId: string;
  chosen: Player;
  players: Player[];
}

interface FirstPlayerModalProps {
  eventId: string;
  spinEffect: 'ruleta' | 'spotlight';
  onClose: () => void;
}

type Phase = 'idle' | 'spinning' | 'result' | 'error';

export default function FirstPlayerModal({ eventId, spinEffect, onClose }: FirstPlayerModalProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<SpinResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSpin() {
    setError(null);
    try {
      const res = await api.post<{ success: boolean; data: SpinResult }>(`/api/events/${eventId}/spin-first-player`);
      setResult(res.data.data);
      setPhase('spinning');
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Error al girar la ruleta';
      setError(msg);
      setPhase('error');
    }
  }

  function handleAnimationEnd() {
    setPhase('result');
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5">
        {/* Cabecera */}
        <div className="flex w-full items-center justify-between">
          <h2 className="text-lg font-bold text-white">Jugador inicial</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors text-xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {/* Contenido según fase */}
        {phase === 'idle' && (
          <div className="flex flex-col items-center gap-4 w-full">
            <p className="text-sm text-zinc-400 text-center">
              {spinEffect === 'ruleta'
                ? 'Gira la ruleta para elegir quien empieza la partida.'
                : 'Elige al azar quien empieza la partida.'}
            </p>
            <button
              onClick={handleSpin}
              className="w-full py-3 rounded-xl font-bold text-white text-base transition-all"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              Girar
            </button>
          </div>
        )}

        {phase === 'spinning' && result && (
          <>
            {spinEffect === 'ruleta' ? (
              <SpinRuleta
                players={result.players}
                chosenId={result.chosen.id}
                onAnimationEnd={handleAnimationEnd}
              />
            ) : (
              <SpinSpotlight
                players={result.players}
                chosenId={result.chosen.id}
                onAnimationEnd={handleAnimationEnd}
              />
            )}
          </>
        )}

        {phase === 'result' && result && (
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="text-4xl">🏆</div>
            <div className="text-center">
              <p className="text-zinc-400 text-sm">Empieza</p>
              {result.chosen.nick?.trim() ? (
                <>
                  <p className="text-white text-2xl font-extrabold mt-1">{result.chosen.nick.trim()}</p>
                  <p className="text-zinc-500 text-sm mt-0.5">{result.chosen.name}</p>
                </>
              ) : (
                <p className="text-white text-2xl font-extrabold mt-1">{result.chosen.name}</p>
              )}
            </div>
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => { setPhase('idle'); setResult(null); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Repetir
              </button>
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-colors"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                Listo
              </button>
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div className="flex flex-col items-center gap-4 w-full">
            <p className="text-red-400 text-sm text-center">{error}</p>
            <button
              onClick={() => setPhase('idle')}
              className="w-full py-2 rounded-xl text-sm font-semibold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              Volver
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
