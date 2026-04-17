import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import UserPopover from '../components/ui/UserPopover';
import { api } from '../api/axios';

interface Player {
  userId: string;
  displayName: string;
  avatar: string | null;
  gameCount: number;
}

interface GameResult {
  gameId: string;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
  ownerCount: number;
  owners: Array<{ userId: string; displayName: string; avatar: string | null }>;
}

interface SearchResponse {
  results: GameResult[];
  pagination: { currentPage: number; pageSize: number; total: number; totalPages: number };
}

type Tab = 'players' | 'search';

function PlayerAvatar({ player }: { player: Player }) {
  if (player.avatar) {
    return (
      <img
        src={player.avatar}
        alt={player.displayName}
        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
      style={{ background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primaryDark))' }}
    >
      {player.displayName.charAt(0).toUpperCase()}
    </div>
  );
}

export default function JugadoresLudoteca() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as Tab) ?? 'players';

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const setTab = (t: Tab) => {
    setSearchParams({ tab: t });
  };

  // Query: lista de jugadores
  const { data: playersData, isLoading: playersLoading } = useQuery<{ players: Player[] }>({
    queryKey: ['jugadores'],
    queryFn: () => api.get('/api/jugadores-ludoteca').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
    enabled: tab === 'players',
  });

  // Query: búsqueda global
  const { data: searchData, isLoading: searchLoading } = useQuery<SearchResponse>({
    queryKey: ['jugadoresSearch', search, page],
    queryFn: () =>
      api
        .get('/api/jugadores-ludoteca/search', { params: { q: search, page, pageSize: 20 } })
        .then((r) => r.data.data),
    enabled: tab === 'search' && search.length >= 2,
    staleTime: 2 * 60 * 1000,
  });

  const players = playersData?.players ?? [];
  const searchResults = searchData?.results ?? [];
  const pagination = searchData?.pagination;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Título y tabs */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-text)] mb-4">Ludotecas de jugadores</h1>
          <div className="flex gap-1 bg-[var(--color-tableRowHover)] rounded-lg p-1 w-fit">
            <button
              onClick={() => setTab('players')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'players'
                  ? 'bg-[var(--color-cardBackground)] text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
              }`}
            >
              Lista de jugadores
            </button>
            <button
              onClick={() => setTab('search')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                tab === 'search'
                  ? 'bg-[var(--color-cardBackground)] text-[var(--color-text)] shadow-sm'
                  : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
              }`}
            >
              Buscar juego
            </button>
          </div>
        </div>

        {/* Tab: Lista de jugadores */}
        {tab === 'players' && (
          <>
            {playersLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-20 bg-[var(--color-cardBorder)] animate-pulse rounded-xl" />
                ))}
              </div>
            )}

            {!playersLoading && players.length === 0 && (
              <p className="text-center text-[var(--color-textSecondary)] py-12">
                Ningún jugador tiene juegos en su ludoteca todavía.
              </p>
            )}

            {!playersLoading && players.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {players.map((player) => (
                  <Link
                    key={player.userId}
                    to={`/ludotecas-jugadores/${player.userId}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] hover:bg-[var(--color-tableRowHover)] transition-colors"
                  >
                    <PlayerAvatar player={player} />
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--color-text)] truncate">{player.displayName}</p>
                      <p className="text-sm text-[var(--color-textSecondary)]">{player.gameCount} juegos</p>
                    </div>
                    <svg
                      className="w-4 h-4 text-[var(--color-textSecondary)] ml-auto flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {/* Tab: Buscar juego */}
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
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-24 bg-[var(--color-cardBorder)] animate-pulse rounded-xl" />
                ))}
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
                    <div
                      key={result.gameId}
                      className="flex gap-4 p-4 rounded-xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)]"
                    >
                      {result.thumbnail ? (
                        <img
                          src={result.thumbnail}
                          alt={result.name}
                          className="w-16 h-16 rounded object-contain flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded bg-[var(--color-tableRowHover)] flex items-center justify-center flex-shrink-0 text-2xl">
                          🎲
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[var(--color-text)]">
                          {result.name}
                          {result.yearPublished && (
                            <span className="text-[var(--color-textSecondary)] font-normal text-sm ml-2">
                              ({result.yearPublished})
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 mb-2">
                          <p className="text-xs text-[var(--color-textSecondary)]">
                            Lo tienen {result.ownerCount} {result.ownerCount === 1 ? 'jugador' : 'jugadores'}
                          </p>
                          <a
                            href={`https://boardgamegeek.com/boardgame/${result.gameId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--color-primary)] hover:underline"
                          >
                            Ver en BGG
                          </a>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {result.owners.map((owner) => (
                            <UserPopover
                              key={owner.userId}
                              userId={owner.userId}
                              name={owner.displayName}
                              avatar={owner.avatar}
                            >
                              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-[var(--color-tableRowHover)] text-[var(--color-text)] border border-[var(--color-cardBorder)]">
                                {owner.avatar ? (
                                  <img
                                    src={owner.avatar}
                                    alt={owner.displayName}
                                    className="w-4 h-4 rounded-full object-cover"
                                  />
                                ) : (
                                  <span
                                    className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                                    style={{ background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primaryDark))' }}
                                  >
                                    {owner.displayName.charAt(0).toUpperCase()}
                                  </span>
                                )}
                                {owner.displayName}
                              </span>
                            </UserPopover>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginación */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <button
                      onClick={() => setPage((p) => p - 1)}
                      disabled={page <= 1}
                      className="px-4 py-2 rounded-lg border border-[var(--color-cardBorder)] text-sm font-medium text-[var(--color-text)] disabled:opacity-40 hover:bg-[var(--color-tableRowHover)] transition-colors"
                    >
                      Anterior
                    </button>
                    <span className="text-sm text-[var(--color-textSecondary)]">
                      Página {pagination.currentPage} de {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= pagination.totalPages}
                      className="px-4 py-2 rounded-lg border border-[var(--color-cardBorder)] text-sm font-medium text-[var(--color-text)] disabled:opacity-40 hover:bg-[var(--color-tableRowHover)] transition-colors"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
