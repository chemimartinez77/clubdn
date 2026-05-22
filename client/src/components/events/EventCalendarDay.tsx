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
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="mb-2 flex items-start gap-3">
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
                        <div className="min-w-0 flex-1">
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
                        className="mt-2"
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
            {(() => {
              const incomplete = dayEvents.filter(e => (e.registeredCount || 0) < e.maxAttendees && e.status !== 'CANCELLED' && e.status !== 'COMPLETED');
              if (incomplete.length === 0) return null;

              const totalPlayers = incomplete.reduce((sum, e) => sum + (e.registeredCount || 0), 0);
              const sizes = [...new Set(incomplete.map(e => e.maxAttendees))].sort((a, b) => b - a);

              // Busca la combinación de tamaños que coloca el máximo de jugadores
              // sin pasarse, dejando el mínimo posible sin colocar.
              function suggestGroups(total: number, available: number[]): { label: string; leftover: number } | null {
                if (total === 0 || available.length === 0) return null;
                type Best = { counts: Record<number, number>; placed: number };
                let best: Best | null = null;

                function search(idx: number, left: number, counts: Record<number, number>) {
                  const placed = total - left;
                  if (!best || placed > best.placed) best = { counts: { ...counts }, placed };
                  if (idx >= available.length || left <= 0) return;
                  const s = available[idx];
                  const max = Math.floor(left / s);
                  for (let n = max; n >= 0; n--) {
                    counts[s] = n;
                    search(idx + 1, left - n * s, counts);
                    delete counts[s];
                  }
                }

                search(0, total, {});
                if (!best || (best as Best).placed === 0) return null;

                const label = Object.entries((best as Best).counts)
                  .filter(([, n]) => (n as number) > 0)
                  .sort((a, b) => Number(b[0]) - Number(a[0]))
                  .map(([s, n]) => `${n} partida${Number(n) > 1 ? 's' : ''} de ${s}`)
                  .join(' + ');
                return { label, leftover: total - (best as Best).placed };
              }

              const suggestion = suggestGroups(totalPlayers, sizes);

              const buildText = () => {
                const lines: string[] = [`Partidas incompletas — ${dayName}`, ''];
                for (const e of incomplete) {
                  const registered = e.registeredCount || 0;
                  const free = e.maxAttendees - registered;
                  const name = e.gameName || e.title;
                  lines.push(`▸ ${name}: ${registered}/${e.maxAttendees} (${free} ${free === 1 ? 'libre' : 'libres'})`);
                }
                lines.push('');
                lines.push(`Total: ${totalPlayers} participante${totalPlayers !== 1 ? 's' : ''} en ${incomplete.length} partida${incomplete.length !== 1 ? 's' : ''}`);
                if (suggestion) {
                  lines.push('');
                  lines.push('Reagrupación posible:');
                  const leftoverNote = suggestion.leftover > 0 ? ` (sobra${suggestion.leftover > 1 ? 'n' : ''} ${suggestion.leftover})` : '';
                  lines.push(`• ${suggestion.label}${leftoverNote}`);
                }
                return lines.join('\n');
              };

              return (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(buildText())}`, '_blank')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Compartir incompletas ({incomplete.length})
                  </button>
                </div>
              );
            })()}
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
