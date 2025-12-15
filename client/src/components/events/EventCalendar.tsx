// client/src/components/events/EventCalendar.tsx
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Event } from '../../types/event';

interface EventCalendarProps {
  events: Event[];
  currentMonth: Date;
}

export default function EventCalendar({ events, currentMonth }: EventCalendarProps) {
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

    return (
      <div
        key={day}
        className={`min-h-[100px] border border-gray-200 p-2 ${
          isToday ? 'bg-purple-50 border-purple-300' : 'bg-white'
        }`}
      >
        <div className={`text-sm font-medium mb-1 ${
          isToday ? 'text-purple-700' : 'text-gray-700'
        }`}>
          {day}
        </div>

        {hasEvents && (
          <div className="space-y-1">
            {dayEvents.slice(0, 2).map(event => (
              <Link
                key={event.id}
                to={`/events/${event.id}`}
                className="block text-xs p-1 rounded bg-purple-100 text-purple-800 hover:bg-purple-200 truncate"
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
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-100"></div>
          <span>Evento programado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-50 border border-purple-300"></div>
          <span>Hoy</span>
        </div>
      </div>
    </div>
  );
}
