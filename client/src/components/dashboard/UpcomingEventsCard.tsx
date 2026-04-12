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
    },
    refetchInterval: 10 * 60 * 1000,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (hour: number | null, minute: number | null) => {
    if (hour === null) return '';
    const safeMinute = minute ?? 0;
    return `${hour}:${safeMinute.toString().padStart(2, '0')}`;
  };

  const getStartTime = (event: EventDetail) => {
    if (event.startHour !== null) {
      return { hour: event.startHour, minute: event.startMinute ?? 0 };
    }

    // Fallback: usar la hora embebida en `date` si no está en campos startHour/startMinute.
    const parsed = new Date(event.date);
    const fallbackHour = parsed.getHours();
    const fallbackMinute = parsed.getMinutes();
    if (fallbackHour === 0 && fallbackMinute === 0) return null;

    return { hour: fallbackHour, minute: fallbackMinute };
  };

  const formatDuration = (hours?: number | null, minutes?: number | null) => {
    const safeHours = hours ?? 0;
    const safeMinutes = minutes ?? 0;
    if (safeHours <= 0 && safeMinutes <= 0) return '';
    if (safeHours > 0 && safeMinutes > 0) return ` (${safeHours}h ${safeMinutes}min)`;
    if (safeHours > 0) return ` (${safeHours}h)`;
    return ` (${safeMinutes}min)`;
  };

  const formatTimeWithDuration = (event: EventDetail) => {
    const start = getStartTime(event);
    if (!start) return '';

    const startText = formatTime(start.hour, start.minute);
    const durationMins = (event.durationHours ?? 0) * 60 + (event.durationMinutes ?? 0);
    if (durationMins <= 0) return startText;

    const startDate = new Date(event.date);
    startDate.setHours(start.hour, start.minute, 0, 0);
    const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);
    const endText = formatTime(endDate.getHours(), endDate.getMinutes());

    return `${startText}-${endText}${formatDuration(event.durationHours, event.durationMinutes)}`;
  };

  const getEffectiveStatus = (event: EventDetail) => {
    if (event.status !== 'SCHEDULED') return event.status;
    const start = getStartTime(event);
    if (!start) return event.status;
    const now = new Date();
    const startDate = new Date(event.date);
    startDate.setHours(start.hour, start.minute, 0, 0);
    const durationMins = (event.durationHours ?? 0) * 60 + (event.durationMinutes ?? 0);
    const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);
    if (now >= startDate && now < endDate) return 'ONGOING';
    return event.status;
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
            {upcomingEvents.slice(0, 16).map((event) => {
              const scheduleText = formatTimeWithDuration(event);
              const effectiveStatus = getEffectiveStatus(event);

              return (
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
                        {scheduleText && (
                          <p className="text-sm text-[var(--color-textSecondary)]">
                            {scheduleText}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusClass(effectiveStatus)}`}>
                      {statusLabel(effectiveStatus)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-[var(--color-textSecondary)] py-4">No tienes próximos eventos programados</p>
        )}
      </CardContent>
    </Card>
  );
}
