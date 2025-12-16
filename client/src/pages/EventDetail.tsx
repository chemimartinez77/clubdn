// client/src/pages/EventDetail.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { api } from '../api/axios';
import type { Event } from '../types/event';
import type { ApiResponse } from '../types/auth';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();

  // Fetch event details
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ event: Event }>>(`/api/events/${id}`);
      return response.data.data?.event;
    },
    enabled: !!id
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/api/events/${id}/register`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      success(data.message || 'Registrado correctamente');
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al registrarse');
    }
  });

  // Unregister mutation
  const unregisterMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/api/events/${id}/register`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      success(data.message || 'Registro cancelado');
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al cancelar registro');
    }
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">Evento no encontrado</p>
          <Button onClick={() => navigate('/events')} className="mt-4">
            Volver a eventos
          </Button>
        </div>
      </Layout>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const statusColors = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    ONGOING: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    SCHEDULED: 'Programado',
    ONGOING: 'En curso',
    COMPLETED: 'Completado',
    CANCELLED: 'Cancelado'
  };

  const isPast = new Date(event.date) < new Date();
  const canRegister = event.status === 'SCHEDULED' && !isPast && !event.isUserRegistered;
  const canUnregister = event.isUserRegistered && event.userRegistrationStatus !== 'CANCELLED';

  const confirmed = event.registrations?.filter(r => r.status === 'CONFIRMED') || [];
  const waitlist = event.registrations?.filter(r => r.status === 'WAITLIST') || [];

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a eventos
        </button>

        {/* Event Details */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title}</h1>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[event.status]}`}>
                    {statusLabels[event.status]}
                  </span>
                  {event.isUserRegistered && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      event.userRegistrationStatus === 'CONFIRMED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {event.userRegistrationStatus === 'CONFIRMED' ? 'Estás registrado' : 'En lista de espera'}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {canRegister && (
                  <Button
                    onClick={() => registerMutation.mutate()}
                    disabled={registerMutation.isPending}
                    variant="primary"
                  >
                    {registerMutation.isPending ? 'Registrando...' : 'Registrarse'}
                  </Button>
                )}
                {canUnregister && (
                  <Button
                    onClick={() => unregisterMutation.mutate()}
                    disabled={unregisterMutation.isPending}
                    variant="outline"
                  >
                    {unregisterMutation.isPending ? 'Cancelando...' : 'Cancelar registro'}
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Event Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-[var(--color-primary)] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">Fecha y hora</p>
                    <p className="font-medium text-gray-900 capitalize">{formatDate(event.date)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-[var(--color-primary)] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">Ubicación</p>
                    <p className="font-medium text-gray-900">{event.location}</p>
                    {event.address && (
                      <p className="text-sm text-gray-600">{event.address}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-[var(--color-primary)] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">Capacidad</p>
                    <p className="font-medium text-gray-900">
                      {event.registeredCount} / {event.maxAttendees} asistentes
                    </p>
                    {(event.waitlistCount || 0) > 0 && (
                      <p className="text-sm text-gray-600">
                        +{event.waitlistCount} en lista de espera
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-[var(--color-primary)] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">Organizador</p>
                    <p className="font-medium text-gray-900">{event.organizer?.name}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h3>
              <p className="text-gray-700 whitespace-pre-line">{event.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Attendees */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Confirmed */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-gray-900">
                Asistentes confirmados ({confirmed.length})
              </h3>
            </CardHeader>
            <CardContent>
              {confirmed.length === 0 ? (
                <p className="text-gray-500 text-sm">Aún no hay asistentes confirmados</p>
              ) : (
                <ul className="space-y-2">
                  {confirmed.map((registration) => (
                    <li key={registration.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="w-8 h-8 bg-[var(--color-primary-100)] rounded-full flex items-center justify-center">
                        <span className="text-[var(--color-primary)] font-semibold text-sm">
                          {registration.user?.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-gray-900">{registration.user?.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Waitlist */}
          {waitlist.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold text-gray-900">
                  Lista de espera ({waitlist.length})
                </h3>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {waitlist.map((registration) => (
                    <li key={registration.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <span className="text-yellow-600 font-semibold text-sm">
                          {registration.user?.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-gray-900">{registration.user?.name}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
