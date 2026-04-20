import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import UserPopover from '../components/ui/UserPopover';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/axios';

interface Player {
  userId: string;
  displayName: string;
  avatar: string | null;
  gameCount: number;
  sharedWith: string | null;
}

interface Stats {
  publicCount: number;
  privateCount: number;
  totalGamesPublic: number;
  totalExpansionsPublic: number;
  uniqueGamesTotal: number;
  uniqueExpansionsTotal: number;
}

interface Top10Entry {
  gameId: string;
  name: string;
  thumbnail: string | null;
  yearPublished: number | null;
  ownerCount: number;
}

interface PlayersResponse {
  players: Player[];
  stats: Stats;
  top10: Top10Entry[];
}

interface PublicOwner {
  userId: string;
  displayName: string;
  avatar: string | null;
}

interface GameResult {
  gameId: string;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
  publicOwners: PublicOwner[];
  privateCount: number;
  totalOwners: number;
}

interface SearchResponse {
  results: GameResult[];
  pagination: { currentPage: number; pageSize: number; total: number; totalPages: number };
}

interface GameInfo {
  id: string;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
}

interface ComparePlayer {
  userId: string;
  displayName: string;
  avatar: string | null;
  isCurrentUser: boolean;
}

interface CompareResponse {
  players: ComparePlayer[];
  common: GameInfo[];
  uniqueByPlayer: Record<string, GameInfo[]>;
}

type Tab = 'players' | 'search' | 'compare';

const MAX_COMPARE = 5;

function PlayerAvatar({ displayName: name, avatar, size = 12 }: { displayName: string; avatar: string | null; size?: number }) {
  if (avatar) {
    return <img src={avatar} alt={name} className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0`} />;
  }
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ fontSize: size < 10 ? '0.75rem' : '1.125rem', background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primaryDark))' }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function OwnerChip({ owner }: { owner: PublicOwner }) {
  return (
    <UserPopover userId={owner.userId} name={owner.displayName} avatar={owner.avatar}>
      <Link
        to={`/ludotecas-jugadores/${owner.userId}`}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-tableRowHover)] text-[var(--color-text)] border border-[var(--color-cardBorder)] hover:bg-[var(--color-cardBorder)] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <PlayerAvatar displayName={owner.displayName} avatar={owner.avatar} size={4} />
        {owner.displayName}
      </Link>
    </UserPopover>
  );
}

function OwnersLine({ publicOwners, privateCount }: { publicOwners: PublicOwner[]; privateCount: number }) {
  const hasPublic = publicOwners.length > 0;
  const hasPrivate = privateCount > 0;
  if (!hasPublic && !hasPrivate) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mt-1">
      {publicOwners.map((owner) => <OwnerChip key={owner.userId} owner={owner} />)}
      {hasPrivate && (
        <span className="text-xs text-[var(--color-textSecondary)] italic">
          {hasPublic
            ? `y ${privateCount} jugador${privateCount > 1 ? 'es' : ''} más`
            : `${privateCount} jugador${privateCount > 1 ? 'es' : ''} (ludoteca privada)`}
        </span>
      )}
    </div>
  );
}

function GameCard({ game }: { game: GameInfo }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)]">
      {game.thumbnail ? (
        <img src={game.thumbnail} alt={game.name} className="w-12 h-12 rounded object-contain flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded bg-[var(--color-tableRowHover)] flex items-center justify-center flex-shrink-0 text-xl">🎲</div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--color-text)] leading-tight line-clamp-2">{game.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {game.yearPublished && <span className="text-xs text-[var(--color-textSecondary)]">{game.yearPublished}</span>}
          <a
            href={`https://boardgamegeek.com/boardgame/${game.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[var(--color-primary)] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            BGG
          </a>
        </div>
      </div>
    </div>
  );
}

