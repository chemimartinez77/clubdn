// client/src/components/events/EventCalendar.tsx
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Event } from '../../types/event';

interface EventCalendarProps {
  events: Event[];
  currentMonth: Date;
  onDaySelect: (date: Date) => void;
}

export default function EventCalendar({ events, currentMonth, onDaySelect }: EventCalendarProps) {
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

  // Agrupar eventos por d?a
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
    const hasSocio = dayEvents.some(event => event.hasSocioRegistered);
    const hasColaborador = dayEvents.some(event => event.hasColaboradorRegistered);
    const today = new Date();
    const isToday =
      day === today.getDate() &&
      currentMonth.getMonth() === today.getMonth() &&
      currentMonth.getFullYear() === today.getFullYear();

    // Formatear fecha para detalle (YYYY-MM-DD)
    const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayDate = new Date(`${dateString}T00:00:00`);

    const handleDayClick = () => {
      onDaySelect(dayDate);
    };

    const dayBackground = hasSocio
      ? 'bg-green-500'
      : hasEvents && hasColaborador
      ? 'bg-yellow-200'
      : 'bg-white';
    const dayText = hasSocio ? 'text-white' : 'text-gray-900';

    return (
      <div
        key={day}
        onClick={handleDayClick}
        className={`min-h-[72px] border border-gray-200 p-1 sm:p-2 ${dayBackground} ${
          isToday ? 'ring-2 ring-[var(--color-primary-300)]' : ''
        } cursor-pointer transition-colors hover:brightness-95`}
        title="Toca un d?a para ver el detalle"
      >
        <div className={`text-xs sm:text-sm font-semibold mb-1 ${dayText}`}>
          {day}
        </div>

        {hasEvents && (
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map(event => {
              const registeredCount = event.registeredCount || 0;
              const isFull = registeredCount >= event.maxAttendees;
              return (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className={`block text-xs p-1 rounded ${
                    isFull
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-[var(--color-primary-100)] text-[var(--color-primary-800)] hover:bg-[var(--color-primary-200)]'
                  }`}
                >
                  <span className="truncate">{event.title}</span>
                  <span className={`ml-1 font-medium ${isFull ? 'text-red-600' : 'text-green-700'}`}>
                    ({registeredCount}/{event.maxAttendees})
                  </span>
                </Link>
              );
            })}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-500 pl-1">
                +{dayEvents.length - 2} m?s
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderEmptyDay = (index: number) => (
    <div key={`empty-${index}`} className="min-h-[72px] border border-gray-200 bg-gray-50" />
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 capitalize">
          {monthName}
        </h3>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 w-full">
        {/* Day headers */}
        {['Dom', 'Lun', 'Mar', 'Mi?', 'Jue', 'Vie', 'S?b'].map(day => (
          <div
            key={day}
            className="bg-gray-100 p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-gray-700"
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
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span>D?a con socios</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-yellow-200"></div>
          <span>D?a con colaboradores</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-white border border-gray-200"></div>
          <span>Sin partidas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-white border border-[var(--color-primary-300)]"></div>
          <span>Hoy</span>
        </div>
        <span className="text-gray-500">Toca un d?a para ver el detalle</span>
      </div>
    </div>
  );
}
