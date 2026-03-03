// client/src/components/dashboard/UpcomingEventsCard.tsx
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { api } from '../../api/axios';
import { GameImage } from '../events/EventCard';
import type { EventDetail } from '../../types/stats';

const statusLabel = (status: string) => {
  if (status === 'SCHEDULED') return 'Programado';
  if (status === 'ONGOING') return 'En curso';
  if (status === 'COMPLETED') return 'Completado';
  if (status === 'CANCELLED') return 'Cancelado';
  return status;
};

const statusClass = (status: string) => {
  if (status === 'SCHEDULED') return 'bg-blue-100 text-blue-700';
  if (status === 'ONGOING') return 'bg-amber-100 text-amber-700';
  if (status === 'COMPLETED') return 'bg-green-100 text-green-700';
  if (status === 'CANCELLED') return 'bg-red-100 text-red-700';
  return 'bg-[var(--color-tableRowHover)] text-[var(--color-textSecondary)]';
};

export default function UpcomingEventsCard() {
  const navigate = useNavigate();

  const { data: upcomingEvents, isLoading } = useQuery({
    queryKey: ['upcomingEvents'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: EventDetail[] }>('/api/stats/user/upcoming-events');
      return response.data.data;
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (hour: number | null, minute: number | null) => {
    if (hour === null || minute === null) return '';
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  return (
    <Card id="dashboard-upcoming-events">
      <CardHeader>
        <h3 className="text-lg font-semibold text-[var(--color-text)]">Tus próximas partidas y eventos</h3>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
          </div>
        ) : upcomingEvents && upcomingEvents.length > 0 ? (
          <div className="space-y-2">
            {upcomingEvents.slice(0, 4).map((event) => (
              <div
                key={event.id}
                className="p-3 border border-[var(--color-cardBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] transition-colors cursor-pointer hover:shadow-md"
                onClick={() => navigate(`/events/${event.id}`)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="shrink-0">
                    <GameImage
                      src={event.game?.image || event.game?.thumbnail || event.gameImage || null}
                      alt={event.gameName || event.title}
                      size="sm"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-semibold text-[var(--color-text)] truncate">{event.title}</h5>
                    <div className="mt-1">
                      <p className="text-sm text-[var(--color-textSecondary)]">{formatDate(event.date)}</p>
                      {event.startHour !== null && (
                        <p className="text-sm text-[var(--color-textSecondary)]">
                          {formatTime(event.startHour, event.startMinute)}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusClass(event.status)}`}>
                    {statusLabel(event.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-[var(--color-textSecondary)] py-4">No tienes próximos eventos programados</p>
        )}
      </CardContent>
    </Card>
  );
}
