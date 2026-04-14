// client/src/pages/Games.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import GameDetailModal from '../components/games/GameDetailModal';
import { api } from '../api/axios';
import { useToast } from '../contexts/ToastContext';
import type { GamesResponse } from '../types/game';
import type { ApiResponse } from '../types/auth';

// ---------- tipos resultados ----------
interface EventResultEntry {
  id: string;
  userId: string | null;
  guestName: string | null;
  score: number | null;
  isWinner: boolean;
  notes: string | null;
  user: { id: string; name: string } | null;
  creator: { id: string; name: string };
}

interface ResultRow {
  userId: string;
  userName: string;
  score: string;
  isWinner: boolean;
  guestName: string;
  isGuest: boolean;
}

// ---------- modal de resultados ----------
function EventResultModal({
  eventId,
  eventTitle,
  onClose,
}: {
  eventId: string;
  eventTitle: string;
  onClose: () => void;
}) {
  const { success: toastSuccess, error: toastError } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<ResultRow[]>([
    { userId: '', userName: '', score: '', isWinner: false, guestName: '', isGuest: false },
  ]);

  const { data: existingResults, isLoading } = useQuery({
    queryKey: ['eventResults', eventId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<EventResultEntry[]>>(`/api/events/${eventId}/results`);
      return res.data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const results = rows
        .filter((r) => r.userName.trim() || r.guestName.trim())
        .map((r) => ({
          userId: r.isGuest ? undefined : (r.userId || undefined),
          guestName: r.isGuest ? r.guestName.trim() : undefined,
          score: r.score !== '' ? parseInt(r.score) : undefined,
          isWinner: r.isWinner,
        }));
      await api.put(`/api/events/${eventId}/results`, { results });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventResults', eventId] });
      setEditing(false);
      toastSuccess('Resultados guardados');
    },
    onError: () => toastError('Error al guardar los resultados'),
  });

  const addRow = () =>
    setRows((prev) => [...prev, { userId: '', userName: '', score: '', isWinner: false, guestName: '', isGuest: false }]);

  const updateRow = (i: number, field: keyof ResultRow, value: string | boolean) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));

  const startEditing = () => {
    if (existingResults && existingResults.length > 0) {
      setRows(
        existingResults.map((r) => ({
          userId: r.userId ?? '',
          userName: r.user?.name ?? '',
          score: r.score !== null ? String(r.score) : '',
          isWinner: r.isWinner,
          guestName: r.guestName ?? '',
          isGuest: !r.userId,
        }))
      );
    }
    setEditing(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-[var(--color-cardBackground)] rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-text)]">Resultados</h2>
            <p className="text-sm text-[var(--color-textSecondary)]">{eventTitle}</p>
          </div>
          <button onClick={onClose} className="text-[var(--color-textSecondary)] hover:text-[var(--color-text)] mt-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !editing && existingResults && existingResults.length > 0 ? (
          // Vista lectura
          <div className="space-y-2">
            {existingResults.map((r) => (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-tableRowHover)]">
                {r.isWinner && <span title="Ganador">🏆</span>}
                <span className="flex-1 text-sm text-[var(--color-text)] font-medium">
                  {r.user?.name ?? r.guestName ?? 'Invitado'}
                  {r.guestName && <span className="ml-1 text-xs text-[var(--color-textSecondary)]">(invitado)</span>}
                </span>
                {r.score !== null && (
                  <span className="text-sm text-[var(--color-textSecondary)] font-mono">{r.score} pts</span>
                )}
              </div>
            ))}
            <button
              onClick={startEditing}
              className="mt-2 text-sm text-[var(--color-primary)] hover:underline"
            >
              Editar resultados
            </button>
          </div>
        ) : !editing ? (
          // Sin resultados
          <div className="text-center py-4">
            <p className="text-sm text-[var(--color-textSecondary)] mb-3">No hay resultados registrados para esta partida.</p>
            <button
              onClick={startEditing}
              className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
            >
              Añadir resultados
            </button>
          </div>
        ) : (
          // Modo edición
          <div className="space-y-3">
            {rows.map((row, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2 p-2 border border-[var(--color-cardBorder)] rounded-lg">
                <label className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
                  <input
                    type="checkbox"
                    checked={row.isGuest}
                    onChange={(e) => updateRow(i, 'isGuest', e.target.checked)}
                  />
                  Invitado
                </label>
                {row.isGuest ? (
                  <input
                    type="text"
                    value={row.guestName}
                    onChange={(e) => updateRow(i, 'guestName', e.target.value)}
                    placeholder="Nombre del invitado"
                    className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-[var(--color-cardBorder)] rounded bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                  />
                ) : (
                  <input
                    type="text"
                    value={row.userName}
                    onChange={(e) => updateRow(i, 'userName', e.target.value)}
                    placeholder="Nombre del jugador"
                    className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-[var(--color-cardBorder)] rounded bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                  />
                )}
                <input
                  type="number"
                  value={row.score}
                  onChange={(e) => updateRow(i, 'score', e.target.value)}
                  placeholder="Puntos"
                  className="w-20 px-2 py-1 text-sm border border-[var(--color-cardBorder)] rounded bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                />
                <label className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
                  <input
                    type="checkbox"
                    checked={row.isWinner}
                    onChange={(e) => updateRow(i, 'isWinner', e.target.checked)}
                  />
                  Ganador
                </label>
                <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-600 text-xs">
                  Quitar
                </button>
              </div>
            ))}
            <button
              onClick={addRow}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              + Añadir jugador
            </button>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm border border-[var(--color-cardBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)]"
              >
                Cancelar
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
              >
                {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Games() {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(24);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<{ id: string; title: string } | null>(null);

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
          <h1 className="text-3xl font-bold text-[var(--color-text)]">Juegos jugados</h1>
          <p className="text-[var(--color-textSecondary)] mt-1">
            Explora los juegos que ya se han disputado o están en curso en el club
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
                  className="w-full px-4 py-2 pl-10 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
                <svg
                  className="w-5 h-5 text-[var(--color-textSecondary)] absolute left-3 top-1/2 transform -translate-y-1/2"
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

        {/* Stats Summary and BGG Logo */}
        <div className="flex items-center justify-between">
          {pagination && (
            <div className="text-sm text-[var(--color-textSecondary)]">
              Mostrando {games.length} de {pagination.totalGames} juegos jugados
            </div>
          )}
          <a
            href="https://boardgamegeek.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
          >
            <img
              src="/bgg.powered.webp"
              alt="Powered by BoardGameGeek"
              className="h-8"
            />
          </a>
        </div>

        {/* Games Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
              <p className="text-[var(--color-textSecondary)]">Cargando juegos...</p>
            </div>
          </div>
        ) : games.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <svg
                className="w-16 h-16 mx-auto text-[var(--color-textSecondary)] mb-4"
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
              <p className="text-[var(--color-textSecondary)] text-lg">
                {searchQuery
                  ? 'No se encontraron juegos con ese nombre'
                  : 'Aún no hay juegos disputados en el catálogo'}
              </p>
              <p className="text-[var(--color-textSecondary)] text-sm mt-2">
                {!searchQuery && 'Aquí solo aparecen juegos de partidas en curso, completadas o ya pasadas'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {games.map((game) => (
              <div
                key={game.id}
                className="group relative flex flex-col bg-[var(--color-cardBackground)] rounded-lg shadow hover:shadow-xl transition-all duration-200 overflow-hidden border border-[var(--color-cardBorder)] hover:border-[var(--color-primary)]"
              >
                <button
                  type="button"
                  onClick={() => setSelectedGameId(game.id)}
                  className="block cursor-pointer text-left"
                >
                  {/* Game Image */}
                  <div className="relative aspect-square">
                    {game.image ? (
                      <img
                        src={game.image}
                        alt={game.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-[var(--color-cardBorder)] flex items-center justify-center">
                        <svg className="w-12 h-12 text-[var(--color-textSecondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                          />
                        </svg>
                      </div>
                    )}

                    {game.rank && (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                        #{game.rank}
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-[var(--color-text)] line-clamp-2 mb-2 text-left">
                      {game.name}
                    </h3>

                    <div className="flex items-center justify-between text-xs text-[var(--color-textSecondary)]">
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

                    <div className="flex items-center justify-between text-xs text-[var(--color-textSecondary)] mt-2">
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

                    {game.complexityRating && (
                      <div className="mt-2">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded ${
                                level <= Math.round(game.complexityRating!)
                                  ? 'bg-[var(--color-primary)]'
                                  : 'bg-[var(--color-cardBorder)]'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </button>

                <div className="mt-auto px-3 pb-3 flex items-center gap-2 flex-wrap">
                  {game.latestEvent ? (
                    <>
                      <Link
                        to={`/events/${game.latestEvent.id}`}
                        className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                      >
                        Ver partida
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSelectedEvent({ id: game.latestEvent!.id, title: game.latestEvent!.title })}
                        className="text-xs text-[var(--color-textSecondary)] hover:text-[var(--color-text)] border border-[var(--color-cardBorder)] rounded px-1.5 py-0.5"
                      >
                        Resultados
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-[var(--color-textSecondary)]">
                      Sin partida enlazada
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginación */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] disabled:opacity-50 disabled:cursor-not-allowed"
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
                        : 'border border-[var(--color-inputBorder)] hover:bg-[var(--color-tableRowHover)]'
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
              className="px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Event Results Modal */}
      {selectedEvent && (
        <EventResultModal
          eventId={selectedEvent.id}
          eventTitle={selectedEvent.title}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </Layout>
  );
}

