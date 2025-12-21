// client/src/components/games/GameDetailModal.tsx
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/axios';
import type { Game } from '../../types/game';
import type { ApiResponse } from '../../types/auth';
import Button from '../ui/Button';

interface GameDetailModalProps {
  gameId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function GameDetailModal({ gameId, isOpen, onClose }: GameDetailModalProps) {
  const { data: game, isLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: async () => {
      if (!gameId) return null;
      const response = await api.get<ApiResponse<Game>>(`/api/games/${gameId}`);
      return response.data.data;
    },
    enabled: !!gameId && isOpen,
    staleTime: 10 * 60 * 1000 // 10 minutos
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-900">{game?.name || 'Cargando...'}</h2>
            {game?.yearPublished && (
              <p className="text-gray-600 mt-1">Año de publicación: {game.yearPublished}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 ml-4"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
            </div>
          ) : game ? (
            <div className="space-y-6">
              {/* Imagen y Stats principales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Imagen */}
                <div className="md:col-span-1">
                  {game.image ? (
                    <img
                      src={game.image}
                      alt={game.name}
                      className="w-full rounded-lg shadow-lg"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                      <svg className="w-24 h-24 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  )}

                  {/* Logo BGG */}
                  <div className="mt-4 text-center text-xs text-gray-500">
                    <a
                      href={`https://boardgamegeek.com/boardgame/${game.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-[var(--color-primary)]"
                    >
                      Powered by BoardGameGeek
                    </a>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  {/* Jugadores */}
                  {(game.minPlayers || game.maxPlayers) && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Jugadores</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {game.minPlayers === game.maxPlayers
                          ? game.minPlayers
                          : `${game.minPlayers}-${game.maxPlayers}`}
                      </div>
                    </div>
                  )}

                  {/* Tiempo */}
                  {game.playingTime && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Tiempo de juego</div>
                      <div className="text-2xl font-bold text-gray-900">{game.playingTime} min</div>
                      {game.minPlaytime !== game.maxPlaytime && (
                        <div className="text-xs text-gray-500">
                          {game.minPlaytime}-{game.maxPlaytime} min
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edad */}
                  {game.minAge && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Edad mínima</div>
                      <div className="text-2xl font-bold text-gray-900">{game.minAge}+</div>
                    </div>
                  )}

                  {/* Complejidad */}
                  {game.complexityRating && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Complejidad</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {game.complexityRating.toFixed(2)}/5
                      </div>
                    </div>
                  )}

                  {/* Rating */}
                  {game.averageRating && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Rating BGG</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {game.averageRating.toFixed(2)}/10
                      </div>
                      {game.usersRated && (
                        <div className="text-xs text-gray-500">
                          {game.usersRated.toLocaleString()} votos
                        </div>
                      )}
                    </div>
                  )}

                  {/* Rank */}
                  {game.rank && (
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-600">Ranking BGG</div>
                      <div className="text-2xl font-bold text-gray-900">#{game.rank}</div>
                      {game.strategyRank && (
                        <div className="text-xs text-gray-500">
                          Estrategia: #{game.strategyRank}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Descripción */}
              {game.description && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h3>
                  <div
                    className="text-gray-700 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: game.description }}
                  />
                </div>
              )}

              {/* Diseñadores */}
              {game.designers.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Diseñadores</h3>
                  <div className="flex flex-wrap gap-2">
                    {game.designers.map((designer, idx) => (
                      <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                        {designer}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Artistas */}
              {game.artists.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Artistas</h3>
                  <div className="flex flex-wrap gap-2">
                    {game.artists.map((artist, idx) => (
                      <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                        {artist}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Categorías */}
              {game.categories.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Categorías</h3>
                  <div className="flex flex-wrap gap-2">
                    {game.categories.map((category, idx) => (
                      <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Mecánicas */}
              {game.mechanics.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Mecánicas</h3>
                  <div className="flex flex-wrap gap-2">
                    {game.mechanics.map((mechanic, idx) => (
                      <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                        {mechanic}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Publishers */}
              {game.publishers.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Editoriales</h3>
                  <div className="flex flex-wrap gap-2">
                    {game.publishers.slice(0, 10).map((publisher, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                        {publisher}
                      </span>
                    ))}
                    {game.publishers.length > 10 && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                        +{game.publishers.length - 10} más
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Estadísticas de comunidad */}
              {(game.numOwned || game.numWanting || game.numWishing) && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Estadísticas de Comunidad</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {game.numOwned && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {game.numOwned.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Lo tienen</div>
                      </div>
                    )}
                    {game.numWanting && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {game.numWanting.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">Lo quieren</div>
                      </div>
                    )}
                    {game.numWishing && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {game.numWishing.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">En wishlist</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600">
              No se pudo cargar la información del juego
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <Button onClick={onClose} variant="primary" className="w-full">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
