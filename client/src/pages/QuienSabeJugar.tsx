import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import UserPopover from '../components/ui/UserPopover';
import { api } from '../api/axios';

interface GameSuggestion {
  id: string;
  name: string;
  yearPublished: number | null;
  thumbnail: string | null;
}

interface Expert {
  userId: string;
  displayName: string;
  avatar: string | null;
  ludotecaPublica: boolean;
  ownsGame: boolean;
  playCount: number;
  hasAttended: boolean;
}

interface ExpertResponse {
  game: GameSuggestion;
  players: Expert[];
}

function PlayerAvatar({ name, avatar }: { name: string; avatar: string | null }) {
  if (avatar) {
    return <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
      style={{ background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primaryDark))' }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function QuienSabeJugar() {
  const [inputValue, setInputValue] = useState('');
  const [debouncedInput, setDebouncedInput] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameSuggestion | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedInput(inputValue), 400);
    return () => clearTimeout(t);
  }, [inputValue]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: suggestions, isFetching: suggestionsLoading } = useQuery<GameSuggestion[]>({
    queryKey: ['gamesSuggest', debouncedInput],
    queryFn: () =>
      api.get('/api/games', { params: { search: debouncedInput, pageSize: 8 } }).then((r) => r.data.data.games),
    enabled: debouncedInput.length >= 2 && !selectedGame,
    staleTime: 2 * 60 * 1000,
  });

  const { data: expertData, isLoading: expertsLoading } = useQuery<ExpertResponse>({
    queryKey: ['quienSabeJugar', selectedGame?.id],
    queryFn: () =>
      api.get('/api/quien-sabe-jugar', { params: { gameId: selectedGame!.id } }).then((r) => r.data.data),
    enabled: !!selectedGame,
    staleTime: 3 * 60 * 1000,
  });

  function selectGame(game: GameSuggestion) {
    setSelectedGame(game);
    setInputValue(game.name);
    setShowSuggestions(false);
  }

  function resetSelection() {
    setSelectedGame(null);
    setInputValue('');
    setDebouncedInput('');
    setShowSuggestions(false);
  }

  const players = expertData?.players ?? [];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">¿Quién sabe jugar?</h1>
        <p className="text-sm text-[var(--color-textSecondary)] mb-6">
          Busca un juego del club y descubre qué miembros lo tienen en su colección o han jugado a él en alguna partida.
        </p>

        {/* Input + dropdown */}
        <div className="mb-6 relative" ref={containerRef}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              if (selectedGame) setSelectedGame(null);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Busca un juego del club..."
            className="w-full px-4 py-2 rounded-lg border border-[var(--color-inputBorder)] bg-[var(--color-inputBackground)] text-[var(--color-text)] placeholder-[var(--color-textSecondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            autoFocus
          />
          {inputValue.length > 0 && inputValue.length < 2 && (
            <p className="text-xs text-[var(--color-textSecondary)] mt-1">Escribe al menos 2 caracteres</p>
          )}

          {/* Dropdown de sugerencias */}
          {showSuggestions && !selectedGame && debouncedInput.length >= 2 && (
            <div className="absolute z-20 w-full mt-1 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] shadow-lg overflow-hidden">
              {suggestionsLoading && (
                <div className="px-4 py-3 text-sm text-[var(--color-textSecondary)]">Buscando...</div>
              )}
              {!suggestionsLoading && (!suggestions || suggestions.length === 0) && (
                <div className="px-4 py-3 text-sm text-[var(--color-textSecondary)]">
                  No hay juegos con ese nombre en el club.
                </div>
              )}
              {!suggestionsLoading &&
                suggestions &&
                suggestions.map((game) => (
                  <button
                    key={game.id}
                    type="button"
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--color-tableRowHover)] transition-colors text-left"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectGame(game);
                    }}
                  >
                    {game.thumbnail ? (
                      <img src={game.thumbnail} alt={game.name} className="w-10 h-10 object-contain flex-shrink-0 rounded" />
                    ) : (
                      <div className="w-10 h-10 bg-[var(--color-tableRowHover)] rounded flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">{game.name}</p>
                      {game.yearPublished && (
                        <p className="text-xs text-[var(--color-textSecondary)]">{game.yearPublished}</p>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Estado inicial */}
        {!selectedGame && debouncedInput.length < 2 && (
          <div className="text-center text-[var(--color-textSecondary)] py-16">
            <p className="text-4xl mb-3">🎲</p>
            <p>Busca un juego para ver quién lo conoce</p>
          </div>
        )}

        {/* Juego seleccionado: cabecera */}
        {selectedGame && (
          <>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] mb-4">
              {selectedGame.thumbnail ? (
                <img
                  src={selectedGame.thumbnail}
                  alt={selectedGame.name}
                  className="w-16 h-16 object-contain rounded flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 bg-[var(--color-tableRowHover)] rounded flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-lg text-[var(--color-text)] truncate">{selectedGame.name}</p>
                {selectedGame.yearPublished && (
                  <p className="text-sm text-[var(--color-textSecondary)]">{selectedGame.yearPublished}</p>
                )}
              </div>
              <button
                type="button"
                onClick={resetSelection}
                className="flex-shrink-0 text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)] border border-[var(--color-cardBorder)] rounded-lg px-3 py-1.5 transition-colors"
              >
                × Cambiar
              </button>
            </div>

            {/* Lista de jugadores */}
            {expertsLoading && (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-[var(--color-cardBorder)] animate-pulse rounded-xl" />
                ))}
              </div>
            )}

            {!expertsLoading && players.length === 0 && (
              <p className="text-center text-[var(--color-textSecondary)] py-12">
                Nadie en el club tiene o ha jugado a "{selectedGame.name}".
              </p>
            )}

            {!expertsLoading && players.length > 0 && (
              <>
                <p className="text-sm text-[var(--color-textSecondary)] mb-3">
                  {players.length} {players.length === 1 ? 'jugador conoce' : 'jugadores conocen'} este juego
                </p>
                <div className="space-y-2">
                  {players.map((player) => {
                    const inner = (
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] hover:bg-[var(--color-tableRowHover)] transition-colors">
                        <PlayerAvatar name={player.displayName} avatar={player.avatar} />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[var(--color-text)]">{player.displayName}</p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {player.ownsGame && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                Tiene el juego
                              </span>
                            )}
                            {player.playCount > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                {player.playCount} {player.playCount === 1 ? 'partida' : 'partidas'} en el club
                              </span>
                            )}
                            {player.hasAttended && player.playCount === 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-tableRowHover)] text-[var(--color-textSecondary)] border border-[var(--color-cardBorder)]">
                                Ha asistido a un evento
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );

                    return player.ludotecaPublica ? (
                      <UserPopover key={player.userId} userId={player.userId} name={player.displayName} avatar={player.avatar}>
                        <Link to={`/ludotecas-jugadores/${player.userId}`} className="block">
                          {inner}
                        </Link>
                      </UserPopover>
                    ) : (
                      <UserPopover key={player.userId} userId={player.userId} name={player.displayName} avatar={player.avatar}>
                        <div className="cursor-pointer">{inner}</div>
                      </UserPopover>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
