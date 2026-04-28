import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MatchLobbyCard from '../../../components/combatzone/multiplayer/MatchLobbyCard';
import Layout from '../../../components/layout/Layout';
import { useMultiplayerLobby } from '../../../hooks/multiplayer/useMultiplayerLobby';
import type { MultiplayerVisibility } from '../../../types/multiplayer';

const VISIBILITY_OPTIONS: Array<{ value: MultiplayerVisibility; label: string }> = [
  { value: 'CLUB', label: 'Club' },
  { value: 'PRIVATE', label: 'Privada' },
  { value: 'INVITE_ONLY', label: 'Solo invitación' },
];

export default function MultiplayerHub() {
  const navigate = useNavigate();
  const { games, matches, isLoadingGames, isLoadingMatches, createMatch, isCreating } = useMultiplayerLobby();
  const [selectedGameKey, setSelectedGameKey] = useState<string>('jaipur');
  const [visibility, setVisibility] = useState<MultiplayerVisibility>('CLUB');
  const [maxPlayers, setMaxPlayers] = useState(2);

  const selectedGame = games.find((game) => game.gameKey === selectedGameKey) ?? games[0] ?? null;

  const handleCreate = async () => {
    if (!selectedGame) return;
    const snapshot = await createMatch({
      gameKey: selectedGame.gameKey,
      visibility,
      maxPlayers,
    });
    navigate(`/combatzone/multiplayer/${snapshot.match.id}`);
  };

  return (
    <Layout>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8">
        <section className="rounded-[40px] bg-[radial-gradient(circle_at_top_left,#f97316_0%,#fb923c_12%,#fff7ed_36%,#ecfeff_100%)] p-8 shadow-[0_40px_90px_rgba(15,23,42,0.12)]">
          <p className="text-sm font-bold uppercase tracking-[0.32em] text-slate-600">Combat Zone Multiplayer</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-black text-slate-900">
            Mesas vivas, turnos autoritativos y una arena que ya puede sostener duelos con bastante más tensión.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            Esta primera versión monta un motor multijugador modular sobre el stack actual del club. `Jaipur` entra como primer
            juego comercial serio y comparte infraestructura con verticales más pequeños como el tres en raya.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[32px] border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textSecondary)]">Crear mesa</p>
                <h2 className="mt-1 text-2xl font-black text-[var(--color-text)]">Elige el juego y lanza la sala</h2>
              </div>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!selectedGame || isCreating}
                className="rounded-full bg-[#0f766e] px-5 py-3 text-sm font-bold text-white transition-opacity disabled:opacity-50"
              >
                {isCreating ? 'Creando…' : 'Crear partida'}
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {isLoadingGames ? (
                <div className="text-sm text-[var(--color-textSecondary)]">Cargando catálogo…</div>
              ) : (
                games.map((game) => {
                  const isSelected = selectedGameKey === game.gameKey;
                  return (
                    <button
                      key={game.gameKey}
                      type="button"
                      onClick={() => {
                        setSelectedGameKey(game.gameKey);
                        setMaxPlayers(game.maxPlayers);
                      }}
                      className={[
                        'rounded-[28px] border p-5 text-left transition-all',
                        isSelected
                          ? 'border-[#0f766e] bg-[#ecfeff] shadow-[0_12px_30px_rgba(15,118,110,0.12)]'
                          : 'border-[var(--color-cardBorder)] bg-white',
                      ].join(' ')}
                    >
                      <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-textSecondary)]">Juego base</p>
                      <h3 className="mt-2 text-2xl font-black text-[var(--color-text)]">{game.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--color-textSecondary)]">{game.description}</p>
                      <p className="mt-4 text-xs font-semibold text-[var(--color-textSecondary)]">
                        {game.minPlayers}-{game.maxPlayers} jugadores
                      </p>
                    </button>
                  );
                })
              )}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[var(--color-text)]">Visibilidad</span>
                <select
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value as MultiplayerVisibility)}
                  className="rounded-2xl border border-[var(--color-inputBorder)] bg-white px-4 py-3 text-sm text-[var(--color-text)]"
                >
                  {VISIBILITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-[var(--color-text)]">Plazas</span>
                <select
                  value={maxPlayers}
                  onChange={(event) => setMaxPlayers(Number(event.target.value))}
                  className="rounded-2xl border border-[var(--color-inputBorder)] bg-white px-4 py-3 text-sm text-[var(--color-text)]"
                >
                  <option value={selectedGame?.maxPlayers ?? 2}>{selectedGame?.maxPlayers ?? 2} jugadores</option>
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[32px] border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textSecondary)]">Estado del módulo</p>
            <h2 className="mt-1 text-2xl font-black text-[var(--color-text)]">Qué incluye esta entrega</h2>
            <ul className="mt-5 space-y-3 text-sm leading-6 text-[var(--color-textSecondary)]">
              <li>Motor turn-based con `boardgame.io` integrado en backend.</li>
              <li>Lobby persistido con Prisma y relación directa con usuarios del club.</li>
              <li>Canal SSE por partida para sincronizar turnos y reconexiones.</li>
              <li>Mesas visuales específicas por juego, sin depender aún de `PixiJS`.</li>
            </ul>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[var(--color-textSecondary)]">Salas activas</p>
              <h2 className="mt-1 text-2xl font-black text-[var(--color-text)]">Partidas abiertas y recientes</h2>
            </div>
          </div>

          {isLoadingMatches ? (
            <div className="rounded-[28px] border border-dashed border-[var(--color-cardBorder)] p-8 text-center text-[var(--color-textSecondary)]">
              Cargando salas…
            </div>
          ) : matches.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-[var(--color-cardBorder)] p-8 text-center text-[var(--color-textSecondary)]">
              Todavía no hay partidas multijugador. La primera mesa la estrenas tú.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {matches.map((match) => (
                <MatchLobbyCard
                  key={match.id}
                  match={match}
                  onOpen={() => navigate(`/combatzone/multiplayer/${match.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}

