// client/src/components/dashboard/StatsCard.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../ui/Card';
import Modal from '../ui/Modal';
import { api } from '../../api/axios';
import { GameImage } from '../events/EventCard';
import type { UserStatsResponse, ClubStatsResponse, EventDetail } from '../../types/stats';

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'purple' | 'blue' | 'green' | 'yellow';
}

const colorClasses = {
  purple: 'bg-[var(--color-primary-100)] text-[var(--color-primary)]',
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  yellow: 'bg-yellow-100 text-yellow-600',
};

type ModalType = 'eventsAttended' | 'gamesPlayed' | 'upcomingEvents' | 'timeRange' | null;

export default function StatsCard() {
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const navigate = useNavigate();

  // Obtener estadísticas del usuario
  const { data: userStats, isLoading: isLoadingUser } = useQuery({
    queryKey: ['userStats'],
    queryFn: async () => {
      const response = await api.get<UserStatsResponse>('/api/stats/user');
      return response.data.data;
    }
  });

  // Obtener estadísticas del club
  const { data: clubStats, isLoading: isLoadingClub } = useQuery({
    queryKey: ['clubStats'],
    queryFn: async () => {
      const response = await api.get<ClubStatsResponse>('/api/stats/club');
      return response.data.data;
    }
  });

  // Obtener eventos asistidos (solo cuando se abre el modal)
  const { data: eventsAttended } = useQuery({
    queryKey: ['eventsAttended'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: EventDetail[] }>('/api/stats/user/events-attended');
      return response.data.data;
    },
    enabled: openModal === 'eventsAttended'
  });

  // Obtener partidas jugadas (solo cuando se abre el modal)
  const { data: gamesPlayed } = useQuery({
    queryKey: ['gamesPlayed'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: EventDetail[] }>('/api/stats/user/games-played');
      return response.data.data;
    },
    enabled: openModal === 'gamesPlayed'
  });

  // Obtener próximos eventos (solo cuando se abre el modal)
  const { data: upcomingEvents } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: EventDetail[] }>('/api/stats/user/upcoming-events');
      return response.data.data;
    },
    enabled: openModal === 'upcomingEvents'
  });

  // Obtener partidas jugadas para el modal de horario favorito (solo cuando se abre el modal)
  const { data: timeRangeGames } = useQuery({
    queryKey: ['timeRangeGames'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: EventDetail[] }>('/api/stats/user/games-played');
      return response.data.data;
    },
    enabled: openModal === 'timeRange'
  });

  const isLoading = isLoadingUser || isLoadingClub;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (hour: number | null, minute: number | null) => {
    if (hour === null || minute === null) return '';
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  // Estadísticas básicas en tarjetas
  const basicStats: StatItem[] = [
    {
      label: 'Eventos asistidos',
      value: userStats?.eventsAttended ?? '-',
      color: 'purple',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Partidas jugadas',
      value: userStats?.gamesPlayed ?? '-',
      color: 'blue',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      label: 'Horario favorito',
      value: userStats?.favoriteTimeRange ?? '-',
      color: 'green',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Próximos eventos',
      value: userStats?.upcomingEvents ?? '-',
      color: 'yellow',
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold text-[var(--color-text)]">Tus estadísticas</h3>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-[var(--color-text)]">Tus estadísticas</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Estadísticas básicas */}
          <div className="grid grid-cols-2 gap-4">
            {basicStats.map((stat, index) => {
              // Determinar si esta tarjeta debe ser clicable
              const isClickable = index === 0 || index === 1 || index === 2 || index === 3; // Todos clicables
              const onClick = isClickable ? () => {
                if (index === 0) setOpenModal('eventsAttended');
                else if (index === 1) setOpenModal('gamesPlayed');
                else if (index === 2) setOpenModal('timeRange');
                else if (index === 3) setOpenModal('upcomingEvents');
              } : undefined;

              return (
                <div
                  key={index}
                  onClick={onClick}
                  className={`flex items-start gap-3 p-4 rounded-lg border border-[var(--color-cardBorder)] hover:border-[var(--color-cardBorder)] transition-colors ${
                    isClickable ? 'cursor-pointer hover:shadow-md' : ''
                  }`}
                >
                  <div className={`p-2 rounded-lg ${colorClasses[stat.color]}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--color-text)]">{stat.value}</p>
                    <p className="text-sm text-[var(--color-textSecondary)]">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Juegos más jugados por el usuario */}
          {userStats && userStats.topGames.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-textSecondary)] mb-3">Tus juegos más jugados</h4>
              <div className="space-y-2">
                {userStats.topGames.map((game, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-tableRowHover)] rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-[var(--color-textSecondary)]">#{index + 1}</span>
                      <span className="text-sm font-medium text-[var(--color-text)]">{game.name}</span>
                    </div>
                    <span className="text-sm text-[var(--color-textSecondary)]">{game.count} {game.count === 1 ? 'partida' : 'partidas'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compañeros de juego frecuentes */}
          {userStats && userStats.topPlayers.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-textSecondary)] mb-3">Compañeros frecuentes</h4>
              <div className="space-y-2">
                {userStats.topPlayers.map((player, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[var(--color-tableRowHover)] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{player.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium text-[var(--color-text)]">{player.name}</span>
                    </div>
                    <span className="text-sm text-[var(--color-textSecondary)]">{player.count} {player.count === 1 ? 'partida' : 'partidas'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Días favoritos */}
          {userStats && userStats.topDays.length > 0 && userStats.topDays[0].count > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-textSecondary)] mb-3">Días que más juegas</h4>
              <div className="flex gap-2">
                {userStats.topDays.filter(d => d.count > 0).map((day, index) => (
                  <div key={index} className="flex-1 text-center p-3 bg-[var(--color-tableRowHover)] rounded-lg">
                    <p className="text-lg font-bold text-[var(--color-text)]">{day.count}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">{day.day}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Juegos más jugados en el club */}
          {clubStats && clubStats.topGames.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-textSecondary)] mb-3">Juegos más jugados en el club</h4>
              <div className="space-y-2">
                {clubStats.topGames.map((game, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-blue-400">#{index + 1}</span>
                      <span className="text-sm font-medium text-[var(--color-text)]">{game.name}</span>
                    </div>
                    <span className="text-sm text-blue-600">{game.count} {game.count === 1 ? 'partida' : 'partidas'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mensaje si no hay datos */}
          {(!userStats || (userStats.gamesPlayed === 0 && userStats.eventsAttended === 0)) && (
            <p className="text-xs text-[var(--color-textSecondary)] text-center mt-4">
              Aún no has participado en eventos. ¡Únete a una partida para ver tus estadísticas!
            </p>
          )}
        </div>
      </CardContent>

      {/* Modales */}
      <Modal
        isOpen={openModal === 'eventsAttended'}
        onClose={() => setOpenModal(null)}
        title="Eventos Asistidos"
        size="lg"
      >
        <div className="space-y-3">
          {eventsAttended && eventsAttended.length > 0 ? (
            eventsAttended.map((event) => (
              <div
                key={event.id}
                className="p-4 border border-[var(--color-cardBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] transition-colors cursor-pointer hover:shadow-md"
                onClick={() => {
                  setOpenModal(null);
                  navigate(`/events/${event.id}`);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-[var(--color-text)]">{event.title}</h4>
                    <p className="text-sm text-[var(--color-textSecondary)] mt-1">{event.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-textSecondary)]">
                      <span>📅 {formatDate(event.date)}</span>
                      {event.startHour !== null && (
                        <span>🕐 {formatTime(event.startHour, event.startMinute)}</span>
                      )}
                      <span>📍 {event.location}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <GameImage src={event.game?.image || event.game?.thumbnail || event.gameImage || null} alt={event.gameName || 'Evento'} size="sm" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-[var(--color-textSecondary)] py-8">No hay eventos asistidos</p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={openModal === 'gamesPlayed'}
        onClose={() => setOpenModal(null)}
        title="Partidas Jugadas"
        size="lg"
      >
        <div className="space-y-3">
          {gamesPlayed && gamesPlayed.length > 0 ? (
            gamesPlayed.map((game) => (
              <div
                key={game.id}
                className="p-4 border border-[var(--color-cardBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] transition-colors cursor-pointer hover:shadow-md"
                onClick={() => {
                  setOpenModal(null);
                  navigate(`/events/${game.id}`);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-[var(--color-text)]">{game.title}</h4>
                    {game.gameName && (
                      <p className="text-sm text-blue-600 mt-1">🎮 {game.gameName}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-textSecondary)]">
                      <span>📅 {formatDate(game.date)}</span>
                      {game.startHour !== null && (
                        <span>🕐 {formatTime(game.startHour, game.startMinute)}</span>
                      )}
                      <span>📍 {game.location}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <GameImage src={game.game?.image || game.game?.thumbnail || game.gameImage || null} alt={game.gameName || 'Juego'} size="sm" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-[var(--color-textSecondary)] py-8">No hay partidas jugadas</p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={openModal === 'upcomingEvents'}
        onClose={() => setOpenModal(null)}
        title="Próximos Eventos"
        size="lg"
      >
        <div className="space-y-3">
          {upcomingEvents && upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <div
                key={event.id}
                className="p-4 border border-[var(--color-cardBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] transition-colors cursor-pointer hover:shadow-md"
                onClick={() => {
                  setOpenModal(null);
                  navigate(`/events/${event.id}`);
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-[var(--color-text)]">{event.title}</h4>
                    <p className="text-sm text-[var(--color-textSecondary)] mt-1">{event.description}</p>
                    {event.gameName && (
                      <p className="text-sm text-blue-600 mt-1">🎮 {event.gameName}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-textSecondary)]">
                      <span>📅 {formatDate(event.date)}</span>
                      {event.startHour !== null && (
                        <span>🕐 {formatTime(event.startHour, event.startMinute)}</span>
                      )}
                      <span>📍 {event.location}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <GameImage src={event.game?.image || event.game?.thumbnail || event.gameImage || null} alt={event.gameName || 'Evento'} size="sm" />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-[var(--color-textSecondary)] py-8">No hay próximos eventos</p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={openModal === 'timeRange'}
        onClose={() => setOpenModal(null)}
        title="Partidas por Horario"
        size="lg"
      >
        <TimeRangeModalContent
          games={timeRangeGames || []}
          formatDate={formatDate}
          formatTime={formatTime}
          onEventClick={(eventId) => {
            setOpenModal(null);
            navigate(`/events/${eventId}`);
          }}
        />
      </Modal>
    </Card>
  );
}

// Componente para el contenido del modal de horario favorito
interface TimeRangeModalContentProps {
  games: EventDetail[];
  formatDate: (dateString: string) => string;
  formatTime: (hour: number | null, minute: number | null) => string;
  onEventClick: (eventId: string) => void;
}

function TimeRangeModalContent({ games, formatDate, formatTime, onEventClick }: TimeRangeModalContentProps) {
  const [sortBy, setSortBy] = useState<'date' | 'time'>('date');
  const [filterRange, setFilterRange] = useState<'all' | 'morning' | 'afternoon' | 'evening' | 'night'>('all');

  // Agrupar juegos por rango horario
  const getTimeRange = (hour: number | null): string => {
    if (hour === null) return 'Sin hora';
    if (hour >= 8 && hour < 12) return 'Mañana (8-12h)';
    if (hour >= 12 && hour < 18) return 'Tarde (12-18h)';
    if (hour >= 18 && hour < 24) return 'Noche (18-24h)';
    return 'Madrugada (0-8h)';
  };

  const getTimeRangeKey = (hour: number | null): 'morning' | 'afternoon' | 'evening' | 'night' | 'none' => {
    if (hour === null) return 'none';
    if (hour >= 8 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 24) return 'evening';
    return 'night';
  };

  // Filtrar por rango horario
  const filteredGames = filterRange === 'all'
    ? games
    : games.filter(game => getTimeRangeKey(game.startHour) === filterRange);

  // Ordenar
  const sortedGames = [...filteredGames].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    } else {
      // Ordenar por hora
      const hourA = a.startHour ?? 0;
      const hourB = b.startHour ?? 0;
      const minuteA = a.startMinute ?? 0;
      const minuteB = b.startMinute ?? 0;
      const timeA = hourA * 60 + minuteA;
      const timeB = hourB * 60 + minuteB;
      return timeA - timeB;
    }
  });

  // Agrupar por rango horario para mostrar
  const gamesByTimeRange = sortedGames.reduce((acc, game) => {
    const range = getTimeRange(game.startHour);
    if (!acc[range]) acc[range] = [];
    acc[range].push(game);
    return acc;
  }, {} as Record<string, EventDetail[]>);

  const timeRangeOrder = ['Mañana (8-12h)', 'Tarde (12-18h)', 'Noche (18-24h)', 'Madrugada (0-8h)', 'Sin hora'];

  return (
    <div className="space-y-4">
      {/* Filtros y ordenación */}
      <div className="flex flex-wrap gap-3 pb-4 border-b border-[var(--color-cardBorder)]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-textSecondary)]">Ordenar:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'time')}
            className="text-sm border border-[var(--color-inputBorder)] rounded px-2 py-1"
          >
            <option value="date">Por fecha</option>
            <option value="time">Por hora</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--color-textSecondary)]">Filtrar:</span>
          <select
            value={filterRange}
            onChange={(e) => setFilterRange(e.target.value as typeof filterRange)}
            className="text-sm border border-[var(--color-inputBorder)] rounded px-2 py-1"
          >
            <option value="all">Todos</option>
            <option value="morning">Mañana (8-12h)</option>
            <option value="afternoon">Tarde (12-18h)</option>
            <option value="evening">Noche (18-24h)</option>
            <option value="night">Madrugada (0-8h)</option>
          </select>
        </div>
      </div>

      {/* Lista de juegos agrupados por horario */}
      {sortedGames.length > 0 ? (
        <div className="space-y-4">
          {timeRangeOrder.map((rangeLabel) => {
            const gamesInRange = gamesByTimeRange[rangeLabel];
            if (!gamesInRange || gamesInRange.length === 0) return null;

            return (
              <div key={rangeLabel}>
                <h5 className="text-sm font-semibold text-[var(--color-textSecondary)] mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  {rangeLabel} <span className="text-[var(--color-textSecondary)] font-normal">({gamesInRange.length})</span>
                </h5>
                <div className="space-y-2">
                  {gamesInRange.map((game) => (
                    <div
                      key={game.id}
                      className="p-3 border border-[var(--color-cardBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] transition-colors cursor-pointer hover:shadow-md"
                      onClick={() => onEventClick(game.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h6 className="font-semibold text-[var(--color-text)] text-sm">{game.title}</h6>
                          {game.gameName && (
                            <p className="text-xs text-blue-600 mt-1">🎮 {game.gameName}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-textSecondary)]">
                            <span>📅 {formatDate(game.date)}</span>
                            {game.startHour !== null && (
                              <span className="font-semibold text-green-600">🕐 {formatTime(game.startHour, game.startMinute)}</span>
                            )}
                            <span>📍 {game.location}</span>
                          </div>
                        </div>
                        <div className="ml-3">
                          <GameImage src={game.game?.image || game.game?.thumbnail || game.gameImage || null} alt={game.gameName || 'Juego'} size="sm" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-center text-[var(--color-textSecondary)] py-8">No hay partidas en este rango horario</p>
      )}
    </div>
  );
}


