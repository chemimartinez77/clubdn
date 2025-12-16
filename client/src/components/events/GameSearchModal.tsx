// client/src/components/events/GameSearchModal.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/axios';
import Button from '../ui/Button';
import type { BGGGame } from '../../types/event';
import type { ApiResponse } from '../../types/auth';

interface GameSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (game: BGGGame) => void;
}

export default function GameSearchModal({ isOpen, onClose, onSelect }: GameSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTrigger, setSearchTrigger] = useState('');

  const { data: games, isLoading, refetch } = useQuery({
    queryKey: ['bgg-search', searchTrigger],
    queryFn: async () => {
      if (!searchTrigger || searchTrigger.length < 2) return [];
      const response = await api.get<ApiResponse<{ games: BGGGame[] }>>(
        `/api/bgg/search?query=${encodeURIComponent(searchTrigger)}`
      );
      return response.data.data?.games || [];
    },
    enabled: false, // No ejecutar automáticamente
    staleTime: 5 * 60 * 1000 // 5 minutos
  });

  const handleSearchClick = () => {
    if (searchQuery.length >= 2) {
      setSearchTrigger(searchQuery);
      refetch();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  const handleSelectGame = (game: BGGGame) => {
    onSelect(game);
    setSearchQuery('');
    setSearchTrigger('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Buscar Juego</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe el nombre del juego..."
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                autoFocus
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
            <Button
              onClick={handleSearchClick}
              disabled={searchQuery.length < 2 || isLoading}
              variant="primary"
            >
              {isLoading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
                <p className="text-gray-600">Buscando juegos en BoardGameGeek...</p>
              </div>
            </div>
          ) : !searchTrigger ? (
            <div className="text-center py-12">
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
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <p className="text-gray-600">Escribe el nombre del juego y haz click en Buscar</p>
              <p className="text-gray-500 text-sm mt-2">O presiona Enter para buscar</p>
            </div>
          ) : games && games.length === 0 ? (
            <div className="text-center py-12">
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
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-600">No se encontraron juegos</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {games?.map((game) => (
                <button
                  key={game.id}
                  onClick={() => handleSelectGame(game)}
                  className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 hover:bg-[var(--color-primary-50)] hover:border-[var(--color-primary-300)] transition-colors text-left"
                >
                  {game.thumbnail ? (
                    <img
                      src={game.thumbnail}
                      alt={game.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{game.name}</h3>
                    {game.yearPublished && (
                      <p className="text-sm text-gray-600">{game.yearPublished}</p>
                    )}
                  </div>
                  <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <Button onClick={onClose} variant="outline" className="w-full">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}