export default function JugadoresLudoteca() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) ?? 'players';

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Estado comparador
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const setTab = (t: Tab) => setSearchParams({ tab: t });

  const { data: myGamesData } = useQuery<{ player: { gameCount: number; expansionCount: number } }>({
    queryKey: ['jugadorGames', user?.id, '', 1],
    queryFn: () => api.get(`/api/jugadores-ludoteca/${user!.id}/games`, { params: { pageSize: 1 } }).then((r) => r.data.data),
    enabled: !!user?.id && tab === 'players',
    staleTime: 5 * 60 * 1000,
  });

  const { data: playersData, isLoading: playersLoading } = useQuery<PlayersResponse>({
    queryKey: ['jugadores'],
    queryFn: () => api.get('/api/jugadores-ludoteca').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
    enabled: tab === 'players' || tab === 'compare',
  });

  const { data: searchData, isLoading: searchLoading } = useQuery<SearchResponse>({
    queryKey: ['jugadoresSearch', search, page],
    queryFn: () => api.get('/api/jugadores-ludoteca/search', { params: { q: search, page, pageSize: 20 } }).then((r) => r.data.data),
    enabled: tab === 'search' && search.length >= 2,
    staleTime: 2 * 60 * 1000,
  });

  const compareMutation = useMutation<CompareResponse, Error, string[]>({
    mutationFn: (userIds) => api.post('/api/jugadores-ludoteca/compare', { userIds }).then((r) => r.data.data),
  });

  const players = playersData?.players ?? [];
  const stats = playersData?.stats;
  const top10 = playersData?.top10 ?? [];
  const searchResults = searchData?.results ?? [];
  const pagination = searchData?.pagination;

  // Helpers comparador
  const togglePlayer = (userId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(userId)) return prev.filter((id) => id !== userId);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, userId];
    });
    compareMutation.reset();
  };

  // Todos los jugadores seleccionables en el comparador (propios + lista pública)
  const allSelectablePlayers: (Player & { isSelf?: boolean })[] = user
    ? [
        { userId: user.id, displayName: user.profile?.nick ?? user.name, avatar: user.profile?.avatar ?? null, gameCount: myGamesData?.player.gameCount ?? 0, isSelf: true },
        ...players,
      ]
    : players;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Título y tabs */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)] mb-4">Ludotecas de jugadores</h1>
          <div className="flex flex-wrap gap-1 bg-[var(--color-tableRowHover)] rounded-lg p-1 w-fit">
            {(['players', 'search', 'compare'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  tab === t
                    ? 'bg-[var(--color-cardBackground)] text-[var(--color-text)] shadow-sm'
                    : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                }`}
              >
                {t === 'players' ? 'Lista de jugadores' : t === 'search' ? 'Buscar juego' : 'Comparar'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab: Lista de jugadores ── */}
        {tab === 'players' && (
          <>
            {!playersLoading && stats && (
              <div className="mb-6 p-4 rounded-xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)]">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--color-textSecondary)]">
                  <span><span className="font-semibold text-[var(--color-text)]">{stats.publicCount}</span> ludoteca{stats.publicCount !== 1 ? 's' : ''} pública{stats.publicCount !== 1 ? 's' : ''}</span>
                  {stats.privateCount > 0 && <span><span className="font-semibold text-[var(--color-text)]">{stats.privateCount}</span> privada{stats.privateCount !== 1 ? 's' : ''}</span>}
                  <span>
                    <span className="font-semibold text-[var(--color-text)]">{stats.totalGamesPublic}</span> juegos
                    {stats.totalExpansionsPublic > 0 && <> y <span className="font-semibold text-[var(--color-text)]">{stats.totalExpansionsPublic}</span> expansiones</>}
                    {' '}en colecciones públicas
                  </span>
                  <span>
                    <span className="font-semibold text-[var(--color-text)]">{stats.uniqueGamesTotal}</span> juegos únicos
                    {stats.uniqueExpansionsTotal > 0 && <> y <span className="font-semibold text-[var(--color-text)]">{stats.uniqueExpansionsTotal}</span> expansiones únicas</>}
                    {' '}en el club
                  </span>
                </div>
              </div>
            )}

            {/* Top 10 */}
            {!playersLoading && top10.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-[var(--color-textSecondary)] uppercase tracking-wide mb-3">Top 10 juegos más comunes</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {top10.map((entry, i) => (
                    <div key={entry.gameId} className="flex items-center gap-3 p-2 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)]">
                      <span className="text-sm font-bold text-[var(--color-textSecondary)] w-5 text-center flex-shrink-0">{i + 1}</span>
                      {entry.thumbnail ? (
                        <img src={entry.thumbnail} alt={entry.name} className="w-10 h-10 rounded object-contain flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-[var(--color-tableRowHover)] flex items-center justify-center flex-shrink-0 text-lg">🎲</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--color-text)] truncate">{entry.name}</p>
                        <p className="text-xs text-[var(--color-textSecondary)]">{entry.ownerCount} jugadores lo tienen</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {playersLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 bg-[var(--color-cardBorder)] animate-pulse rounded-xl" />)}
              </div>
            )}

            {!playersLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {user && (
                  <Link
                    to="/mi-ludoteca"
                    className="flex items-center gap-4 p-4 rounded-xl border-2 border-[var(--color-primary)] bg-[var(--color-cardBackground)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                  >
                    <PlayerAvatar displayName={user.profile?.nick ?? user.name} avatar={user.profile?.avatar ?? null} />
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-text)] truncate">
                        {user.profile?.nick ?? user.name}
                        <span className="ml-2 text-xs font-normal text-[var(--color-primary)]">tú</span>
                      </p>
                      <p className="text-sm text-[var(--color-textSecondary)]">
                        {myGamesData
                          ? `${myGamesData.player.gameCount} juegos${myGamesData.player.expansionCount > 0 ? ` y ${myGamesData.player.expansionCount} expansiones` : ''}`
                          : 'Mi ludoteca'}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-[var(--color-primary)] ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
                {players.map((player) => (
                  <Link
                    key={player.userId}
                    to={`/ludotecas-jugadores/${player.userId}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                  >
                    <PlayerAvatar displayName={player.displayName} avatar={player.avatar} />
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-text)] truncate">{player.displayName}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm text-[var(--color-textSecondary)]">{player.gameCount} juegos</p>
                        {player.sharedWith && (
                          <span
                            title={`Colección compartida con ${player.sharedWith}`}
                            className="inline-flex items-center gap-1 text-xs text-[var(--color-textSecondary)] cursor-help"
                          >
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 110-8 4 4 0 010 8zm6 4a3 3 0 100-6 3 3 0 000 6z" />
                            </svg>
                            Compartida
                          </span>
                        )}
                      </div>
                    </div>
                    <svg className="w-4 h-4 text-[var(--color-textSecondary)] ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Tab: Buscar juego ── */}
        {tab === 'search' && (
          <>
            <div className="mb-6">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Busca un juego para ver quién lo tiene..."
                className="w-full md:w-96 px-4 py-2 rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] text-[var(--color-text)] placeholder-[var(--color-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                autoFocus
              />
              {searchInput.length > 0 && searchInput.length < 2 && (
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">Escribe al menos 2 caracteres</p>
              )}
            </div>

            {search.length < 2 && (
              <div className="text-center text-[var(--color-textSecondary)] py-16">
                <p className="text-4xl mb-3">🔍</p>
                <p>Busca un juego para ver qué jugadores lo tienen en su colección</p>
              </div>
            )}

            {search.length >= 2 && searchLoading && (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-[var(--color-cardBorder)] animate-pulse rounded-xl" />)}
              </div>
            )}

            {search.length >= 2 && !searchLoading && searchResults.length === 0 && (
              <p className="text-center text-[var(--color-textSecondary)] py-12">
                Ningún jugador tiene un juego que coincida con "{search}".
              </p>
            )}

            {search.length >= 2 && !searchLoading && searchResults.length > 0 && (
              <>
                <div className="space-y-4">
                  {searchResults.map((result) => (
                    <div key={result.gameId} className="flex gap-4 p-4 rounded-xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)]">
                      {result.thumbnail ? (
                        <img src={result.thumbnail} alt={result.name} className="w-16 h-16 rounded object-contain flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded bg-[var(--color-tableRowHover)] flex items-center justify-center flex-shrink-0 text-2xl">🎲</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--color-text)]">
                          {result.name}
                          {result.yearPublished && <span className="text-[var(--color-textSecondary)] font-normal text-sm ml-2">({result.yearPublished})</span>}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 mb-2">
                          <p className="text-xs text-[var(--color-textSecondary)]">Lo tienen {result.totalOwners} {result.totalOwners === 1 ? 'jugador' : 'jugadores'}</p>
                          <a href={`https://boardgamegeek.com/boardgame/${result.gameId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--color-primary)] hover:underline">Ver en BGG</a>
                        </div>
                        <OwnersLine publicOwners={result.publicOwners} privateCount={result.privateCount} />
                      </div>
                    </div>
                  ))}
                </div>
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="px-4 py-2 rounded-lg border border-[var(--color-cardBorder)] text-sm font-medium text-[var(--color-text)] disabled:opacity-40 hover:bg-[var(--color-tableRowHover)] transition-colors">Anterior</button>
                    <span className="text-sm text-[var(--color-textSecondary)]">Página {pagination.currentPage} de {pagination.totalPages}</span>
                    <button onClick={() => setPage((p) => p + 1)} disabled={page >= pagination.totalPages} className="px-4 py-2 rounded-lg border border-[var(--color-cardBorder)] text-sm font-medium text-[var(--color-text)] disabled:opacity-40 hover:bg-[var(--color-tableRowHover)] transition-colors">Siguiente</button>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── Tab: Comparar ── */}
        {tab === 'compare' && (
          <>
            <p className="text-sm text-[var(--color-textSecondary)] mb-4">
              Selecciona hasta {MAX_COMPARE} jugadores para comparar sus colecciones.
            </p>

            {/* Chips de seleccionados */}
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)]">
                {selectedIds.map((id) => {
                  const p = allSelectablePlayers.find((pl) => pl.userId === id);
                  if (!p) return null;
                  return (
                    <span key={id} className="inline-flex items-center gap-1.5 pl-1.5 pr-1 py-1 rounded-full text-sm font-medium bg-[var(--color-primary)] text-white">
                      <PlayerAvatar displayName={p.displayName} avatar={p.avatar} size={5} />
                      {p.displayName}
                      {'isSelf' in p && p.isSelf && <span className="text-xs opacity-75">(tú)</span>}
                      <button onClick={() => togglePlayer(id)} className="ml-0.5 w-4 h-4 rounded-full hover:bg-white/20 flex items-center justify-center flex-shrink-0" aria-label="Quitar">×</button>
                    </span>
                  );
                })}
                <button
                  onClick={() => { compareMutation.mutate(selectedIds); }}
                  disabled={selectedIds.length < 2 || compareMutation.isPending}
                  className="ml-auto px-4 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  {compareMutation.isPending ? 'Comparando...' : `Comparar ${selectedIds.length} jugadores`}
                </button>
              </div>
            )}

            {/* Grid seleccionable */}
            {playersLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-16 bg-[var(--color-cardBorder)] animate-pulse rounded-xl" />)}
              </div>
            )}
            {!playersLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
                {allSelectablePlayers.map((player) => {
                  const selected = selectedIds.includes(player.userId);
                  const disabled = !selected && selectedIds.length >= MAX_COMPARE;
                  return (
                    <button
                      key={player.userId}
                      onClick={() => !disabled && togglePlayer(player.userId)}
                      disabled={disabled}
                      className={`flex items-center gap-3 p-3 rounded-xl border-2 text-left transition-colors w-full ${
                        selected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                          : disabled
                          ? 'border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] opacity-40 cursor-not-allowed'
                          : 'border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-tableRowHover)]'
                      }`}
                    >
                      <PlayerAvatar displayName={player.displayName} avatar={player.avatar} size={10} />
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--color-text)] truncate text-sm">
                          {player.displayName}
                          {'isSelf' in player && player.isSelf && <span className="ml-1 text-xs text-[var(--color-primary)]">tú</span>}
                        </p>
                        <p className="text-xs text-[var(--color-textSecondary)]">{player.gameCount} juegos</p>
                      </div>
                      {selected && (
                        <svg className="w-5 h-5 text-[var(--color-primary)] ml-auto flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Resultados de comparación */}
            {compareMutation.isError && (
              <p className="text-center text-red-500 py-8">Error al comparar. Inténtalo de nuevo.</p>
            )}

            {compareMutation.data && (() => {
              const { players: cPlayers, common, uniqueByPlayer } = compareMutation.data;
              return (
                <div className="space-y-8">
                  {/* Juegos en común */}
                  <div>
                    <h2 className="text-lg font-bold text-[var(--color-text)] mb-3">
                      Juegos en común
                      <span className="ml-2 text-sm font-normal text-[var(--color-textSecondary)]">({common.length})</span>
                    </h2>
                    {common.length === 0 ? (
                      <p className="text-[var(--color-textSecondary)] text-sm">No tenéis ningún juego en común.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {common.map((game) => <GameCard key={game.id} game={game} />)}
                      </div>
                    )}
                  </div>

                  {/* Juegos únicos por jugador */}
                  {cPlayers.map((cp) => {
                    const unique = uniqueByPlayer[cp.userId] ?? [];
                    return (
                      <div key={cp.userId}>
                        <div className="flex items-center gap-2 mb-3">
                          <PlayerAvatar displayName={cp.displayName} avatar={cp.avatar} size={7} />
                          <h2 className="text-lg font-bold text-[var(--color-text)]">
                            {cp.displayName}
                            {cp.isCurrentUser && <span className="ml-2 text-sm font-normal text-[var(--color-primary)]">tú</span>}
                          </h2>
                          <span className="text-sm text-[var(--color-textSecondary)]">— {unique.length} juego{unique.length !== 1 ? 's' : ''} único{unique.length !== 1 ? 's' : ''}</span>
                        </div>
                        {unique.length === 0 ? (
                          <p className="text-[var(--color-textSecondary)] text-sm">Todos sus juegos los tiene al menos otro del grupo.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {unique.map((game) => <GameCard key={game.id} game={game} />)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </Layout>
  );
}
