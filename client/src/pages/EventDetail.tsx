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
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);

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

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      const response = await api.delete(`/api/events/${id}`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      success(data.message || 'Partida eliminada');
      navigate('/events');
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al eliminar partida');
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
  const formatNumber = (value?: number | null, digits = 2) =>
    typeof value === 'number' ? value.toFixed(digits) : '—';
  const formatRange = (min?: number | null, max?: number | null, suffix = '') => {
    if (typeof min === 'number' && typeof max === 'number') {
      return `${min}-${max}${suffix}`;
    }
    if (typeof min === 'number') {
      return `${min}${suffix}`;
    }
    if (typeof max === 'number') {
      return `${max}${suffix}`;
    }
    return '—';
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

  const isPartida = event.type === 'PARTIDA';
  const isPast = new Date(event.date) < new Date();
  const canRegister = event.status === 'SCHEDULED' && !isPast && !event.isUserRegistered;
  const canUnregister = event.isUserRegistered && event.userRegistrationStatus !== 'CANCELLED';
  const canInvite = event.status !== 'CANCELLED' && !isPast;
  const canDelete = isPartida && !isPast && event.status !== 'CANCELLED' && (isAdmin || user?.id === event.createdBy);

  const confirmed = event.registrations?.filter(r => r.status === 'CONFIRMED') || [];
  const waitlist = event.registrations?.filter(r => r.status === 'WAITLIST') || [];

  // Obtener imagen del juego: primero de BD (game.image o game.thumbnail), luego de gameImage (BGG)
  const gameImageUrl = event.game?.image || event.game?.thumbnail || event.gameImage || null;
  const canShowGameDetails = isPartida && !!event.game;
  const gameTitle = event.gameName || event.title;
  const gameDescription = event.game?.description
    ? event.game.description.replace(/<[^>]*>/g, '').trim()
    : null;
  const playersText = formatRange(event.game?.minPlayers, event.game?.maxPlayers);
  const timeText = event.game?.minPlaytime || event.game?.maxPlaytime
    ? formatRange(event.game?.minPlaytime, event.game?.maxPlaytime, ' min')
    : event.game?.playingTime
      ? `${event.game.playingTime} min`
      : '—';
  const minAgeText = typeof event.game?.minAge === 'number' ? `${event.game.minAge}+` : '—';
  const yearText = typeof event.game?.yearPublished === 'number' ? event.game.yearPublished : '—';
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

  const handleOpenGameModal = () => {
    if (!canShowGameDetails) return;
    setIsGameModalOpen(true);
  };

  const handleShareWhatsApp = () => {
    if (!event) return;

    const eventDate = new Date(event.date);
    const formattedDate = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(eventDate);

    const registeredCount = event.registeredCount || 0;
    const spotsLeft = event.maxAttendees - registeredCount;
    const spotsText = spotsLeft > 0
      ? `Plazas disponibles: ${spotsLeft} de ${event.maxAttendees}`
      : `COMPLETO (${registeredCount}/${event.maxAttendees})`;

    let message = `*${event.title}*\n\n`;
    message += `Fecha: ${formattedDate}\n`;
    if (event.location) {
      message += `Lugar: ${event.location}\n`;
    }
    message += `\n${spotsText}\n`;

    if (event.description) {
      message += `\n${event.description}\n`;
    }

    // Añadir participantes registrados
    const confirmedRegistrations = event.registrations?.filter(reg => reg.status === 'CONFIRMED') || [];

    // Obtener invitados válidos (PENDING = invitación válida no usada aún, USED = ya asistió)
    const confirmedInvitations = invitations?.filter(inv => inv.status === 'PENDING' || inv.status === 'USED') || [];

    if (confirmedRegistrations.length > 0 || confirmedInvitations.length > 0) {
      message += `\n*Participantes confirmados:*\n`;

      // Añadir usuarios registrados
      confirmedRegistrations.forEach(reg => {
        message += `- ${reg.user?.name || 'Usuario'}`;
        if (reg.user?.membership?.type) {
          const membershipLabel = reg.user.membership.type === 'SOCIO' ? 'Socio' : 'Colaborador';
          message += ` (${membershipLabel})`;
        }
        message += '\n';
      });

      // Añadir invitados
      confirmedInvitations.forEach(inv => {
        message += `- ${inv.guestFirstName} ${inv.guestLastName} (Invitado)\n`;
      });
    }

    message += `\nVer mas detalles: ${window.location.href}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              {/* Imagen del juego (solo para partidas) */}
              {isPartida && (
                <div className="flex-shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleOpenGameModal}
                    disabled={!canShowGameDetails}
                    className={`relative w-full sm:w-32 sm:h-32 ${
                      canShowGameDetails ? 'cursor-pointer' : 'cursor-default'
                    }`}
                    aria-label="Ver detalles del juego"
                  >
                    {gameImageUrl && (
                      <div
                        className="absolute inset-0 rounded-lg bg-center bg-cover opacity-20 sm:hidden"
                        style={{ backgroundImage: `url(${gameImageUrl})` }}
                        aria-hidden="true"
                      />
                    )}
                    <GameImage
                      src={gameImageUrl}
                      alt={event.gameName || 'Juego'}
                      size="lg"
                      className="relative z-10 w-full aspect-square sm:w-32 sm:h-32 bg-transparent"
                    />
                  </button>
                </div>
              )}

              <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1">
                  <h1
                    className={`text-3xl font-bold text-gray-900 mb-2 ${
                      canShowGameDetails ? 'cursor-pointer hover:underline' : ''
                    }`}
                    onClick={canShowGameDetails ? handleOpenGameModal : undefined}
                  >
                    {event.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3">
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
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:justify-end">
                  {canRegister && (
                    <Button
                      onClick={() => registerMutation.mutate()}
                      disabled={registerMutation.isPending}
                      variant="primary"
                      className="w-full sm:w-auto"
                    >
                      {registerMutation.isPending ? 'Registrando...' : 'Registrarse'}
                    </Button>
                  )}
                  {canUnregister && (
                    <Button
                      onClick={() => unregisterMutation.mutate()}
                      disabled={unregisterMutation.isPending}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      {unregisterMutation.isPending ? 'Cancelando...' : 'Cancelar registro'}
                    </Button>
                  )}
                  <Button
                    onClick={() => setIsInviteModalOpen(true)}
                    disabled={!canInvite}
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Añadir invitado
                  </Button>
                  <Button
                    onClick={handleShareWhatsApp}
                    variant="outline"
                    className="w-full sm:w-auto"
                    title="Compartir por WhatsApp"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>Compartir en Whatsapp</span>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </span>
                  </Button>
                  {canDelete && (
                    <Button
                      onClick={() => {
                        const confirmed = window.confirm(
                          '¿Quieres eliminar esta partida? Se marcará como cancelada.'
                        );
                        if (confirmed) {
                          deleteEventMutation.mutate();
                        }
                      }}
                      disabled={deleteEventMutation.isPending}
                      variant="danger"
                      className="w-full sm:w-auto"
                    >
                      {deleteEventMutation.isPending ? 'Eliminando...' : 'Eliminar partida'}
                    </Button>
                  )}
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
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Invitado</span>
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
        isOpen={isGameModalOpen}
        onClose={() => setIsGameModalOpen(false)}
        title={gameTitle}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            {gameImageUrl && (
              <img
                src={gameImageUrl}
                alt={gameTitle}
                className="w-full sm:w-48 rounded-lg object-contain bg-gray-50"
              />
            )}
            <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
              <div>
                <p className="text-xs text-gray-500">Nota BGG</p>
                <p className="font-semibold">{formatNumber(event.game?.averageRating)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Bayes</p>
                <p className="font-semibold">{formatNumber(event.game?.bayesAverage)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Peso</p>
                <p className="font-semibold">{formatNumber(event.game?.complexityRating)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Ranking</p>
                <p className="font-semibold">{event.game?.rank ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Jugadores</p>
                <p className="font-semibold">{playersText}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Duracion</p>
                <p className="font-semibold">{timeText}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Edad</p>
                <p className="font-semibold">{minAgeText}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Año</p>
                <p className="font-semibold">{yearText}</p>
              </div>
            </div>
          </div>

          {gameDescription && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Descripcion</h4>
              <p className="text-sm text-gray-700 whitespace-pre-line">{gameDescription}</p>
            </div>
          )}

          {(event.game?.categories?.length || event.game?.mechanics?.length) && (
            <div className="space-y-2 text-sm text-gray-700">
              {event.game?.categories?.length ? (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Categorias</p>
                  <p>{event.game.categories.join(', ')}</p>
                </div>
              ) : null}
              {event.game?.mechanics?.length ? (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Mecanicas</p>
                  <p>{event.game.mechanics.join(', ')}</p>
                </div>
              ) : null}
            </div>
          )}

          {(event.game?.designers?.length || event.game?.publishers?.length) && (
            <div className="space-y-2 text-sm text-gray-700">
              {event.game?.designers?.length ? (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Diseñadores</p>
                  <p>{event.game.designers.join(', ')}</p>
                </div>
              ) : null}
              {event.game?.publishers?.length ? (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Editoriales</p>
                  <p>{event.game.publishers.join(', ')}</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Modal>

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
