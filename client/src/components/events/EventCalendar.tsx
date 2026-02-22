// client/src/components/events/EventCalendar.tsx
import { useMemo } from 'react';
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
    // getDay() devuelve 0=domingo..6=sábado; convertir a ISO: 0=lunes..6=domingo
    const firstDayOfMonth = (firstDay.getDay() + 6) % 7;

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
      ? 'bg-[var(--color-calendarDaySocio)]'
      : hasEvents && hasColaborador
      ? 'bg-[var(--color-calendarDayColaborador)]'
      : 'bg-[var(--color-cardBackground)]';
    const dayText = hasSocio
      ? 'text-[var(--color-calendarTextSocio)]'
      : hasColaborador
      ? 'text-[var(--color-calendarTextColaborador)]'
      : 'text-[var(--color-text)]';

    return (
      <div
        key={day}
        onClick={handleDayClick}
        className={`min-h-[72px] border p-1 sm:p-2 ${dayBackground} ${
          isToday ? 'border-2 border-[var(--color-primary)]' : 'border border-[var(--color-cardBorder)]'
        } cursor-pointer transition-colors hover:brightness-95`}
        title="Toca un dia para ver el detalle"
      >
        <div className={`text-xs sm:text-sm font-semibold mb-1 ${dayText}`}>
          {day}
        </div>

        {hasEvents && (
          <div className="text-[10px] text-[var(--color-textSecondary)]">
            {dayEvents.length} {dayEvents.length === 1 ? 'partida' : 'partidas'}
          </div>
        )}
      </div>
    );
  };

  const renderEmptyDay = (index: number) => (
    <div key={`empty-${index}`} className="min-h-[72px] border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)]" />
  );

  return (
    <div className="bg-[var(--color-cardBackground)] rounded-lg border border-[var(--color-cardBorder)] p-3 sm:p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[var(--color-text)] capitalize">
          {monthName}
        </h3>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-px bg-[var(--color-cardBorder)] w-full">
        {/* Day headers */}
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
          <div
            key={day}
            className="bg-[var(--color-tableRowHover)] p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-[var(--color-textSecondary)]"
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
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-[var(--color-textSecondary)]">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[var(--color-calendarDaySocio)] border border-[var(--color-cardBorder)]"></div>
          <span>Día con socios</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[var(--color-calendarDayColaborador)] border border-[var(--color-cardBorder)]"></div>
          <span>Día con colaboradores</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)]"></div>
          <span>Sin partidas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[var(--color-cardBackground)] border-2 border-[var(--color-primary)]"></div>
          <span>Hoy</span>
        </div>
        <span className="text-[var(--color-textSecondary)]">Toca un dia para ver el detalle</span>
      </div>
    </div>
  );
}

