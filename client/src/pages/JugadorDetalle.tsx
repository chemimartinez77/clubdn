import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { api } from '../api/axios';

interface PlayerInfo {
  userId: string;
  displayName: string;
  avatar: string | null;
  gameCount: number;
}

interface GameEntry {
  gameId: string;
  game: {
    id: string;
    name: string;
    yearPublished: number | null;
    thumbnail: string | null;
  };
}

interface Pagination {
  currentPage: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface PlayerGamesResponse {
  player: PlayerInfo;
  games: GameEntry[];
  pagination: Pagination;
}

function Paginador({
  pagination,
  page,
  setPage,
}: {
  pagination: Pagination | undefined;
  page: number;
  setPage: React.Dispatch<React.SetStateAction<number>>;
}) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-4">
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
  );
}

export default function JugadorDetalle() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
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

  const { data, isLoading, isError } = useQuery<PlayerGamesResponse>({
    queryKey: ['jugadorGames', userId, search, page],
    queryFn: () =>
      api
        .get(`/api/jugadores-ludoteca/${userId}/games`, {
          params: { search, page, pageSize: 48 },
        })
        .then((r) => r.data.data),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
  });

  const player = data?.player;
  const games = data?.games ?? [];
  const pagination = data?.pagination;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Cabecera */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)] transition-colors"
            aria-label="Volver"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {isLoading ? (
            <div className="h-8 w-48 bg-[var(--color-cardBorder)] animate-pulse rounded" />
          ) : player ? (
            <div className="flex items-center gap-3">
              {player.avatar ? (
                <img
                  src={player.avatar}
                  alt={player.displayName}
                  className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primaryDark))' }}
                >
                  {player.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-[var(--color-text)]">{player.displayName}</h1>
                <p className="text-sm text-[var(--color-textSecondary)]">{player.gameCount} juegos en su colección</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar en su colección..."
            className="w-full md:w-80 px-4 py-2 rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] text-[var(--color-text)] placeholder-[var(--color-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        {/* Estado de carga / error */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 bg-[var(--color-cardBorder)] animate-pulse rounded-xl" />
            ))}
          </div>
        )}

        {isError && (
          <p className="text-center text-red-500 py-12">Error al cargar la colección. Inténtalo de nuevo.</p>
        )}

        {/* Resultados */}
        {!isLoading && !isError && (
          <>
            {games.length === 0 ? (
              <p className="text-center text-[var(--color-textSecondary)] py-12">
                {search ? 'No se encontraron juegos con ese nombre.' : 'Este jugador no tiene juegos en su colección.'}
              </p>
            ) : (
              <>
                <Paginador pagination={pagination} page={page} setPage={setPage} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
                  {games.map(({ gameId, game }) => (
                    <div
                      key={gameId}
                      className="flex gap-4 p-4 rounded-xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)]"
                    >
                      {game.thumbnail ? (
                        <img
                          src={game.thumbnail}
                          alt={game.name}
                          className="w-24 h-24 rounded object-contain flex-shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded bg-[var(--color-tableRowHover)] flex items-center justify-center flex-shrink-0 text-4xl">
                          🎲
                        </div>
                      )}
                      <div className="min-w-0 flex flex-col justify-center">
                        <p className="font-semibold text-[var(--color-text)] leading-tight line-clamp-3">{game.name}</p>
                        {game.yearPublished && (
                          <p className="text-xs text-[var(--color-textSecondary)] mt-1">{game.yearPublished}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Paginador pagination={pagination} page={page} setPage={setPage} />
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
