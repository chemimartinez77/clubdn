// client/src/pages/azul/CombatZone.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { useAzulGameList } from '../../hooks/useGame';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../api/axios';
import type { AzulGame } from '../../hooks/useGame';

// ─── Juegos disponibles en Combat Zone ────────────────────────────────────────

interface BoardGame {
  bggId: string;
  name: string;
  image: string | null;
  thumbnail: string | null;
}

type CombatZoneGame = {
  bggId: string;
  name: string;
  path: string;
  solo: boolean;
  launchMode: 'AZUL_CREATE' | 'NAVIGATE';
  fetchInfo?: boolean;
};

const COMBAT_ZONE_GAMES = [
  { bggId: '230802', name: 'Azul',      path: '/azul/combatzone',           solo: false, launchMode: 'AZUL_CREATE', fetchInfo: true },
  { bggId: '43570',  name: 'Viernes',   path: '/viernes',                   solo: true,  launchMode: 'NAVIGATE',    fetchInfo: true },
  { bggId: '2243',   name: 'Centipede', path: '/azul/combatzone/centipede', solo: true,  launchMode: 'NAVIGATE',    fetchInfo: false },
] satisfies ReadonlyArray<CombatZoneGame>;

function useGameInfo(bggId: string, enabled = true) {
  return useQuery<BoardGame>({
    queryKey: ['game', bggId],
    enabled,
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: BoardGame }>(`/api/games/${bggId}/info`);
      return res.data.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hora — la imagen del juego no cambia
  });
}

// ─── Card de juego ─────────────────────────────────────────────────────────────

const GAME_FALLBACK_EMOJI: Record<string, string> = {
  '230802': '🟦', // Azul
  '43570':  '🏝️', // Viernes
};

GAME_FALLBACK_EMOJI['2243'] = '\uD83D\uDC1B'; // Centipede

