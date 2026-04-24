// client/src/components/events/EventCalendarDay.tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameImage } from './EventCard';
import EventExpansions from './EventExpansions';
import GameDetailModal from '../games/GameDetailModal';
import type { Event } from '../../types/event';

const statusColors = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  ONGOING: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-[var(--color-tableRowHover)] text-[var(--color-text)]',
  CANCELLED: 'bg-red-100 text-red-800',
};
const statusLabels = {
  SCHEDULED: 'Programado',
  ONGOING: 'En curso',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
};

function getEffectiveStatus(event: { status: string; date: string; startHour?: number | null; startMinute?: number | null; durationHours?: number | null; durationMinutes?: number | null }): string {
  if (event.status === 'CANCELLED') return 'CANCELLED';
  if (event.status === 'COMPLETED') return 'COMPLETED';
  const now = new Date();
  const base = new Date(event.date);
  if (event.startHour != null) base.setHours(event.startHour, event.startMinute ?? 0, 0, 0);
  const durationMs = ((event.durationHours ?? 0) * 60 + (event.durationMinutes ?? 0)) * 60 * 1000;
  const end = new Date(base.getTime() + durationMs);
  if (now >= end) return 'COMPLETED';
  if (now >= base) return 'ONGOING';
  return 'SCHEDULED';
}

function calcLinkedStartTime(prev: NonNullable<Event['linkedPreviousEvent']>): string | null {
  if (prev.startHour == null) return null;
  const startMinutes = prev.startHour * 60 + (prev.startMinute ?? 0);
  const durationMinutes = (prev.durationHours ?? 0) * 60 + (prev.durationMinutes ?? 0);
  if (durationMinutes <= 0) return null;

  const totalMinutes = startMinutes + durationMinutes;
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

interface EventCalendarDayProps {
  events: Event[];
  currentMonth: Date;
}

export default function EventCalendarDay({ events, currentMonth }: EventCalendarDayProps) {
  const navigate = useNavigate();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedGameSource, setSelectedGameSource] = useState<'bgg' | 'rpggeek'>('bgg');

  const { dayName, dayEvents, isPastDay, dateString } = useMemo(() => {
    const day = new Date(currentMonth);
    day.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPastDay = day < today;

    const dayName = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(day);

    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === day.getDate() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getFullYear() === day.getFullYear()
      );
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const normalizedDateString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

    return { dayName, dayEvents, isPastDay, dateString: normalizedDateString };
  }, [events, currentMonth]);

  const handleCreateEvent = () => {
    if (!isPastDay) {
      navigate('/events/crear-partida', { state: { selectedDate: dateString } });
    }
  };

  const openGameDetails = (gameId: string) => {
    setSelectedGameSource(gameId.startsWith('rpgg-') ? 'rpggeek' : 'bgg');
    setSelectedGameId(gameId.startsWith('rpgg-') ? gameId.replace('rpgg-', '') : gameId);
  };

  const isToday = useMemo(() => {
    const today = new Date();
    return (
      currentMonth.getDate() === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear()
    );
  }, [currentMonth]);

  return (
    <>
      <div className="bg-[var(--color-cardBackground)] rounded-lg border border-[var(--color-cardBorder)] p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] capitalize">
              {dayName}
            </h3>
            {isToday && (
              <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-[var(--color-primary-100)] text-[var(--color-primary-800)] rounded">
                Hoy
              </span>
            )}
          </div>
          {!isPastDay && (
            <button
              onClick={handleCreateEvent}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primaryDark)] transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Organizar partida
            </button>
          )}
        </div>

        {dayEvents.length === 0 ? (
          <div className="text-center py-12">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h4 className="text-lg font-medium text-[var(--color-textSecondary)] mb-2">
              No hay eventos programados
            </h4>
            <p className="text-[var(--color-textSecondary)] text-sm">
              {isPastDay
                ? 'Este día ya ha pasado'
                : '¿Por qué no organizas una partida para este día?'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {dayEvents.map(event => {
              const eventDate = new Date(event.date);
              const defaultTime = new Intl.DateTimeFormat('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              }).format(eventDate);
              const estimatedTime = event.linkedPreviousEvent
                ? calcLinkedStartTime(event.linkedPreviousEvent)
                : null;
              const time = estimatedTime ? `Inicio estimado: ${estimatedTime}` : defaultTime;
              const registeredCount = event.registeredCount || 0;
              const isFull = registeredCount >= event.maxAttendees;
              const spotsLeft = event.maxAttendees - registeredCount;
              const gameThumbnail = event.game?.thumbnail || event.game?.image || event.gameImage || null;
              const effectiveStatus = getEffectiveStatus(event);
              const isScheduled = effectiveStatus === 'SCHEDULED';

              return (
                <div
                  key={event.id}
                  onClick={() => navigate(`/events/${event.id}`)}
                  className="block border border-[var(--color-cardBorder)] rounded-lg p-4 hover:shadow-md transition-shadow bg-[var(--color-cardBackground)] cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {gameThumbnail && (
                          <div
                            role={event.bggId ? 'button' : undefined}
                            tabIndex={event.bggId ? 0 : -1}
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
                            className={event.bggId ? 'cursor-pointer rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]' : ''}
                          >
                            <GameImage
                              src={gameThumbnail}
                              alt={event.gameName || event.title}
                              size="md"
                            />
                          </div>
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold text-[var(--color-text)] text-lg">{event.title}</h4>
                          <p className="text-sm text-[var(--color-textSecondary)]">{time}</p>
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2 mb-3">
                          {event.description}
                        </p>
                      )}

                      <EventExpansions
                        expansions={event.expansions}
                        onOpenGame={openGameDetails}
                        stopPropagation
                        maxVisible={2}
                      />

                      <div className="mt-3 flex items-center gap-3 flex-wrap">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-tableRowHover)] text-[var(--color-textSecondary)]">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          {registeredCount}/{event.maxAttendees}
                          {isScheduled && !isFull && spotsLeft > 0 && (
                            <span className="text-xs">
                              ({spotsLeft} {spotsLeft === 1 ? 'plaza libre' : 'plazas libres'})
                            </span>
                          )}
                          {isScheduled && isFull && (
                            <span className="text-xs font-medium text-red-600">· Completo</span>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[effectiveStatus as keyof typeof statusColors]}`}>
                          {statusLabels[effectiveStatus as keyof typeof statusLabels]}
                        </span>
                      </div>
                    </div>

                    <svg className="w-5 h-5 text-[var(--color-textSecondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {dayEvents.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[var(--color-cardBorder)]">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-textSecondary)]">
                Total de eventos: <span className="font-semibold text-[var(--color-text)]">{dayEvents.length}</span>
              </span>
              <span className="text-[var(--color-textSecondary)]">
                Plazas totales: <span className="font-semibold text-[var(--color-text)]">
                  {dayEvents.reduce((sum, e) => sum + (e.registeredCount || 0), 0)}/{dayEvents.reduce((sum, e) => sum + e.maxAttendees, 0)}
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      <GameDetailModal
        gameId={selectedGameId}
        isOpen={selectedGameId !== null}
        onClose={() => setSelectedGameId(null)}
        source={selectedGameSource}
      />
    </>
  );
}
