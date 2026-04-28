import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../../../components/layout/Layout';
import MultiplayerBoard from '../../../components/combatzone/multiplayer/MultiplayerBoard';
import { useAuth } from '../../../contexts/AuthContext';
import { useMultiplayerMatch } from '../../../hooks/multiplayer/useMultiplayerMatch';

function getStatusText(status: string) {
  switch (status) {
    case 'LOBBY':
      return 'Esperando jugadores';
    case 'ACTIVE':
      return 'Partida en curso';
    case 'FINISHED':
      return 'Partida terminada';
    default:
      return 'Partida abandonada';
  }
}

export default function MultiplayerMatch() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    snapshot,
    isLoading,
    joinMatch,
    leaveMatch,
    startMatch,
    sendMove,
    isJoining,
    isLeaving,
    isStarting,
    isSendingMove,
  } = useMultiplayerMatch(id ?? '');

  if (!id) {
    return null;
  }

  const match = snapshot?.match ?? null;
  const isOwner = match?.ownerUserId === user?.id;
  const isParticipant = match?.mePlayerIndex !== null && match?.mePlayerIndex !== undefined;
  const isJaipur = match?.gameKey === 'jaipur';

  return (
    <Layout>
      <div className="mx-auto flex max-w-[1500px] flex-col gap-8 px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => navigate('/combatzone/multiplayer')}
              className="text-sm font-semibold text-[var(--color-textSecondary)]"
            >
              {'<-'} Volver al hub multijugador
            </button>
            <p className="mt-4 text-xs uppercase tracking-[0.22em] text-[var(--color-textSecondary)]">Mesa en directo</p>
            <h1 className="mt-1 text-3xl font-black text-[var(--color-text)]">{match?.gameTitle ?? 'Cargando partida…'}</h1>
            <p className="mt-2 text-sm text-[var(--color-textSecondary)]">
              {match ? getStatusText(match.status) : 'Resolviendo estado actual'}
            </p>
          </div>

          {match && (
            <div className="flex flex-wrap gap-3">
              {match.canJoin && (
                <button
                  type="button"
                  onClick={() => void joinMatch()}
                  disabled={isJoining}
                  className="rounded-full bg-[#0f766e] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {isJoining ? 'Uniéndote…' : 'Unirme'}
                </button>
              )}
              {isOwner && match.canStart && (
                <button
                  type="button"
                  onClick={() => void startMatch()}
                  disabled={isStarting}
                  className="rounded-full bg-[#ea580c] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
                >
                  {isStarting ? 'Arrancando…' : 'Iniciar partida'}
                </button>
              )}
              {isParticipant && (
                <button
                  type="button"
                  onClick={() => void leaveMatch()}
                  disabled={isLeaving}
                  className="rounded-full border border-[var(--color-cardBorder)] px-5 py-3 text-sm font-bold text-[var(--color-text)] disabled:opacity-50"
                >
                  {isLeaving ? 'Saliendo…' : 'Salir'}
                </button>
              )}
            </div>
          )}
        </div>

        {isLoading || !snapshot ? (
          <div className="rounded-[28px] border border-dashed border-[var(--color-cardBorder)] p-8 text-center text-[var(--color-textSecondary)]">
            Cargando partida…
          </div>
        ) : isJaipur ? (
          <MultiplayerBoard
            snapshot={snapshot}
            isSending={isSendingMove}
            onSendMove={(move) => {
              void sendMove(move);
            }}
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <MultiplayerBoard
              snapshot={snapshot}
              isSending={isSendingMove}
              onSendMove={(move) => {
                void sendMove(move);
              }}
            />

            <aside className="space-y-6">
              <section className="rounded-[32px] border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textSecondary)]">Jugadores</p>
                <div className="mt-4 space-y-3">
                  {snapshot.match.players.map((player) => {
                    const isMe = player.userId === user?.id;

                    return (
                      <div
                        key={player.userId}
                        className="rounded-[22px] border border-[var(--color-cardBorder)] bg-white/80 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-[var(--color-text)]">
                              {player.nick || player.name} {isMe ? '(tú)' : ''}
                            </p>
                            <p className="text-xs text-[var(--color-textSecondary)]">
                              Plaza {player.playerIndex + 1} {player.isOwner ? '· creador' : ''}
                            </p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                            {snapshot.match.gameKey === 'tres-en-raya'
                              ? player.playerIndex === 0
                                ? 'X'
                                : 'O'
                              : `J${player.playerIndex + 1}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[32px] border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-6">
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textSecondary)]">Estado de sincronización</p>
                <div className="mt-4 space-y-3 text-sm text-[var(--color-textSecondary)]">
                  <p>La mesa recibe snapshots del servidor por SSE y cada movimiento se valida en backend.</p>
                  <p>Si recargas la página, el cliente pide el estado actual y reengancha el canal automáticamente.</p>
                  {snapshot.engine && (
                    <p className="font-semibold text-[var(--color-text)]">Versión de estado: #{snapshot.engine.stateId}</p>
                  )}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </Layout>
  );
}
