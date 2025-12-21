// client/src/pages/Games.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import GameDetailModal from '../components/games/GameDetailModal';
import { api } from '../api/axios';
import type { GamesResponse } from '../types/game';
import type { ApiResponse } from '../types/auth';

export default function Games() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['games', page, pageSize, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(searchQuery && { search: searchQuery })
      });
      const response = await api.get<ApiResponse<GamesResponse>>(
        `/api/games?${params.toString()}`
      );
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000 // 5 minutos
  });

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
  };

  const games = data?.games || [];
  const pagination = data?.pagination;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Juegos Jugados</h1>
          <p className="text-gray-600 mt-1">
            Explora todos los juegos que se han buscado en el club
          </p>
        </div>

        {/* Filtros y Búsqueda */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre del juego..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
                <svg
                  className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <button
                type="submit"
                className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primaryDark)] transition-colors"
              >
                Buscar
              </button>
            </form>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        {pagination && (
          <div className="text-sm text-gray-600">
            Mostrando {games.length} de {pagination.totalGames} juegos
          </div>
        )}

        {/* Games Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando juegos...</p>
            </div>
          </div>
        ) : games.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="text-gray-600 text-lg">
                {searchQuery
                  ? 'No se encontraron juegos con ese nombre'
                  : 'Aún no hay juegos en la base de datos'}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {!searchQuery && 'Los juegos se añaden automáticamente cuando se crean partidas'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {games.map((game) => (
              <button
                key={game.id}
                onClick={() => setSelectedGameId(game.id)}
                className="group relative bg-white rounded-lg shadow hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-200 hover:border-[var(--color-primary)] cursor-pointer"
              >
                {/* Thumbnail con overlay */}
                <div className="relative aspect-square">
                  {game.thumbnail ? (
                    <img
                      src={game.thumbnail}
                      alt={game.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                      <svg className="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                  )}

                  {/* Ranking badge */}
                  {game.rank && (
                    <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                      #{game.rank}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <h3 className="font-semibold text-sm text-gray-900 line-clamp-2 mb-2 text-left">
                    {game.name}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-gray-600">
                    {game.yearPublished && (
                      <span>{game.yearPublished}</span>
                    )}
                    {game.averageRating && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-yellow-500 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                        <span>{game.averageRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {/* Players and Time */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                    {(game.minPlayers || game.maxPlayers) && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        <span>
                          {game.minPlayers === game.maxPlayers
                            ? game.minPlayers
                            : `${game.minPlayers}-${game.maxPlayers}`}
                        </span>
                      </div>
                    )}
                    {game.playingTime && (
                      <div className="flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{game.playingTime}'</span>
                      </div>
                    )}
                  </div>

                  {/* Complexity */}
                  {game.complexityRating && (
                    <div className="mt-2">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded ${
                              level <= Math.round(game.complexityRating!)
                                ? 'bg-[var(--color-primary)]'
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Paginación */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={i}
                    onClick={() => setPage(pageNum)}
                    className={`w-10 h-10 rounded-lg ${
                      page === pageNum
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
              disabled={page === pagination.totalPages}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* Game Detail Modal */}
      <GameDetailModal
        gameId={selectedGameId}
        isOpen={!!selectedGameId}
        onClose={() => setSelectedGameId(null)}
      />
    </Layout>
  );
}
