// client/src/components/events/EventCalendarDay.tsx
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GameImage } from './EventCard';
import type { Event } from '../../types/event';

interface EventCalendarDayProps {
  events: Event[];
  currentMonth: Date;
}

export default function EventCalendarDay({ events, currentMonth }: EventCalendarDayProps) {
  const navigate = useNavigate();

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

    // Filtrar eventos del día específico
    const dayEvents = events.filter(event => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getDate() === day.getDate() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getFullYear() === day.getFullYear()
      );
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const dateString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

    return { dayName, dayEvents, isPastDay, dateString };
  }, [events, currentMonth]);

  const handleCreateEvent = () => {
    if (!isPastDay) {
      navigate('/events/crear-partida', { state: { selectedDate: dateString } });
    }
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
    <div className="bg-[var(--color-cardBackground)] rounded-lg border border-[var(--color-cardBorder)] p-6">
      {/* Header */}
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

      {/* Events Timeline */}
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
            const time = new Intl.DateTimeFormat('es-ES', {
              hour: '2-digit',
              minute: '2-digit'
            }).format(eventDate);
            const registeredCount = event.registeredCount || 0;
            const isFull = registeredCount >= event.maxAttendees;
            const spotsLeft = event.maxAttendees - registeredCount;
            const gameThumbnail = event.game?.thumbnail || event.game?.image || event.gameImage || null;

            return (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="block border border-[var(--color-cardBorder)] rounded-lg p-4 hover:shadow-md transition-shadow bg-[var(--color-cardBackground)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {gameThumbnail && (
                        <GameImage
                          src={gameThumbnail}
                          alt={event.gameName || event.title}
                          size="md"
                        />
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

                    <div className="flex items-center gap-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                        isFull
                          ? 'bg-red-100 text-red-800'
                          : spotsLeft <= 2
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        {registeredCount}/{event.maxAttendees}
                        {!isFull && spotsLeft > 0 && (
                          <span className="text-xs">
                            ({spotsLeft} {spotsLeft === 1 ? 'plaza libre' : 'plazas libres'})
                          </span>
                        )}
                      </div>

                      {isFull && (
                        <span className="text-xs font-medium text-red-600">
                          COMPLETO
                        </span>
                      )}
                    </div>
                  </div>

                  <svg className="w-5 h-5 text-[var(--color-textSecondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Summary */}
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
  );
}

