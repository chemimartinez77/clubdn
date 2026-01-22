// client/src/components/events/EventCalendarWeek.tsx
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Event } from '../../types/event';

interface EventCalendarWeekProps {
  events: Event[];
  currentMonth: Date;
}

export default function EventCalendarWeek({ events, currentMonth }: EventCalendarWeekProps) {
  const navigate = useNavigate();

  const { weekDays, weekName } = useMemo(() => {
    // Obtener el inicio de la semana (lunes) que contiene currentMonth
    const date = new Date(currentMonth);
    const dayOfWeek = date.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Ajustar para que lunes sea inicio
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);

    // Generar 7 días de la semana
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      return day;
    });

    // Nombre de la semana
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekName = `${weekStart.getDate()} ${new Intl.DateTimeFormat('es-ES', { month: 'short' }).format(weekStart)} - ${weekEnd.getDate()} ${new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }).format(weekEnd)}`;

    return { weekDays, weekStart, weekName };
  }, [currentMonth]);

  // Agrupar eventos por día
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
        className={`min-h-[200px] border border-gray-200 p-3 ${
          isToday ? 'bg-[var(--color-primary-50)] border-[var(--color-primary-300)]' : 'bg-white'
        } ${!isPastDay ? 'cursor-pointer hover:bg-gray-50 transition-colors' : 'opacity-60'}`}
        title={isPastDay ? 'No se pueden crear partidas en días pasados' : 'Clic para organizar una partida'}
      >
        <div className="mb-2">
          <div className={`text-xs font-medium ${
            isToday ? 'text-[var(--color-primaryDark)]' : 'text-gray-500'
          }`}>
            {new Intl.DateTimeFormat('es-ES', { weekday: 'short' }).format(day)}
          </div>
          <div className={`text-lg font-bold ${
            isToday ? 'text-[var(--color-primaryDark)]' : 'text-gray-900'
          }`}>
            {day.getDate()}
          </div>
        </div>

        {hasEvents && (
          <div className="space-y-2">
            {dayEvents.map(event => {
              const eventDate = new Date(event.date);
              const time = new Intl.DateTimeFormat('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              }).format(eventDate);
              const registeredCount = event.registeredCount || 0;
              const isFull = registeredCount >= event.maxAttendees;

              return (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className={`block text-sm p-2 rounded ${
                    isFull
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {weekName}
        </h3>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2">
        {weekDays.map(day => renderDay(day))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[var(--color-primary-100)]"></div>
          <span>Con plazas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-100"></div>
          <span>Completo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[var(--color-primary-50)] border border-[var(--color-primary-300)]"></div>
          <span>Hoy</span>
        </div>
        <div className="flex items-center gap-2">
          <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
          <span>Clic en un día para organizar partida</span>
        </div>
      </div>
    </div>
  );
}
