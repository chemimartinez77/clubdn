// client/src/pages/EventDetail.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { api } from '../api/axios';
import { GameImage } from '../components/events/EventCard';
import EventPhotoGallery from '../components/events/EventPhotoGallery';
import { useAuth } from '../contexts/AuthContext';
import type { Event } from '../types/event';
import type { ApiResponse } from '../types/auth';
import type { Invitation, InvitationCreateResponse } from '../types/invitation';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, user } = useAuth();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [guestFirstName, setGuestFirstName] = useState('');
  const [guestLastName, setGuestLastName] = useState('');
  const [guestDni, setGuestDni] = useState('');
  const [isExceptional, setIsExceptional] = useState(false);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [expandedInviteId, setExpandedInviteId] = useState<string | null>(null);

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

  const { data: invitations = [], isLoading: isInvitesLoading, isError: isInvitesError } = useQuery({
    queryKey: ['invitations', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Invitation[]>>(`/api/invitations?eventId=${id}`);
      return response.data.data || [];
    },
    enabled: !!id
  });

  const createInvitationMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        eventId: id,
        guestFirstName: guestFirstName.trim(),
        guestLastName: guestLastName.trim(),
        guestDni: guestDni.trim(),
        ...(isAdmin && isExceptional ? { isExceptional: true } : {})
      };
      const response = await api.post<ApiResponse<InvitationCreateResponse>>('/api/invitations', payload);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invitations', id] });
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setGuestFirstName('');
      setGuestLastName('');
      setGuestDni('');
      setIsExceptional(false);
      setQrUrl(data.data?.qrUrl || null);
      setExpandedInviteId(data.data?.invitation.id || null);
      success(data.message || 'Invitacion creada');
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al crear invitacion');
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
  const membershipLabels: Record<string, string> = {
    SOCIO: 'Socio',
    COLABORADOR: 'Colaborador'
  };

  const isPast = new Date(event.date) < new Date();
  const canRegister = event.status === 'SCHEDULED' && !isPast && !event.isUserRegistered;
  const canUnregister = event.isUserRegistered && event.userRegistrationStatus !== 'CANCELLED';
  const canInvite = event.status !== 'CANCELLED' && !isPast;

  const confirmed = event.registrations?.filter(r => r.status === 'CONFIRMED') || [];
  const waitlist = event.registrations?.filter(r => r.status === 'WAITLIST') || [];

  // Obtener imagen del juego: primero de BD (game.image o game.thumbnail), luego de gameImage (BGG)
  const gameImageUrl = event.game?.image || event.game?.thumbnail || event.gameImage || null;
  const isPartida = event.type === 'PARTIDA';
  const qrImageUrl = qrUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrUrl)}`
    : null;

  const handleCreateInvitation = () => {
    if (!guestFirstName.trim()) {
      showError('Nombre requerido');
      return;
    }
    if (!guestLastName.trim()) {
      showError('Apellidos requeridos');
      return;
    }
    if (!guestDni.trim()) {
      showError('DNI requerido');
      return;
    }
    if (!id) {
      showError('Evento no valido');
      return;
    }
    createInvitationMutation.mutate();
  };

  const handleCopyQr = async () => {
    if (!qrUrl) return;
    try {
      await navigator.clipboard.writeText(qrUrl);
      success('Enlace copiado');
    } catch (error) {
      showError('No se pudo copiar el enlace');
    }
  };

  const handleToggleInviteQr = (invite: Invitation) => {
    if (!invite.qrUrl) return;
    if (expandedInviteId === invite.id) {
      setExpandedInviteId(null);
      setQrUrl(null);
      return;
    }
    setExpandedInviteId(invite.id);
    setQrUrl(invite.qrUrl);
  };

  const handleCloseInviteModal = () => {
    setIsInviteModalOpen(false);
    setExpandedInviteId(null);
    setQrUrl(null);
  };

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
            <div className="flex items-start gap-6">
              {/* Imagen del juego (solo para partidas) */}
              {isPartida && (
                <div className="flex-shrink-0">
                  <GameImage src={gameImageUrl} alt={event.gameName || 'Juego'} size="lg" />
                </div>
              )}

              <div className="flex-1 flex items-start justify-between">
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
                  <Button
                    onClick={() => setIsInviteModalOpen(true)}
                    disabled={!canInvite}
                    variant="outline"
                  >
                    Añadir invitado
                  </Button>
                </div>
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
                Asistentes confirmados ({confirmed.length + (event.eventGuests?.length || 0)})
              </h3>
            </CardHeader>
            <CardContent>
              {confirmed.length === 0 && (!event.eventGuests || event.eventGuests.length === 0) ? (
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
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900">{registration.user?.name}</span>
                        {registration.user?.membership?.type &&
                          membershipLabels[registration.user.membership.type] && (
                            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                              {membershipLabels[registration.user.membership.type]}
                            </span>
                          )}
                      </div>
                    </li>
                  ))}
                  {event.eventGuests?.map((guest) => (
                    <li key={guest.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-semibold text-sm">
                          {guest.guestFirstName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-gray-900">{guest.guestFirstName} {guest.guestLastName}</span>
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">(Invitado)</span>
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
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900">{registration.user?.name}</span>
                        {registration.user?.membership?.type &&
                          membershipLabels[registration.user.membership.type] && (
                            <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
                              {membershipLabels[registration.user.membership.type]}
                            </span>
                          )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Photo Gallery */}
        <Card>
          <CardContent className="p-6">
            <EventPhotoGallery
              eventId={id!}
              canUpload={!!(event.isUserRegistered && event.userRegistrationStatus === 'CONFIRMED')}
              currentUserId={user?.id}
              isAdmin={isAdmin}
            />
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isInviteModalOpen}
        onClose={handleCloseInviteModal}
        title="Invitados"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Nombre *
              </label>
              <input
                type="text"
                value={guestFirstName}
                onChange={(e) => setGuestFirstName(e.target.value)}
                minLength={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                placeholder="Nombre"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Apellidos *
              </label>
              <input
                type="text"
                value={guestLastName}
                onChange={(e) => setGuestLastName(e.target.value)}
                minLength={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                placeholder="Apellidos"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                DNI *
              </label>
              <input
                type="text"
                value={guestDni}
                onChange={(e) => setGuestDni(e.target.value)}
                minLength={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                placeholder="00000000A"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Acciones
              </label>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleCreateInvitation}
                  disabled={
                    !canInvite ||
                    !id ||
                    createInvitationMutation.isPending ||
                    guestFirstName.trim().length < 2 ||
                    guestLastName.trim().length < 2 ||
                    guestDni.trim().length < 5
                  }
                  variant="primary"
                >
                  {createInvitationMutation.isPending ? 'Creando...' : 'Crear invitacion'}
                </Button>
                {isAdmin && (
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={isExceptional}
                      onChange={(e) => setIsExceptional(e.target.checked)}
                      className="w-4 h-4 text-[var(--color-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)]"
                    />
                    Invitacion excepcional
                  </label>
                )}
              </div>
            </div>
          </div>

          {qrUrl && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                {qrImageUrl && (
                  <img
                    src={qrImageUrl}
                    alt="QR Invitacion"
                    className="w-44 h-44"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-gray-600">Enlace del QR</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={qrUrl}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                    />
                    <Button onClick={handleCopyQr} variant="outline">
                      Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Comparte este QR con el invitado. Es de un solo uso y valido solo para hoy.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!canInvite && (
            <p className="text-sm text-gray-500">
              No se pueden crear invitaciones para eventos cancelados o pasados.
            </p>
          )}

          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Invitaciones creadas</h4>
            {isInvitesLoading ? (
              <p className="text-sm text-gray-500">Cargando invitaciones...</p>
            ) : isInvitesError ? (
              <p className="text-sm text-gray-500">No tienes permisos para ver invitaciones.</p>
            ) : invitations.length === 0 ? (
              <p className="text-sm text-gray-500">No hay invitaciones registradas.</p>
            ) : (
              <div className="space-y-2">
                {invitations.map((invite) => {
                  const isExpanded = expandedInviteId === invite.id;
                  return (
                    <div
                      key={invite.id}
                      onClick={() => handleToggleInviteQr(invite)}
                      className={`flex items-center justify-between p-3 border rounded-lg ${
                        invite.qrUrl ? 'cursor-pointer hover:bg-gray-50' : ''
                      } ${
                        isExpanded ? 'border-[var(--color-primary-300)] bg-[var(--color-primary-50)]' : 'border-gray-200'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {invite.guestFirstName} {invite.guestLastName}
                        </p>
                        {invite.guestDniMasked && (
                          <p className="text-xs text-gray-500">DNI {invite.guestDniMasked}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {new Date(invite.validDate).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invite.status === 'USED'
                          ? 'bg-green-100 text-green-800'
                          : invite.status === 'EXPIRED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invite.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
