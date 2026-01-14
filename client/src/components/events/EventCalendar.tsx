// client/src/components/events/EventCalendar.tsx
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Event } from '../../types/event';

interface EventCalendarProps {
  events: Event[];
  currentMonth: Date;
}

export default function EventCalendar({ events, currentMonth }: EventCalendarProps) {
  const navigate = useNavigate();

  const { daysInMonth, firstDayOfMonth, monthName } = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1);
    const firstDayOfMonth = firstDay.getDay();

    const monthName = new Intl.DateTimeFormat('es-ES', {
      month: 'long',
      year: 'numeric'
    }).format(currentMonth);

    return { daysInMonth, firstDayOfMonth, monthName };
  }, [currentMonth]);

  // Agrupar eventos por día
  const eventsByDay = useMemo(() => {
    const grouped: Record<number, Event[]> = {};

    events.forEach(event => {
      const eventDate = new Date(event.date);
      const eventMonth = eventDate.getMonth();
      const eventYear = eventDate.getFullYear();

      // Solo eventos del mes actual
      if (eventMonth === currentMonth.getMonth() && eventYear === currentMonth.getFullYear()) {
        const day = eventDate.getDate();
        if (!grouped[day]) {
          grouped[day] = [];
        }
        grouped[day].push(event);
      }
    });

    return grouped;
  }, [events, currentMonth]);

  const renderDay = (day: number) => {
    const dayEvents = eventsByDay[day] || [];
    const hasEvents = dayEvents.length > 0;
    const today = new Date();
    const isToday =
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear();

    // Verificar si el día es pasado (no se puede crear partida en días pasados)
    const isPastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

    // Formatear fecha para pasar a crear partida (YYYY-MM-DD)
    const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const handleDayClick = () => {
      if (!isPastDay) {
        navigate('/events/crear-partida', { state: { selectedDate: dateString } });
      }
    };

    return (
      <div
        key={day}
        onClick={handleDayClick}
        className={`min-h-[100px] border border-gray-200 p-2 ${
          isToday ? 'bg-[var(--color-primary-50)] border-[var(--color-primary-300)]' : 'bg-white'
        } ${!isPastDay ? 'cursor-pointer hover:bg-gray-50 transition-colors' : 'opacity-60'}`}
        title={isPastDay ? 'No se pueden crear partidas en días pasados' : 'Clic para organizar una partida'}
      >
        <div className={`text-sm font-medium mb-1 ${
          isToday ? 'text-[var(--color-primaryDark)]' : 'text-gray-700'
        }`}>
          {day}
        </div>

        {hasEvents && (
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map(event => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                onClick={(e) => e.stopPropagation()}
                className="block text-xs p-1 rounded bg-[var(--color-primary-100)] text-[var(--color-primary-800)] hover:bg-[var(--color-primary-200)] truncate"
              >
                {event.title}
              </Link>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 pl-1">
                +{dayEvents.length - 2} más
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderEmptyDay = (index: number) => (
    <div key={`empty-${index}`} className="min-h-[100px] border border-gray-200 bg-gray-50" />
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 capitalize">
          {monthName}
        </h3>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {/* Day headers */}
        {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
          <div
            key={day}
            className="bg-gray-100 p-2 text-center text-sm font-medium text-gray-700"
          >
            {day}
          </div>
        ))}

        {/* Empty cells before first day */}
        {Array.from({ length: firstDayOfMonth }, (_, i) => renderEmptyDay(i))}

        {/* Days of month */}
        {Array.from({ length: daysInMonth }, (_, i) => renderDay(i + 1))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[var(--color-primary-100)]"></div>
          <span>Evento programado</span>
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
