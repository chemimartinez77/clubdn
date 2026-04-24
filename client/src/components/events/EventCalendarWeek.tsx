// client/src/components/events/EventCalendarWeek.tsx
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventExpansions from './EventExpansions';
import GameDetailModal from '../games/GameDetailModal';
import type { Event } from '../../types/event';

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

interface EventCalendarWeekProps {
  events: Event[];
  currentMonth: Date;
}

export default function EventCalendarWeek({ events, currentMonth }: EventCalendarWeekProps) {
  const navigate = useNavigate();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedGameSource, setSelectedGameSource] = useState<'bgg' | 'rpggeek'>('bgg');

  const { weekDays, weekName } = useMemo(() => {
    const date = new Date(currentMonth);
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    const generatedWeekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      return day;
    });

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const normalizedWeekName = `${weekStart.getDate()} ${new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(weekStart)} - ${weekEnd.getDate()} ${new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }).format(weekEnd)}`;

    return { weekDays: generatedWeekDays, weekStart, weekName: normalizedWeekName };
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const grouped: Record<string, Event[]> = {};

    events.forEach(event => {
      const eventDate = new Date(event.date);
      const dateKey = eventDate.toDateString();

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  }, [events]);

  const openGameDetails = (gameId: string) => {
    setSelectedGameSource(gameId.startsWith('rpgg-') ? 'rpggeek' : 'bgg');
    setSelectedGameId(gameId.startsWith('rpgg-') ? gameId.replace('rpgg-', '') : gameId);
  };

  const renderDay = (day: Date) => {
    const dateKey = day.toDateString();
    const dayEvents = eventsByDay[dateKey] || [];
    const hasEvents = dayEvents.length > 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isToday = day.getTime() === today.getTime();
    const isPastDay = day < today;

    const dateString = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

    const handleDayClick = () => {
      if (!isPastDay) {
        navigate('/events/crear-partida', { state: { selectedDate: dateString } });
      }
    };

    return (
      <div
        key={dateKey}
        onClick={handleDayClick}
        className={`min-h-[200px] border border-[var(--color-cardBorder)] p-3 ${
          isToday ? 'bg-[var(--color-primary-50)] border-[var(--color-primary-300)]' : 'bg-[var(--color-cardBackground)]'
        } ${!isPastDay ? 'cursor-pointer hover:bg-[var(--color-tableRowHover)] transition-colors' : 'opacity-60'}`}
        title={isPastDay ? 'No se pueden crear partidas en días pasados' : 'Clic para organizar una partida'}
      >
        <div className="mb-2">
          <div className={`text-xs font-medium ${
            isToday ? 'text-[var(--color-primaryDark)]' : 'text-[var(--color-textSecondary)]'
          }`}>
            {new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(day)}
          </div>
          <div className={`text-lg font-bold ${
            isToday ? 'text-[var(--color-primaryDark)]' : 'text-[var(--color-text)]'
          }`}>
            {day.getDate()}
          </div>
        </div>

        {hasEvents && (
          <div className="space-y-2">
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

              return (
                <div
                  key={event.id}
                  onClick={(eventClick) => {
                    eventClick.stopPropagation();
                    navigate(`/events/${event.id}`);
                  }}
                  className={`block text-sm p-2 rounded cursor-pointer ${
                    isFull
                      ? 'bg-[var(--color-tableRowHover)] text-[var(--color-textSecondary)] hover:bg-[var(--color-cardBorder)]'
                      : 'bg-[var(--color-primary-100)] text-[var(--color-primary-900)] hover:bg-[var(--color-primary-200)]'
                  }`}
                >
                  <div className="font-medium truncate">{event.title}</div>
                  <div className="text-xs mt-1 flex items-center justify-between">
                    <span>{time}</span>
                    <span className={`font-medium ${isFull ? 'text-red-600' : 'text-green-700'}`}>
                      {registeredCount}/{event.maxAttendees}
                    </span>
                  </div>
                  <EventExpansions
                    expansions={event.expansions}
                    onOpenGame={openGameDetails}
                    stopPropagation
                    maxVisible={1}
                    variant="minimal"
                    className="mt-1"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className="bg-[var(--color-cardBackground)] rounded-lg border border-[var(--color-cardBorder)] p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-[var(--color-text)]">
            {weekName}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
          {weekDays.map(day => renderDay(day))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--color-textSecondary)]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[var(--color-primary-100)]"></div>
            <span>Con plazas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[var(--color-tableRowHover)]"></div>
            <span>Completo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[var(--color-primary-50)] border border-[var(--color-primary-300)]"></div>
            <span>Hoy</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-3 h-3 text-[var(--color-textSecondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
            </svg>
            <span>Clic en un día para organizar partida</span>
          </div>
        </div>
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
