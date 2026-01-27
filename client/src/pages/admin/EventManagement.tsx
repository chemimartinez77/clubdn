// client/src/pages/admin/EventManagement.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Card, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { api } from '../../api/axios';
import type { Event, CreateEventData, EventStatus } from '../../types/event';
import type { ApiResponse } from '../../types/auth';

export default function EventManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();

  // Fetch events
  const { data, isLoading } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ events: Event[] }>>('/api/events?limit=1000');
      return response.data.data?.events || [];
    }
  });

  const events = data || [];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateEventData) => {
      const response = await api.post('/api/events', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      success(data.message || 'Evento creado correctamente');
      setIsModalOpen(false);
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al crear evento');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateEventData> & { status?: EventStatus } }) => {
      const response = await api.put(`/api/events/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      success(data.message || 'Evento actualizado correctamente');
      setIsModalOpen(false);
      setEditingEvent(null);
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al actualizar evento');
    }
  });

  // Delete (cancel) mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/events/${id}`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      success(data.message || 'Evento cancelado correctamente');
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al cancelar evento');
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const locationValue = (formData.get('location') as string)?.trim();

    const data: CreateEventData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      type: (formData.get('type') as 'PARTIDA' | 'TORNEO' | 'OTROS') || 'OTROS',
      date: formData.get('date') as string,
      location: locationValue || 'Club DN',
      address: formData.get('address') as string || undefined,
      maxAttendees: parseInt(formData.get('maxAttendees') as string)
    };

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que quieres cancelar este evento?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleStatusChange = (id: string, status: EventStatus) => {
    updateMutation.mutate({ id, data: { status } });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const statusColors = {
    SCHEDULED: 'bg-blue-100 text-blue-800',
    ONGOING: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-[var(--color-tableRowHover)] text-[var(--color-text)]',
    CANCELLED: 'bg-red-100 text-red-800'
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)]">Gestión de Eventos</h1>
            <p className="text-[var(--color-textSecondary)] mt-1">Administra todos los eventos del club</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} variant="primary">
            <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear Evento
          </Button>
        </div>

        {/* Events Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto text-[var(--color-textSecondary)] mb-4"
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
                <h3 className="text-lg font-medium text-[var(--color-text)] mb-2">No hay eventos</h3>
                <p className="text-[var(--color-textSecondary)] mb-4">Comienza creando tu primer evento</p>
                <Button onClick={() => setIsModalOpen(true)} variant="primary">
                  Crear Evento
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[var(--color-tableRowHover)] border-b border-[var(--color-cardBorder)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                        Evento
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                        Ubicación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                        Asistentes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[var(--color-textSecondary)] uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-[var(--color-cardBackground)] divide-y divide-gray-200">
                    {events.map((event) => (
                      <tr key={event.id} className="hover:bg-[var(--color-tableRowHover)]">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-[var(--color-text)]">{event.title}</div>
                          <div className="text-sm text-[var(--color-textSecondary)] truncate max-w-xs">
                            {event.description.substring(0, 60)}
                            {event.description.length > 60 ? '...' : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[var(--color-text)]">{formatDate(event.date)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-[var(--color-text)]">{event.location}</div>
                          {event.address && (
                            <div className="text-sm text-[var(--color-textSecondary)]">{event.address}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-[var(--color-text)]">
                            {event.registeredCount || 0} / {event.maxAttendees}
                          </div>
                          {(event.waitlistCount || 0) > 0 && (
                            <div className="text-xs text-yellow-600">
                              +{event.waitlistCount} en espera
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={event.status}
                            onChange={(e) => handleStatusChange(event.id, e.target.value as EventStatus)}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[event.status]} cursor-pointer`}
                            disabled={event.status === 'CANCELLED'}
                          >
                            <option value="SCHEDULED">Programado</option>
                            <option value="ONGOING">En curso</option>
                            <option value="COMPLETED">Completado</option>
                            <option value="CANCELLED">Cancelado</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(event)}
                              className="text-[var(--color-primary)] hover:text-[var(--color-primary-900)]"
                              title="Editar"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                />
                              </svg>
                            </button>
                            {event.status !== 'CANCELLED' && (
                              <button
                                onClick={() => handleDelete(event.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Cancelar"
                              >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                  />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-cardBackground)] rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-[var(--color-text)]">
                    {editingEvent ? 'Editar Evento' : 'Crear Evento'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-[var(--color-textSecondary)] hover:text-[var(--color-textSecondary)]"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                      Tipo de Evento *
                    </label>
                    <select
                      name="type"
                      required
                      defaultValue={editingEvent?.type || 'OTROS'}
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    >
                      <option value="PARTIDA">Partida</option>
                      <option value="TORNEO">Torneo</option>
                      <option value="OTROS">Otros</option>
                    </select>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                      Título *
                    </label>
                    <input
                      type="text"
                      name="title"
                      required
                      defaultValue={editingEvent?.title}
                      minLength={3}
                      maxLength={100}
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="Nombre del evento"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                      Descripción *
                    </label>
                    <textarea
                      name="description"
                      required
                      defaultValue={editingEvent?.description}
                      minLength={10}
                      rows={4}
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                      placeholder="Describe el evento..."
                    />
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                      Fecha y Hora *
                    </label>
                    <input
                      type="datetime-local"
                      name="date"
                      required
                      defaultValue={editingEvent?.date ? new Date(editingEvent.date).toISOString().slice(0, 16) : ''}
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                      Ubicación (opcional)
                    </label>
                    <input
                      type="text"
                      name="location"
                      defaultValue={editingEvent?.location}
                      minLength={3}
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="Nombre del lugar"
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                      Dirección (opcional)
                    </label>
                    <input
                      type="text"
                      name="address"
                      defaultValue={editingEvent?.address || ''}
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="Dirección completa"
                    />
                  </div>

                  {/* Max Attendees */}
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                      Capacidad Máxima *
                    </label>
                    <input
                      type="number"
                      name="maxAttendees"
                      required
                      defaultValue={editingEvent?.maxAttendees}
                      min={1}
                      max={1000}
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="Número de asistentes"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-1"
                    >
                      {createMutation.isPending || updateMutation.isPending
                        ? 'Guardando...'
                        : editingEvent
                        ? 'Actualizar Evento'
                        : 'Crear Evento'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloseModal}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

