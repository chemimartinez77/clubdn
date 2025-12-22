// client/src/components/dashboard/StatsCard.tsx
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '../ui/Card';
import { api } from '../../api/axios';
import type { UserStatsResponse, ClubStatsResponse } from '../../types/stats';

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

export default function StatsCard() {
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

  const isLoading = isLoadingUser || isLoadingClub;

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
          <h3 className="text-lg font-semibold text-gray-900">Tus estadísticas</h3>
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
        <h3 className="text-lg font-semibold text-gray-900">Tus estadísticas</h3>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Estadísticas básicas */}
          <div className="grid grid-cols-2 gap-4">
            {basicStats.map((stat, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className={`p-2 rounded-lg ${colorClasses[stat.color]}`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Juegos más jugados por el usuario */}
          {userStats && userStats.topGames.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Tus juegos más jugados</h4>
              <div className="space-y-2">
                {userStats.topGames.map((game, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{game.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">{game.count} {game.count === 1 ? 'partida' : 'partidas'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compañeros de juego frecuentes */}
          {userStats && userStats.topPlayers.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Compañeros frecuentes</h4>
              <div className="space-y-2">
                {userStats.topPlayers.map((player, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold text-sm">{player.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{player.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">{player.count} {player.count === 1 ? 'partida' : 'partidas'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Días favoritos */}
          {userStats && userStats.topDays.length > 0 && userStats.topDays[0].count > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Días que más juegas</h4>
              <div className="flex gap-2">
                {userStats.topDays.filter(d => d.count > 0).map((day, index) => (
                  <div key={index} className="flex-1 text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-lg font-bold text-gray-900">{day.count}</p>
                    <p className="text-xs text-gray-600">{day.day}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Juegos más jugados en el club */}
          {clubStats && clubStats.topGames.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Juegos más jugados en el club</h4>
              <div className="space-y-2">
                {clubStats.topGames.map((game, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-blue-400">#{index + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{game.name}</span>
                    </div>
                    <span className="text-sm text-blue-600">{game.count} {game.count === 1 ? 'partida' : 'partidas'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mensaje si no hay datos */}
          {(!userStats || (userStats.gamesPlayed === 0 && userStats.eventsAttended === 0)) && (
            <p className="text-xs text-gray-500 text-center mt-4">
              Aún no has participado en eventos. ¡Únete a una partida para ver tus estadísticas!
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
