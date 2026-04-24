// client/src/components/dashboard/UpcomingEventsCard.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { api } from '../../api/axios';
import { GameImage } from '../events/EventCard';
import EventExpansions from '../events/EventExpansions';
import GameDetailModal from '../games/GameDetailModal';
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

function calcLinkedStartTime(prev: NonNullable<EventDetail['linkedPreviousEvent']>): string | null {
  if (prev.startHour == null) return null;
  const startMinutes = prev.startHour * 60 + (prev.startMinute ?? 0);
  const durationMinutes = (prev.durationHours ?? 0) * 60 + (prev.durationMinutes ?? 0);
  if (durationMinutes <= 0) return null;

  const totalMinutes = startMinutes + durationMinutes;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export default function UpcomingEventsCard() {
  const navigate = useNavigate();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedGameSource, setSelectedGameSource] = useState<'bgg' | 'rpggeek'>('bgg');

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
    const estimatedStartTime = event.linkedPreviousEvent
      ? calcLinkedStartTime(event.linkedPreviousEvent)
      : null;
    const start = estimatedStartTime
      ? {
          hour: Number(estimatedStartTime.slice(0, 2)),
          minute: Number(estimatedStartTime.slice(3, 5)),
        }
      : getStartTime(event);
    if (!start) return '';

    const startText = formatTime(start.hour, start.minute);
    const durationMins = (event.durationHours ?? 0) * 60 + (event.durationMinutes ?? 0);
    if (durationMins <= 0) return startText;

    const startDate = new Date(event.date);
    startDate.setHours(start.hour, start.minute, 0, 0);
    const endDate = new Date(startDate.getTime() + durationMins * 60 * 1000);
    const endText = formatTime(endDate.getHours(), endDate.getMinutes());

    const schedule = `${startText}-${endText}${formatDuration(event.durationHours, event.durationMinutes)}`;
    return estimatedStartTime ? `Inicio estimado: ${schedule}` : schedule;
  };

  const formatCapacityText = (registeredCount?: number, maxAttendees?: number) => {
    if (!maxAttendees || maxAttendees <= 0) return null;

    const currentRegistered = registeredCount ?? 0;
    const spotsLeft = maxAttendees - currentRegistered;

    if (spotsLeft <= 0) {
      return `Asistentes: ${currentRegistered}/${maxAttendees} (COMPLETO)`;
    }

    return `Asistentes: ${currentRegistered}/${maxAttendees} (${spotsLeft} ${spotsLeft === 1 ? 'plaza libre' : 'plazas libres'})`;
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

  const openGameDetails = (gameId: string) => {
    setSelectedGameSource(gameId.startsWith('rpgg-') ? 'rpggeek' : 'bgg');
    setSelectedGameId(gameId.startsWith('rpgg-') ? gameId.replace('rpgg-', '') : gameId);
  };

  return (
    <>
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
                const capacityText = formatCapacityText(event.registeredCount, event.maxAttendees);
                const canOpenBaseGame = !!event.bggId;

                return (
                  <div
                    key={event.id}
                    className="p-3 border border-[var(--color-cardBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] transition-colors cursor-pointer hover:shadow-md"
                    onClick={() => navigate(`/events/${event.id}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 pt-0.5">
                        <div
                          role={canOpenBaseGame ? 'button' : undefined}
                          tabIndex={canOpenBaseGame ? 0 : -1}
                          onClick={(mouseEvent) => {
                            if (!event.bggId) return;
                            mouseEvent.stopPropagation();
                            openGameDetails(event.bggId);
                          }}
                          onKeyDown={(keyboardEvent) => {
                            if (!event.bggId) return;
                            if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                              keyboardEvent.preventDefault();
                              keyboardEvent.stopPropagation();
                              openGameDetails(event.bggId);
                            }
                          }}
                          className={canOpenBaseGame ? 'cursor-pointer rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]' : ''}
                        >
                          <GameImage
                            src={event.game?.image || event.game?.thumbnail || event.gameImage || null}
                            alt={event.gameName || event.title}
                            size="sm"
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1">
                            <h5
                              className={`font-semibold text-[var(--color-text)] truncate ${canOpenBaseGame ? 'cursor-pointer hover:underline' : ''}`}
                              onClick={(mouseEvent) => {
                                if (!event.bggId) return;
                                mouseEvent.stopPropagation();
                                openGameDetails(event.bggId);
                              }}
                            >
                              {event.title}
                            </h5>
                            <p className="text-sm text-[var(--color-textSecondary)]">{formatDate(event.date)}</p>
                            {scheduleText && (
                              <p className="text-sm text-[var(--color-textSecondary)]">
                                {scheduleText}
                              </p>
                            )}
                            {capacityText && (
                              <p className="text-sm text-[var(--color-textSecondary)]">
                                {capacityText}
                              </p>
                            )}
                          </div>
                          <span className={`shrink-0 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusClass(effectiveStatus)}`}>
                            {statusLabel(effectiveStatus)}
                          </span>
                        </div>
                        <EventExpansions
                          expansions={event.expansions}
                          onOpenGame={openGameDetails}
                          stopPropagation
                          maxVisible={2}
                          className="mt-2"
                        />
                      </div>
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

      <GameDetailModal
        gameId={selectedGameId}
        isOpen={selectedGameId !== null}
        onClose={() => setSelectedGameId(null)}
        source={selectedGameSource}
      />
    </>
  );
}
