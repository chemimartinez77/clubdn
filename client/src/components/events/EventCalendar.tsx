// client/src/components/events/EventCalendar.tsx
import { useMemo } from 'react';
import type { Event } from '../../types/event';
import { getMonthGridRange, toLocalDateKey } from './calendarMonthRange';

interface EventCalendarProps {
  events: Event[];
  currentMonth: Date;
  onDaySelect: (date: Date) => void;
}

const ADJACENT_DAY_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short'
});

const MONTH_NAME_FORMATTER = new Intl.DateTimeFormat('es-ES', {
  month: 'long',
  year: 'numeric'
});

export default function EventCalendar({ events, currentMonth, onDaySelect }: EventCalendarProps) {
  const { gridDates, monthName } = useMemo(() => {
    const { gridStart, gridEnd } = getMonthGridRange(currentMonth);
    const dates: Date[] = [];

    for (let day = new Date(gridStart); day <= gridEnd; day.setDate(day.getDate() + 1)) {
      dates.push(new Date(day));
    }

    return {
      gridDates: dates,
      monthName: MONTH_NAME_FORMATTER.format(currentMonth)
    };
  }, [currentMonth]);

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, Event[]> = {};

    events.forEach(event => {
      const eventDate = new Date(event.date);
      const dateKey = toLocalDateKey(eventDate);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(event);
    });

    return grouped;
  }, [events]);

  const renderDay = (dayDate: Date) => {
    const dateKey = toLocalDateKey(dayDate);
    const dayEvents = eventsByDate[dateKey] || [];
    const hasEvents = dayEvents.length > 0;
    const hasSocio = dayEvents.some(event => event.hasSocioRegistered);
    const hasColaborador = dayEvents.some(event => event.hasColaboradorRegistered);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const normalizedDayDate = new Date(dayDate);
    normalizedDayDate.setHours(0, 0, 0, 0);
    const isToday = normalizedDayDate.getTime() === today.getTime();
    const isPastDay = normalizedDayDate < today;
    const isCurrentMonth = dayDate.getMonth() === currentMonth.getMonth()
      && dayDate.getFullYear() === currentMonth.getFullYear();

    const handleDayClick = () => {
      onDaySelect(new Date(dayDate));
    };

    const dayBackground = hasSocio
      ? 'bg-[var(--color-calendarDaySocio)]'
      : hasEvents && hasColaborador
        ? 'bg-[var(--color-calendarDayColaborador)]'
        : isCurrentMonth
          ? 'bg-[var(--color-cardBackground)]'
          : 'bg-[var(--color-tableRowHover)]';
    const dayText = hasSocio
      ? 'text-[var(--color-calendarTextSocio)]'
      : hasColaborador
        ? 'text-[var(--color-calendarTextColaborador)]'
        : isCurrentMonth
          ? 'text-[var(--color-text)]'
          : 'text-[var(--color-textSecondary)]';
    const isMutedPastDay = isPastDay && !isToday;
    const dayTextClass = isMutedPastDay ? `${dayText} opacity-80` : dayText;
    const summaryTextClass = isMutedPastDay
      ? 'text-[10px] text-[var(--color-textSecondary)] opacity-70'
      : 'text-[10px] text-[var(--color-textSecondary)]';
    const adjacentDayClass = isCurrentMonth ? '' : 'border-dashed saturate-75';
    const label = isCurrentMonth
      ? String(dayDate.getDate())
      : ADJACENT_DAY_FORMATTER.format(dayDate).replace('.', '').toLowerCase();

    return (
      <div
        key={dateKey}
        onClick={handleDayClick}
        className={`min-h-[72px] border p-1 sm:p-2 ${dayBackground} ${adjacentDayClass} ${
          isToday ? 'border-2 border-[var(--color-primary)]' : 'border border-[var(--color-cardBorder)]'
        } cursor-pointer transition-colors hover:brightness-95 ${isMutedPastDay ? 'opacity-70' : ''}`}
        title={isCurrentMonth ? 'Toca un día para ver el detalle' : 'Toca un día de otro mes para ver el detalle y navegar a ese mes'}
      >
        <div className={`text-xs sm:text-sm font-semibold mb-1 ${dayTextClass}`}>
          {label}
        </div>

        {hasEvents && (() => {
          const partidas = dayEvents.filter(e => e.type === 'PARTIDA').length;
          const otros = dayEvents.filter(e => e.type !== 'PARTIDA').length;
          const parts: string[] = [];
          if (partidas > 0) parts.push(`${partidas} ${partidas === 1 ? 'partida' : 'partidas'}`);
          if (otros > 0) parts.push(`${otros} ${otros === 1 ? 'evento' : 'eventos'}`);
          return (
            <div className={summaryTextClass}>
              {parts.join(', ')}
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <div className="bg-[var(--color-cardBackground)] rounded-lg border border-[var(--color-cardBorder)] p-3 sm:p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-[var(--color-text)] capitalize">
          {monthName}
        </h3>
      </div>

      <div className="grid grid-cols-7 gap-px bg-[var(--color-cardBorder)] w-full">
        {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
          <div
            key={day}
            className="bg-[var(--color-tableRowHover)] p-1 sm:p-2 text-center text-xs sm:text-sm font-medium text-[var(--color-textSecondary)]"
          >
            {day}
          </div>
        ))}

        {gridDates.map(renderDay)}
      </div>

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
          <div className="w-3 h-3 rounded bg-[var(--color-tableRowHover)] border border-dashed border-[var(--color-cardBorder)]"></div>
          <span>Día de otro mes</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-[var(--color-cardBackground)] border-2 border-[var(--color-primary)]"></div>
          <span>Hoy</span>
        </div>
        <span className="text-[var(--color-textSecondary)]">Toca un día para ver el detalle</span>
      </div>
    </div>
  );
}
