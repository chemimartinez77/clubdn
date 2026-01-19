// client/src/pages/Events.tsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import EventCard from '../components/events/EventCard';
import EventCalendar from '../components/events/EventCalendar';
import { api } from '../api/axios';
import type { EventsResponse, EventStatus } from '../types/event';
import type { ApiResponse } from '../types/auth';

type ViewMode = 'list' | 'calendar';
type TypeFilter = 'PARTIDA' | 'EVENTOS' | '';
type CapacityFilter = '' | 'available' | 'full';

export default function Events() {
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [statusFilter, setStatusFilter] = useState<EventStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('PARTIDA');
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilter>('');
  const [search, setSearch] = useState('');
  const [participant, setParticipant] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data, isLoading, error } = useQuery({
    queryKey: ['events', statusFilter, typeFilter, search, participant],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);
      if (participant) params.append('participant', participant);
      params.append('limit', '100'); // Get all for calendar view

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
    });

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
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

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
            </div>
          </CardContent>
        </Card>

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
                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={handlePreviousMonth}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </Button>

                  <Button variant="outline" onClick={handleToday}>
                    Hoy
                  </Button>

                  <Button variant="outline" onClick={handleNextMonth}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Button>
                </div>

                <EventCalendar events={events} currentMonth={currentMonth} />
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