function GameCard({ bggId, name, solo, fetchInfo, isSelected, onClick }: {
  bggId: string;
  name: string;
  solo: boolean;
  fetchInfo?: boolean;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { data } = useGameInfo(bggId, fetchInfo ?? true);
  const imgSrc = data?.image ?? data?.thumbnail ?? null;

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col rounded-xl overflow-hidden border-2 transition-all hover:shadow-md active:scale-[0.98] group ${
        isSelected
          ? 'border-purple-500 shadow-md shadow-purple-200'
          : 'border-gray-200 hover:border-purple-400'
      }`}
    >
      {/* Imagen cuadrada */}
      <div className="aspect-square bg-gray-100 w-full overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-gray-50">
            {GAME_FALLBACK_EMOJI[bggId] ?? '🎲'}
          </div>
        )}
      </div>
      {/* Nombre */}
      <div className={`px-2 py-1.5 text-xs font-semibold text-center transition-colors ${
        isSelected ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 group-hover:bg-purple-600 group-hover:text-white'
      }`}>
        {name}
      </div>
      {/* Badge solitario */}
      {solo && (
        <span className="absolute top-1.5 left-1.5 rounded-full bg-gray-700/70 text-white text-[9px] font-bold px-1.5 py-0.5">
          Solo
        </span>
      )}
      {/* Check seleccionado */}
      {isSelected && (
        <span className="absolute top-1.5 right-1.5 rounded-full bg-purple-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center">
          ✓
        </span>
      )}
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(game: AzulGame, myId: string): { text: string; color: string } {
  if (game.status === 'WAITING') {
    return game.player1.id === myId
      ? { text: 'Esperando rival', color: 'text-yellow-600 bg-yellow-50' }
      : { text: 'Disponible', color: 'text-green-600 bg-green-50' };
  }
  if (game.status === 'ACTIVE') {
    return game.currentTurn === myId
      ? { text: '¡Tu turno!', color: 'text-purple-600 bg-purple-50' }
      : { text: 'Turno del rival', color: 'text-gray-500 bg-gray-50' };
  }
  return { text: 'Terminada', color: 'text-gray-400 bg-gray-50' };
}

function opponentName(game: AzulGame, myId: string): string {
  if (!game.player2) return '—';
  return game.player1.id === myId ? game.player2.name : game.player1.name;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

// ─── Componente de partida ────────────────────────────────────────────────────

function GameRow({ game, myId, onClick }: { game: AzulGame; myId: string; onClick: () => void }) {
  const status = statusLabel(game, myId);
  const opponent = opponentName(game, myId);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left transition-all hover:border-purple-300 hover:shadow-sm active:scale-[0.99]"
    >
      {/* Indicador de estado */}
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
        {status.text}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">
          vs {opponent}
        </p>
        <p className="text-xs text-gray-400">
          Ronda {game.gameState.round} · {timeAgo(game.updatedAt)}
        </p>
      </div>

      {/* Puntuaciones si está activa o terminada */}
      {game.status !== 'WAITING' && (
        <div className="shrink-0 flex items-center gap-3 text-sm">
          {game.gameState.players.map((p, i) => {
            const name = i === 0 ? game.player1.name : (game.player2?.name ?? '?');
            const isMe = p.id === myId;
            return (
              <div key={p.id} className="text-center">
                <div className={`font-bold ${isMe ? 'text-purple-600' : 'text-gray-500'}`}>
                  {p.score}
                </div>
                <div className="text-[10px] text-gray-400 truncate max-w-[48px]">{name}</div>
              </div>
            );
          })}
        </div>
      )}

      <span className="shrink-0 text-gray-300 text-lg">›</span>
    </button>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function CombatZone() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { games, isLoading, createGame, isCreating } = useAzulGameList();
  const [selectedBggId, setSelectedBggId] = useState<string | null>(null);

  const myId = user?.id ?? '';
  const selectedGame = COMBAT_ZONE_GAMES.find(g => g.bggId === selectedBggId) ?? null;

  const handleNewGame = async () => {
    if (!selectedGame) return;
    if (selectedGame.launchMode === 'NAVIGATE') {
      // Juegos con flujo propio o en desarrollo
      navigate(selectedGame.path);
    } else {
      // Azul: crear partida directamente
      try {
        const game = await createGame();
        navigate(`/azul/combatzone/${game.id}`);
      } catch (err) {
        console.error('[CombatZone] Error al crear partida:', err);
      }
    }
  };

  const active = games.filter(g => g.status !== 'FINISHED');
  const finished = games.filter(g => g.status === 'FINISHED');

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dreadnought Combat Zone</h1>
          <p className="text-sm text-gray-500 mt-0.5">Juegos online · solo miembros del club</p>
        </div>

        {/* Grid de juegos disponibles */}
        <section className="flex flex-col gap-3">
          <div className="flex items-end justify-between gap-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-gray-400">
              Juegos disponibles
            </h2>
            <button
              onClick={handleNewGame}
              disabled={!selectedGame || isCreating}
              className="rounded-lg bg-purple-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-purple-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creando…' : selectedGame ? `+ Nueva partida de ${selectedGame.name}` : '+ Nueva partida'}
            </button>
          </div>
          <div className="flex gap-4">
            {COMBAT_ZONE_GAMES.map(g => (
              <div key={g.bggId} className="w-40">
                <GameCard
                  bggId={g.bggId}
                  name={g.name}
                  solo={g.solo}
                  fetchInfo={g.fetchInfo}
                  isSelected={selectedBggId === g.bggId}
                  onClick={() => setSelectedBggId(prev => prev === g.bggId ? null : g.bggId)}
                />
              </div>
            ))}
          </div>
          {!selectedGame && (
            <p className="text-xs text-gray-400 italic">Selecciona un juego para crear una nueva partida.</p>
          )}
        </section>

        {/* Partidas de Azul */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xs font-mono uppercase tracking-widest text-gray-400">
            Azul — tus partidas
          </h2>

          {/* Partidas activas / en espera */}
          <div className="flex flex-col gap-2">
            {isLoading ? (
              <div className="text-sm text-gray-400 py-4 text-center">Cargando…</div>
            ) : active.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                No tienes partidas activas de Azul.
              </div>
            ) : (
              active.map(game => (
                <GameRow
                  key={game.id}
                  game={game}
                  myId={myId}
                  onClick={() => navigate(`/azul/combatzone/${game.id}`)}
                />
              ))
            )}
          </div>

          {/* Historial */}
          {finished.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-xs font-mono uppercase tracking-widest text-gray-300">
                Historial
              </h3>
              {finished.slice(0, 5).map(game => (
                <GameRow
                  key={game.id}
                  game={game}
                  myId={myId}
                  onClick={() => navigate(`/azul/combatzone/${game.id}`)}
                />
              ))}
            </div>
          )}
        </section>

      </div>
    </Layout>
  );
}
