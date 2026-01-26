// client/src/pages/Events.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import EventCard from '../components/events/EventCard';
import EventCalendar from '../components/events/EventCalendar';
import EventCalendarWeek from '../components/events/EventCalendarWeek';
import EventCalendarDay from '../components/events/EventCalendarDay';
import { api } from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import type { EventsResponse, EventStatus } from '../types/event';
import type { ApiResponse } from '../types/auth';

type ViewMode = 'list' | 'calendar';
type CalendarView = 'month' | 'week' | 'day';
type TypeFilter = 'PARTIDA' | 'EVENTOS' | '';
type CapacityFilter = '' | 'available' | 'full';
type SortOption = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc';

export default function Events() {
  const { user, isAdmin } = useAuth();
  const { error: showError } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [statusFilter, setStatusFilter] = useState<EventStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('PARTIDA');
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilter>('');
  const [search, setSearch] = useState('');
  const [participant, setParticipant] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');

  const { data, isLoading, error } = useQuery({
    queryKey: ['events', statusFilter, typeFilter, search, participant],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      if (participant) params.append('participant', participant);
      params.append('limit', '1000'); // Get all for calendar view

      const response = await api.get<ApiResponse<EventsResponse>>(
        `/api/events?${params.toString()}`
      );
      return response.data.data;
    }
  });

  // Filtrar eventos por tipo y capacidad en el cliente
  const allEvents = data?.events || [];
  const events = allEvents
    // Filtro por tipo: "PARTIDA" = solo partidas, "EVENTOS" = torneos y otros, "" = todos
    .filter(event => {
      if (typeFilter === 'PARTIDA') return event.type === 'PARTIDA';
      if (typeFilter === 'EVENTOS') return event.type !== 'PARTIDA';
      return true;
    })
    // Filtro por capacidad: "available" = con plazas, "full" = completas, "" = todas
    .filter(event => {
      const registeredCount = event.registeredCount || 0;
      const isFull = registeredCount >= event.maxAttendees;
      if (capacityFilter === 'available') return !isFull;
      if (capacityFilter === 'full') return isFull;
      return true;
    })
    .sort((a, b) => {
      if (sortOption === 'name_asc') {
        return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
      }
      if (sortOption === 'name_desc') {
        return b.title.localeCompare(a.title, 'es', { sensitivity: 'base' });
      }

      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (sortOption === 'date_asc') {
        return dateA - dateB;
      }
      return dateB - dateA;
    });

  const shiftDate = (base: Date, days: number) => {
    const next = new Date(base);
    next.setDate(base.getDate() + days);
    return next;
  };

  const handlePrevious = () => {
    setCurrentMonth(prev => {
      if (calendarView === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
      }
      if (calendarView === 'week') {
        return shiftDate(prev, -7);
      }
      return shiftDate(prev, -1);
    });
  };

  const handleNext = () => {
    setCurrentMonth(prev => {
      if (calendarView === 'month') {
        return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
      }
      if (calendarView === 'week') {
        return shiftDate(prev, 7);
      }
      return shiftDate(prev, 1);
    });
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const handleDaySelect = (date: Date) => {
    setCurrentMonth(date);
    setCalendarView('day');
  };

  const getWeekRange = (date: Date) => {
    const base = new Date(date);
    const dayOfWeek = base.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(base);
    weekStart.setDate(base.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { weekStart, weekEnd };
  };

  const handleShareWeeklyForecast = () => {
    const { weekStart, weekEnd } = getWeekRange(currentMonth);
    const socioEvents = events.filter(event => {
      if (!event.hasSocioRegistered) return false;
      const eventDate = new Date(event.date);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    if (socioEvents.length === 0) {
      showError('No hay partidas con socios esta semana');
      return;
    }

    const dayFormat = new Intl.DateTimeFormat('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
    const timeFormat = new Intl.DateTimeFormat('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const rangeFormat = new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short'
    });
    const rangeTitle = `${rangeFormat.format(weekStart)} - ${rangeFormat.format(weekEnd)}`;

    const grouped: Record<string, { label: string; events: typeof socioEvents }> = {};
    socioEvents.forEach(event => {
      const eventDate = new Date(event.date);
      const key = eventDate.toDateString();
      if (!grouped[key]) {
        grouped[key] = {
          label: dayFormat.format(eventDate),
          events: []
        };
      }
      grouped[key].events.push(event);
    });

    const days = Object.values(grouped).sort((a, b) => {
      const dateA = new Date(a.events[0].date).getTime();
      const dateB = new Date(b.events[0].date).getTime();
      return dateA - dateB;
    });

    const lines = [
      `*Prevision semanal Club DN (${rangeTitle})*`,
      '_Solo partidas con socios_',
      ''
    ];

    days.forEach(day => {
      lines.push(`*${day.label}*`);
      day.events
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach(event => {
          const time = timeFormat.format(new Date(event.date));
          lines.push(`- ${time} ${event.title}`);
        });
      lines.push('');
    });

    const message = lines.join('\n').trim();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Eventos</h1>
            <p className="text-gray-600 mt-1">Descubre y regístrate a eventos del club</p>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-[var(--color-primaryDark)] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'calendar'
                  ? 'bg-white text-[var(--color-primaryDark)] shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendario
            </button>
          </div>
        </div>

        {/* Filters - Solo en vista lista */}
        {viewMode === 'list' && (
          <Card>
            <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="PARTIDA">Partidas</option>
                  <option value="EVENTOS">Eventos</option>
                  <option value="">Todos</option>
                </select>
              </div>

              {/* Capacity Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Plazas
                </label>
                <select
                  value={capacityFilter}
                  onChange={(e) => setCapacityFilter(e.target.value as CapacityFilter)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="">Todas</option>
                  <option value="available">Con plazas libres</option>
                  <option value="full">Completas</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as EventStatus | '')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="">Todos los estados</option>
                  <option value="SCHEDULED">Programados</option>
                  <option value="ONGOING">En curso</option>
                  <option value="COMPLETED">Completados</option>
                  <option value="CANCELLED">Cancelados</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar evento
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Título, ubicación..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              </div>

              {/* Participant Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participante
                </label>
                <input
                  type="text"
                  value={participant}
                  onChange={(e) => setParticipant(e.target.value)}
                  placeholder="Nombre del jugador..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              </div>

              {/* Sort */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordenar por
                </label>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="date_desc">Fecha (más recientes)</option>
                  <option value="date_asc">Fecha (más antiguas)</option>
                  <option value="name_asc">Nombre (A-Z)</option>
                  <option value="name_desc">Nombre (Z-A)</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando eventos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">Error al cargar eventos</p>
          </div>
        ) : (
          <>
            {viewMode === 'list' ? (
              /* List View */
              events.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <svg
                      className="w-16 h-16 mx-auto text-gray-400 mb-4"
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
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay eventos
                    </h3>
                    <p className="text-gray-600">
                      {search || statusFilter
                        ? 'No se encontraron eventos con los filtros aplicados'
                        : 'Aún no hay eventos programados'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {events.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              )
            ) : (
              /* Calendar View */
              <div className="space-y-4">
                {/* Calendar Controls */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Navigation */}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handlePrevious}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </Button>

                    <Button variant="outline" onClick={handleToday}>
                      Hoy
                    </Button>

                    <Button variant="outline" onClick={handleNext}>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Button>
                  </div>

                  {/* View Selector */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    {(isAdmin || user?.membership?.type === 'SOCIO') && calendarView === 'week' && (
                      <Button variant="outline" onClick={handleShareWeeklyForecast}>
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Compartir prevision semanal
                      </Button>
                    )}
                    <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                      <button
                        onClick={() => setCalendarView('month')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          calendarView === 'month'
                            ? 'bg-white text-[var(--color-primaryDark)] shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Mes
                      </button>
                      <button
                        onClick={() => setCalendarView('week')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          calendarView === 'week'
                            ? 'bg-white text-[var(--color-primaryDark)] shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Semana
                      </button>
                      <button
                        onClick={() => setCalendarView('day')}
                        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          calendarView === 'day'
                            ? 'bg-white text-[var(--color-primaryDark)] shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Dia
                      </button>
                    </div>
                  </div>
                </div>

                {/* Calendar Component based on view */}
                {calendarView === 'month' && (
                  <EventCalendar
                    events={events}
                    currentMonth={currentMonth}
                    onDaySelect={handleDaySelect}
                  />
                )}
                {calendarView === 'week' && (
                  <EventCalendarWeek events={events} currentMonth={currentMonth} />
                )}
                {calendarView === 'day' && (
                  <EventCalendarDay events={events} currentMonth={currentMonth} />
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
