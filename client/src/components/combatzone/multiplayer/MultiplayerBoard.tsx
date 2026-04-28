import type {
  MultiplayerMatchSnapshot,
  TresEnRayaCtx,
  TresEnRayaEngineState,
} from '../../../types/multiplayer';
import JaipurBoard from './JaipurBoard';

interface MatchMoveInput {
  type: string;
  args?: unknown[];
}

function getCellLabel(value: null | '0' | '1') {
  if (value === '0') return 'X';
  if (value === '1') return 'O';
  return '';
}

function getBoardTitle(snapshot: MultiplayerMatchSnapshot) {
  const result = snapshot.match.result as { winner?: string; draw?: boolean } | null;
  if (snapshot.match.status === 'FINISHED') {
    if (result?.draw) {
      return 'Empate técnico';
    }

    if (result?.winner) {
      const winner = snapshot.match.players.find((player) => String(player.playerIndex) === result.winner);
      return `Victoria de ${winner?.nick || winner?.name || 'alguien'}`;
    }
  }

  if (snapshot.engine?.isYourTurn) {
    return 'Te toca mover';
  }

  return 'Esperando al rival';
}

function TresEnRayaBoard({
  snapshot,
  isSending,
  onSendMove,
}: {
  snapshot: MultiplayerMatchSnapshot;
  isSending: boolean;
  onSendMove: (move: MatchMoveInput) => void;
}) {
  if (!snapshot.engine) {
    return null;
  }

  const board = snapshot.engine.G as TresEnRayaEngineState;
  const ctx = snapshot.engine.ctx as TresEnRayaCtx;
  const winnerLine = new Set(board.winnerLine ?? []);
  const canPlay = snapshot.match.status === 'ACTIVE' && snapshot.engine.isYourTurn && !isSending;

  return (
    <section className="rounded-[36px] border border-[#e2e8f0] bg-[linear-gradient(145deg,#fff7ed_0%,#ffffff_38%,#ecfeff_100%)] p-6 shadow-[0_28px_70px_rgba(15,23,42,0.12)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Arena táctica</p>
          <h2 className="mt-1 text-2xl font-black text-slate-900">{getBoardTitle(snapshot)}</h2>
        </div>
        <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-semibold text-slate-600">
          Turno {ctx.turn}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {board.cells.map((cell, index) => {
          const highlight = winnerLine.has(index);
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSendMove({ type: 'placeMark', args: [index] })}
              disabled={!canPlay || cell !== null}
              className={[
                'aspect-square rounded-[28px] border text-5xl font-black transition-all duration-200',
                highlight
                  ? 'border-amber-400 bg-amber-100 text-amber-700 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.25)]'
                  : 'border-slate-200 bg-white/90 text-slate-800 hover:border-cyan-400 hover:bg-cyan-50',
                !canPlay || cell !== null ? 'cursor-default' : 'cursor-pointer',
              ].join(' ')}
            >
              {getCellLabel(cell)}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
        <span className="rounded-full bg-white/80 px-3 py-1">Tú: {snapshot.engine.playerID === '0' ? 'X' : 'O'}</span>
        <span className="rounded-full bg-white/80 px-3 py-1">
          Turno actual: {ctx.currentPlayer === '0' ? 'X' : 'O'}
        </span>
      </div>
    </section>
  );
}

export default function MultiplayerBoard({
  snapshot,
  isSending,
  onSendMove,
}: {
  snapshot: MultiplayerMatchSnapshot;
  isSending: boolean;
  onSendMove: (move: MatchMoveInput) => void;
}) {
  if (!snapshot.engine) {
    return (
      <div className="rounded-[32px] border border-dashed border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-8 text-center text-[var(--color-textSecondary)]">
        El tablero aparecerá cuando la partida esté lista.
      </div>
    );
  }

  if (snapshot.match.gameKey === 'jaipur') {
    return <JaipurBoard snapshot={snapshot} isSending={isSending} onSendMove={onSendMove} />;
  }

  if (snapshot.match.gameKey === 'tres-en-raya') {
    return <TresEnRayaBoard snapshot={snapshot} isSending={isSending} onSendMove={onSendMove} />;
  }

  return (
    <div className="rounded-[32px] border border-dashed border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-8 text-center text-[var(--color-textSecondary)]">
      El tablero aparecerá cuando la partida esté lista.
    </div>
  );
}

