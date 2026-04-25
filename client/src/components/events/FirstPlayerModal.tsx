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

interface FirstPlayerModalProps {
  eventId: string;
  spinEffect: 'ruleta' | 'spotlight';
  onClose: () => void;
}

type Phase = 'idle' | 'spinning' | 'error';

export default function FirstPlayerModal({ eventId, spinEffect, onClose }: FirstPlayerModalProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [players, setPlayers] = useState<Player[]>([]);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSpin() {
    setError(null);
    try {
      const res = await api.get<{ success: boolean; data: { players: Player[] } }>(`/api/events/${eventId}/spin-first-player`);
      const ps = res.data.data.players;
      setPlayers(ps);
      // Para spotlight: elegir el ganador ahora, una sola vez
      if (spinEffect === 'spotlight') {
        setChosenId(ps[Math.floor(Math.random() * ps.length)]!.id);
      }
      setPhase('spinning');
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Error al obtener los jugadores');
      setPhase('error');
    }
  }

  async function handleResult(winner: Player) {
    setChosenId(winner.id);
    try {
      await api.post(`/api/events/${eventId}/spin-first-player`, { chosenId: winner.id });
    } catch {
      // El registro falló pero no bloqueamos al usuario — el resultado visual ya se mostró
    }
    onClose();
  }


  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col items-center gap-5">
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

        {phase === 'spinning' && players.length > 0 && (
          <>
            {spinEffect === 'ruleta' ? (
              <SpinRuleta
                players={players}
                onResult={handleResult}
              />
            ) : chosenId && (
              <SpinSpotlight
                players={players}
                chosenId={chosenId}
                onAnimationEnd={() => {
                  const winner = players.find(p => p.id === chosenId);
                  if (winner) handleResult(winner);
                }}
              />
            )}
          </>
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
