// client/src/pages/EventDetail.tsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { api } from '../api/axios';
import { GameImage } from '../components/events/EventCard';
import EventPhotoGallery from '../components/events/EventPhotoGallery';
import GameSearchModal from '../components/events/GameSearchModal';
import { useAuth } from '../contexts/AuthContext';
import type { Event, BGGGame, UpdateEventData, PendingInvitation } from '../types/event';
import type { ApiResponse } from '../types/auth';
import type { Invitation, InvitationCreateResponse } from '../types/invitation';
import { getCategoryDisplayName, getCategoryIcon } from '../types/badge';
import { displayName, fullNameTooltip } from '../utils/displayName';
import UserPopover from '../components/ui/UserPopover';

const DNI_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';
const isValidDniNie = (value: string): boolean => {
  const v = value.trim().toUpperCase();
  if (/^\d{8}[A-HJ-NP-TV-Z]$/.test(v)) {
    return v[8] === DNI_LETTERS[parseInt(v.slice(0, 8), 10) % 23];
  }
  if (/^[XYZ]\d{7}[A-HJ-NP-TV-Z]$/.test(v)) {
    const prefix: Record<string, string> = { X: '0', Y: '1', Z: '2' };
    return v[8] === DNI_LETTERS[parseInt(prefix[v[0]] + v.slice(1, 8), 10) % 23];
  }
  return false;
};

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUnregisterModalOpen, setIsUnregisterModalOpen] = useState(false);
  const [isCloseCapacityModalOpen, setIsCloseCapacityModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name?: string } | null>(null);
  const [inviteQrModal, setInviteQrModal] = useState<{ guestName: string; qrUrl: string } | null>(null);

  // Estado modal apuntar miembro
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [memberSearchResults, setMemberSearchResults] = useState<Array<{ id: string; name: string; avatar: string | null; membershipType: string | null }>>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);

  // Estado modal edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditGameModalOpen, setIsEditGameModalOpen] = useState(false);
  const [editSelectedGame, setEditSelectedGame] = useState<BGGGame | null>(null);
  const [editSelectedCategory, setEditSelectedCategory] = useState('');
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    date: '',
    startHour: '17',
    startMinute: '0',
    durationHours: '',
    durationMinutes: '0',
    location: '',
    address: '',
    maxAttendees: 4,
    requiresApproval: true,
  });

  // Estado QR de validación de partida
  const [showValidationQr, setShowValidationQr] = useState(false);

  // Fetch event details
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ event: Event }>>(`/api/events/${id}`);
      return response.data.data?.event;
    },
    enabled: !!id
  });

  const getErrorMessage = (err: unknown, fallback: string) => {
    if (typeof err !== 'object' || err === null) {
      return fallback;
    }
    if (!('response' in err)) {
      return fallback;
    }
    const response = (err as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message || fallback;
  };

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
    onError: (err: unknown) => {
      showError(getErrorMessage(err, 'Error al registrarse'));
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
    onError: (err: unknown) => {
      showError(getErrorMessage(err, 'Error al cancelar registro'));
    }
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const response = await api.delete(`/api/events/${id}/registrations/${registrationId}`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      success(data.message || 'Participante eliminado');
    },
    onError: (err: unknown) => {
      showError(getErrorMessage(err, 'Error al eliminar participante'));
    }
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await api.delete(`/api/invitations/${invitationId}`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['invitations', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      success(data.message || 'Invitacion cancelada');
    },
    onError: (err: unknown) => {
      showError(getErrorMessage(err, 'Error al cancelar invitacion'));
    }
  });

  const closeCapacityMutation = useMutation({
    mutationFn: async () => {
      if (!event) {
        throw new Error('Evento no disponible');
      }
      const response = await api.put(`/api/events/${id}`, {
        maxAttendees: event.registeredCount
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      success(data.message || 'Capacidad actualizada');
    },
    onError: (err: unknown) => {
      showError(getErrorMessage(err, 'Error al cerrar plazas'));
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
    onError: (err: unknown) => {
      showError(getErrorMessage(err, 'Error al eliminar partida'));
    }
  });
  const handleMemberSearch = async (query: string) => {
    setMemberSearchQuery(query);
    if (query.trim().length < 2) {
      setMemberSearchResults([]);
      return;
    }
    setMemberSearchLoading(true);
    try {
      const response = await api.get(`/api/events/members/search?q=${encodeURIComponent(query.trim())}`);
      setMemberSearchResults(response.data.data || []);
    } catch {
      setMemberSearchResults([]);
    } finally {
      setMemberSearchLoading(false);
    }
  };

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await api.post(`/api/events/${id}/add-member`, { userId });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsAddMemberModalOpen(false);
      setMemberSearchQuery('');
      setMemberSearchResults([]);
      success(data.message || 'Miembro apuntado correctamente');
    },
    onError: (err: unknown) => {
      showError(getErrorMessage(err, 'Error al apuntar miembro'));
    }
  });

  const editEventMutation = useMutation({
    mutationFn: async (data: UpdateEventData) => {
      const response = await api.put(`/api/events/${id}`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setIsEditModalOpen(false);
      success(data.message || 'Partida actualizada correctamente');
    },
    onError: (err: unknown) => {
      showError(getErrorMessage(err, 'Error al actualizar partida'));
    }
  });

  const handleOpenEditModal = () => {
    if (!event) return;
    const eventDate = new Date(event.date);
    setEditFormData({
      title: event.title,
      description: event.description || '',
      date: eventDate.toISOString().split('T')[0],
      startHour: event.startHour?.toString() ?? '17',
      startMinute: event.startMinute?.toString() ?? '0',
      durationHours: event.durationHours?.toString() ?? '',
      durationMinutes: event.durationMinutes?.toString() ?? '0',
      location: event.location || '',
      address: event.address ?? '',
      maxAttendees: event.maxAttendees,
      requiresApproval: event.requiresApproval ?? true,
    });
    setEditSelectedGame(event.bggId ? { id: event.bggId, name: event.gameName ?? '', image: event.gameImage ?? '', thumbnail: '', yearPublished: '' } : null);
    setEditSelectedCategory(event.gameCategory ?? '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = () => {
    const eventDate = new Date(editFormData.date);
    if (editFormData.startHour) eventDate.setHours(parseInt(editFormData.startHour));
    if (editFormData.startMinute) eventDate.setMinutes(parseInt(editFormData.startMinute));

    editEventMutation.mutate({
      title: editFormData.title,
      description: editFormData.description,
      date: eventDate.toISOString(),
      startHour: editFormData.startHour ? parseInt(editFormData.startHour) : undefined,
      startMinute: editFormData.startMinute !== '' ? parseInt(editFormData.startMinute) : undefined,
      durationHours: editFormData.durationHours ? parseInt(editFormData.durationHours) : undefined,
      durationMinutes: editFormData.durationMinutes !== '' ? parseInt(editFormData.durationMinutes) : undefined,
      location: editFormData.location || 'Club DN',
      address: editFormData.address || undefined,
      maxAttendees: editFormData.maxAttendees,
      requiresApproval: editFormData.requiresApproval,
      gameName: editSelectedGame?.name ?? null,
      gameImage: editSelectedGame?.image ?? null,
      bggId: editSelectedGame?.id ?? null,
      gameCategory: editSelectedCategory || null,
    });
  };

  const { data: invitations = [], isLoading: isInvitesLoading, isError: isInvitesError } = useQuery({
    queryKey: ['invitations', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Invitation[]>>(`/api/invitations?eventId=${id}`);
      return response.data.data || [];
    },
    enabled: !!id
  });

  // Fetch pending registrations (solo si es organizador o admin)
  const isOrganizerOrAdmin = isAdmin || user?.id === event?.createdBy;
  const { data: pendingRegistrations = [], refetch: refetchPending } = useQuery({
    queryKey: ['pending-registrations', id],
    queryFn: async () => {
      const response = await api.get(`/api/events/${id}/pending-registrations`);
      return response.data.data?.registrations || [];
    },
    enabled: !!id && isOrganizerOrAdmin
  });

  // Fetch pending invitations (visible para todos los asistentes)
  const { data: pendingInvitations = [], refetch: refetchPendingInvitations } = useQuery<PendingInvitation[]>({
    queryKey: ['pending-invitations', id],
    queryFn: async () => {
      const response = await api.get(`/api/events/${id}/pending-invitations`);
      return response.data.data || [];
    },
    enabled: !!id && !!user
  });

  const approveInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await api.post(`/api/events/${id}/invitations/${invitationId}/approve`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['pending-invitations', id] });
      queryClient.invalidateQueries({ queryKey: ['invitations', id] });
      refetchPendingInvitations();
      success(data.message || 'Invitación aprobada');
    },
    onError: (err: unknown) => {
      showError(getErrorMessage(err, 'Error al aprobar la invitación'));
    }
  });

  const rejectInvitationMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const response = await api.post(`/api/events/${id}/invitations/${invitationId}/reject`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['pending-invitations', id] });
      refetchPendingInvitations();
      success(data.message || 'Invitación rechazada');
    },
    onError: (err: unknown) => {
      showError(getErrorMessage(err, 'Error al rechazar la invitación'));
    }
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
      queryClient.invalidateQueries({ queryKey: ['pending-invitations', id] });
      setGuestFirstName('');
      setGuestLastName('');
      setGuestDni('');
      setIsExceptional(false);
      setQrUrl(data.data?.pendingApproval ? null : (data.data?.qrUrl || null));
      setExpandedInviteId(data.data?.pendingApproval ? null : (data.data?.invitation.id || null));
      success(data.message || 'Invitacion creada');
    },
    onError: (err: unknown) => {
      showError(getErrorMessage(err, 'Error al crear invitacion'));
    }
  });


  // Approve registration mutation
  const approveRegistrationMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const response = await api.post(`/api/events/${id}/registrations/${registrationId}/approve`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['pending-registrations', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      refetchPending();
      success(data.message || 'Registro aprobado');
    },
    onError: (err: unknown) => {
      showError(getErrorMessage(err, 'Error al aprobar registro'));
    }
  });

  // Reject registration mutation
  const rejectRegistrationMutation = useMutation({
    mutationFn: async (registrationId: string) => {
      const response = await api.post(`/api/events/${id}/registrations/${registrationId}/reject`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['pending-registrations', id] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      refetchPending();
      success(data.message || 'Registro rechazado');
    },
    onError: (err: unknown) => {
      showError(getErrorMessage(err, 'Error al rechazar registro'));
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

  const formatDateOnly = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };
  const formatClockTime = (date: Date) =>
    `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  const resolveEventStartDate = (date: string, startHour?: number | null, startMinute?: number | null) => {
    const baseDate = new Date(date);
    if (startHour !== null && startHour !== undefined) {
      baseDate.setHours(startHour, startMinute ?? 0, 0, 0);
      return baseDate;
    }

    // Fallback: usar hora embebida en `date` si existe.
    if (baseDate.getHours() === 0 && baseDate.getMinutes() === 0) {
      return null;
    }

    return baseDate;
  };
  const formatDurationText = (durationHours?: number | null, durationMinutes?: number | null) => {
    const hours = durationHours ?? 0;
    const minutes = durationMinutes ?? 0;

    if (hours <= 0 && minutes <= 0) return '';
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}min`;
  };
  const formatEventSchedule = (date: string, startHour?: number | null, startMinute?: number | null, durationHours?: number | null, durationMinutes?: number | null) => {
    const start = resolveEventStartDate(date, startHour, startMinute);
    if (!start) return '';

    const startText = formatClockTime(start);
    const totalMinutes = (durationHours ?? 0) * 60 + (durationMinutes ?? 0);
    if (totalMinutes <= 0) return startText;

    const end = new Date(start.getTime() + totalMinutes * 60 * 1000);
    const endText = formatClockTime(end);
    const durationText = formatDurationText(durationHours, durationMinutes);

    return durationText ? `${startText}-${endText} (${durationText})` : `${startText}-${endText}`;
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
    COMPLETED: 'bg-[var(--color-tableRowHover)] text-[var(--color-text)]',
    CANCELLED: 'bg-red-100 text-red-800'
  };

  const statusLabels = {
    SCHEDULED: 'Programado',
    ONGOING: 'En curso',
    COMPLETED: 'Completado',
    CANCELLED: 'Cancelado'
  };
  const invitationStatusLabels: Record<string, string> = {
    PENDING: 'Pendiente',
    PENDING_APPROVAL: 'Pend. aprobación',
    USED: 'Usada',
    EXPIRED: 'Expirada',
    CANCELLED: 'Cancelada'
  };
  const invitationStatusTooltips: Record<string, string> = {
    PENDING: 'La invitación está lista para ser usada en la entrada',
    PENDING_APPROVAL: 'El organizador debe aprobar esta invitación antes de que sea válida',
    USED: 'El invitado ya accedió al evento con esta invitación',
    EXPIRED: 'La invitación caducó sin ser utilizada',
    CANCELLED: 'La invitación fue cancelada'
  };
  const invitationStatusStyles: Record<string, string> = {
    PENDING: 'text-amber-700 bg-amber-100',
    PENDING_APPROVAL: 'text-orange-700 bg-orange-100',
    USED: 'text-emerald-700 bg-emerald-100',
    EXPIRED: 'text-[var(--color-textSecondary)] bg-[var(--color-tableRowHover)]',
    CANCELLED: 'text-red-700 bg-red-100'
  };
  const membershipLabels: Record<string, string> = {
    SOCIO: 'Socio',
    COLABORADOR: 'Colaborador'
  };

  const isPartida = event.type === 'PARTIDA';
  const eventStart = resolveEventStartDate(event.date, event.startHour, event.startMinute) ?? new Date(event.date);
  const isPast = eventStart < new Date();
  const isFull = (event.registeredCount || 0) >= event.maxAttendees;
  const isPendingApproval = event.userRegistrationStatus === 'PENDING_APPROVAL';
  const canRegister = event.status === 'SCHEDULED' && !isPast && !event.isUserRegistered && !isFull;
  const canUnregister = event.isUserRegistered && event.userRegistrationStatus !== 'CANCELLED' && !isPendingApproval && !isPast;
  const canInvite = event.status !== 'CANCELLED' && !isPast && !isFull;
  const canDelete = isPartida && !isPast && event.status !== 'CANCELLED' && (isAdmin || user?.id === event.createdBy);
  const canEdit = isOrganizerOrAdmin && event.status !== 'CANCELLED' && !isPast;
  const canAddMember = isOrganizerOrAdmin && event.status !== 'CANCELLED' && !isPast && !isFull;
  const canCloseCapacity = isPartida
    && !isPast
    && (isAdmin || user?.id === event.createdBy)
    && !isFull
    && (event.registeredCount || 0) > 0;

  // Ventana de validación QR: desde 1h antes del inicio hasta el final del día en que termina
  const validationWindowOpen = new Date(eventStart.getTime() - 60 * 60 * 1000);
  const durationMinutes = (event.durationHours ?? 0) * 60 + (event.durationMinutes ?? 0);
  const eventEndTime = new Date(eventStart.getTime() + durationMinutes * 60 * 1000);
  const validationWindowClose = new Date(eventEndTime);
  validationWindowClose.setHours(23, 59, 59, 999);
  const now = new Date();
  const isInValidationWindow = now >= validationWindowOpen && now <= validationWindowClose;

  // El usuario puede validar si: es PARTIDA, está inscrito como CONFIRMED, está en la ventana temporal, y la partida no está ya validada
  const canValidateQr = isPartida
    && isInValidationWindow
    && event.isUserRegistered
    && event.userRegistrationStatus === 'CONFIRMED'
    && event.disputeResult !== true;

  // URL que codifica el QR de validación de este usuario en esta partida
  const validationQrData = id && user?.id
    ? `${window.location.origin}/validate-game/${id}/${user.id}`
    : null;
  const validationQrImageUrl = validationQrData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(validationQrData)}`
    : null;

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
  const eventDateText = formatDateOnly(event.date);
  const eventScheduleText = formatEventSchedule(
    event.date,
    event.startHour,
    event.startMinute,
    event.durationHours,
    event.durationMinutes
  );
  const emojiCalendar = String.fromCodePoint(0x1F4C5);
  const emojiClock = String.fromCodePoint(0x1F550);
  const emojiLocation = String.fromCodePoint(0x1F4CD);

  const handleCreateInvitation = () => {
    if (!guestFirstName.trim()) {
      showError('Nombre requerido');
      return;
    }
    if (!guestLastName.trim()) {
      showError('Apellidos requeridos');
      return;
    }
    if (!isValidDniNie(guestDni.trim())) {
      showError('DNI o NIE no válido');
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
    } catch {
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

  const handleAddToCalendar = () => {
    if (!event) return;

    const pad = (n: number) => n.toString().padStart(2, '0');
    const toIcsDate = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

    const start = resolveEventStartDate(event.date, event.startHour, event.startMinute) ?? new Date(event.date);
    const totalMinutes = (event.durationHours ?? 2) * 60 + (event.durationMinutes ?? 0);
    const end = new Date(start.getTime() + totalMinutes * 60 * 1000);

    const location = [event.location, event.address].filter(Boolean).join(', ');
    const description = event.description ? event.description.replace(/\n/g, '\\n') : '';

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Club Dreadnought//ES',
      'BEGIN:VEVENT',
      `UID:${event.id}@clubdreadnought`,
      `DTSTAMP:${toIcsDate(new Date())}`,
      `DTSTART:${toIcsDate(start)}`,
      `DTEND:${toIcsDate(end)}`,
      `SUMMARY:${event.title}`,
      location ? `LOCATION:${location}` : '',
      description ? `DESCRIPTION:${description}` : '',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]/gi, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareWhatsApp = async () => {
    if (!event) return;

    const registeredCount = event.registeredCount || 0;
    const spotsLeft = event.maxAttendees - registeredCount;
    const spotsText = spotsLeft > 0
      ? `Plazas disponibles: ${spotsLeft} de ${event.maxAttendees}`
      : `COMPLETO (${registeredCount}/${event.maxAttendees})`;
    const scheduleText = formatEventSchedule(
      event.date,
      event.startHour,
      event.startMinute,
      event.durationHours,
      event.durationMinutes
    );
    const shareTimeText = scheduleText || 'Hora pendiente';

    const buildMessage = (shareUrl: string) => {
      let message = `*${event.title}*\n\n`;
      message += `${emojiCalendar} ${eventDateText}\n`;
      message += `${emojiClock} ${shareTimeText}\n`;
      if (event.type !== 'PARTIDA' && event.location) {
        message += `${emojiLocation} Lugar: ${event.location}\n`;
      }
      message += `\n${spotsText}\n`;

      if (event.description) {
        message += `\n${event.description}\n`;
      }

      // Indicar si hay socios apuntados (sin datos personales)
      const confirmedRegistrations = event.registrations?.filter(reg => reg.status === 'CONFIRMED') || [];
      const hasSocios = confirmedRegistrations.some(reg => reg.user?.membership?.type);

      if (hasSocios) {
        message += `\nHay socios apuntados\n`;
      }

      message += `\nApúntate aquí: ${shareUrl}`;
      return message;
    };

    // Abrir WhatsApp de forma síncrona (evita bloqueo de popup del navegador)
    // con la URL actual y luego intentar obtener la URL personalizada
    const fallbackUrl = window.location.href;
    const whatsappWindow = window.open(`https://wa.me/?text=${encodeURIComponent(buildMessage(fallbackUrl))}`, '_blank');

    // Intentar obtener URL personalizada y actualizar si es posible
    try {
      const res = await api.post<{ success: boolean; data: { url: string } }>('/api/share/generate', { eventId: event.id });
      if (res.data.success && whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.location.href = `https://wa.me/?text=${encodeURIComponent(buildMessage(res.data.data.url))}`;
      }
    } catch {
      // Ya se abrió con la URL de fallback, no hacer nada
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => navigate('/events')}
          className="flex items-center gap-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
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
                    className={`text-3xl font-bold text-[var(--color-text)] mb-2 ${
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
                    {event.isUserRegistered && event.userRegistrationStatus !== 'CANCELLED' && (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        event.userRegistrationStatus === 'CONFIRMED'
                          ? 'bg-green-100 text-green-800'
                          : event.userRegistrationStatus === 'PENDING_APPROVAL'
                          ? 'bg-amber-100 text-amber-800'
                          : event.userRegistrationStatus === 'WAITLIST'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {event.userRegistrationStatus === 'CONFIRMED'
                          ? 'Estás registrado'
                          : event.userRegistrationStatus === 'PENDING_APPROVAL'
                          ? 'Pendiente de aprobación'
                          : event.userRegistrationStatus === 'WAITLIST'
                          ? 'En lista de espera'
                          : event.userRegistrationStatus}
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
                      className="w-full sm:w-auto !bg-blue-600 hover:!bg-blue-700 !text-white transition-all duration-300"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span>{registerMutation.isPending ? 'Apuntándote...' : 'Apuntarme'}</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </span>
                    </Button>
                  )}

                  {canUnregister && (
                    <Button
                      onClick={() => setIsUnregisterModalOpen(true)}
                      disabled={unregisterMutation.isPending}
                      className="w-full sm:w-auto !bg-slate-500 hover:!bg-slate-600 !text-white transition-all duration-300"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span>{unregisterMutation.isPending ? 'Cancelando...' : 'No asistiré'}</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </span>
                    </Button>
                  )}

                  {isPendingApproval && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg w-full sm:w-auto">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium">Pendiente de aprobación</span>
                    </div>
                  )}

                  {isPast && !event.isUserRegistered && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg w-full sm:w-auto">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium">Partida ya empezada o finalizada</span>
                    </div>
                  )}

                  <Button
                    onClick={() => setIsInviteModalOpen(true)}
                    disabled={!canInvite}
                    className="w-full sm:w-auto !bg-indigo-500 hover:!bg-indigo-600 !text-white transition-all duration-300"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>Invitar externo</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                    </span>
                  </Button>

                  {isOrganizerOrAdmin && (
                    <Button
                      onClick={() => setIsAddMemberModalOpen(true)}
                      disabled={!canAddMember}
                      className="w-full sm:w-auto !bg-teal-600 hover:!bg-teal-700 !text-white transition-all duration-300"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span>Apuntar miembro</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </span>
                    </Button>
                  )}

                  <Button
                    onClick={handleAddToCalendar}
                    disabled={isPast || event.status === 'ONGOING' || event.status === 'COMPLETED'}
                    className="w-full sm:w-auto transition-all duration-300"
                    title="Añadir al calendario"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>Añadir al calendario</span>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </span>
                  </Button>

                  <Button
                    onClick={handleShareWhatsApp}
                    disabled={isPast || event.status === 'ONGOING' || event.status === 'COMPLETED'}
                    className="w-full sm:w-auto !bg-green-600 hover:!bg-green-700 !text-white transition-all duration-300"
                    title="Compartir por WhatsApp"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <span>WhatsApp</span>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </span>
                  </Button>
                  {canCloseCapacity && (
                    <Button
                      onClick={() => setIsCloseCapacityModalOpen(true)}
                      disabled={closeCapacityMutation.isPending}
                      className="w-full sm:w-auto bg-slate-200 hover:bg-slate-300 text-[var(--color-text)]"
                    >
                      {closeCapacityMutation.isPending ? 'Cerrando...' : 'Cerrar plazas'}
                    </Button>
                  )}

                  {canEdit && (
                    <Button
                      onClick={handleOpenEditModal}
                      className="w-full sm:w-auto !bg-amber-500 hover:!bg-amber-600 !text-white transition-all duration-300"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span>Editar</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </span>
                    </Button>
                  )}

                  {canDelete && (
                    <Button
                      onClick={() => setIsDeleteModalOpen(true)}
                      disabled={deleteEventMutation.isPending}
                      className="w-full sm:w-auto !bg-red-600 hover:!bg-red-700 !text-white transition-all duration-300"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span>{deleteEventMutation.isPending ? 'Eliminando...' : 'Eliminar'}</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </span>
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
                    <p className="text-sm text-[var(--color-textSecondary)]">Fecha y hora</p>
                    <p className="font-medium text-[var(--color-text)] capitalize">{eventDateText}</p>
                    {eventScheduleText && (
                      <p className="font-medium text-[var(--color-text)]">{eventScheduleText}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-[var(--color-primary)] mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <p className="text-sm text-[var(--color-textSecondary)]">Ubicación</p>
                    <p className="font-medium text-[var(--color-text)]">{event.location}</p>
                    {event.address && (
                      <p className="text-sm text-[var(--color-textSecondary)]">{event.address}</p>
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
                    <p className="text-sm text-[var(--color-textSecondary)]">Capacidad</p>
                    <p className="font-medium text-[var(--color-text)]">
                      {event.registeredCount} / {event.maxAttendees} asistentes
                    </p>
                    {(event.waitlistCount || 0) > 0 && (
                      <p className="text-sm text-[var(--color-textSecondary)]">
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
                    <p className="text-sm text-[var(--color-textSecondary)]">Organizador</p>
                    {event.organizer ? (
                      <UserPopover
                        userId={event.organizer.id}
                        name={event.organizer.name}
                        nick={event.organizer.profile?.nick}
                        avatar={event.organizer.profile?.avatar}
                        membershipType={event.organizer.membership?.type}
                      >
                        <span className="font-medium text-[var(--color-text)]">
                          {event.organizer.profile?.nick || event.organizer.name}
                        </span>
                      </UserPopover>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Descripción</h3>
              {event.description ? (
                <p className="text-[var(--color-textSecondary)] whitespace-pre-line">{event.description}</p>
              ) : (
                <p className="text-[var(--color-textSecondary)] italic">
                  {event.organizer?.profile?.nick || event.organizer?.name || 'El organizador'} no ha considerado necesario proporcionar una descripción para esta partida
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Validación QR de partida */}
        {(canValidateQr || event.disputeResult === true) && isPartida && event.isUserRegistered && event.userRegistrationStatus === 'CONFIRMED' && (
          <Card>
            <CardHeader>
              <CardTitle>Validación de partida</CardTitle>
            </CardHeader>
            <CardContent>
              {event.disputeResult === true ? (
                <p className="text-sm text-green-600 font-medium">Partida validada correctamente.</p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[var(--color-textSecondary)]">
                    Muestra tu QR a otro participante para validar la partida, o escanea el suyo.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={() => setShowValidationQr(v => !v)}
                      className="!bg-[var(--color-primary)] !text-white"
                    >
                      {showValidationQr ? 'Ocultar mi QR' : 'Mostrar mi QR'}
                    </Button>
                  </div>
                  {showValidationQr && validationQrImageUrl && (
                    <div className="flex flex-col items-center gap-2 pt-2">
                      <img src={validationQrImageUrl} alt="QR de validación" className="rounded-lg" width={180} height={180} />
                      <p className="text-xs text-[var(--color-textSecondary)]">Pide a otro participante que lo escanee</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Attendees */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Confirmed */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold text-[var(--color-text)]">
                Asistentes e invitados ({confirmed.length + (event.invitations?.filter(i => i.status !== 'CANCELLED').length || 0)})
              </h3>
            </CardHeader>
            <CardContent>
              {confirmed.length === 0 && (!event.invitations || event.invitations.length === 0) ? (
                <p className="text-[var(--color-textSecondary)] text-sm">Aún no hay asistentes ni invitados</p>
              ) : (
                <ul className="space-y-2">
                  {confirmed.map((registration) => (
                    <li key={registration.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-tableRowHover)]">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--color-primary-100)] flex items-center justify-center">
                        {registration.user?.profile?.avatar ? (
                          <img
                            src={registration.user.profile.avatar}
                            alt={registration.user?.name || 'Usuario'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[var(--color-primary)] font-semibold text-sm">
                            {displayName(registration.user?.name || '', registration.user?.profile?.nick).charAt(0).toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        {registration.user ? (
                          <UserPopover
                            userId={registration.userId}
                            name={registration.user.name}
                            nick={registration.user.profile?.nick}
                            avatar={registration.user.profile?.avatar}
                            membershipType={registration.user.membership?.type}
                          >
                            <span className="text-[var(--color-text)]">
                              {displayName(registration.user.name, registration.user.profile?.nick)}
                            </span>
                          </UserPopover>
                        ) : null}
                        {registration.user?.membership?.type &&
                          membershipLabels[registration.user.membership.type] && (
                            <span className="text-xs text-[var(--color-textSecondary)] bg-[var(--color-tableRowHover)] px-2 py-0.5 rounded-full">
                              {membershipLabels[registration.user.membership.type]}
                            </span>
                          )}
                      </div>
                      {(isAdmin || user?.id === event.createdBy) &&
                        registration.id &&
                        registration.user?.id !== event.createdBy && (
                        <button
                          onClick={() => {
                            setRemoveTarget({ id: registration.id, name: registration.user?.name });
                            setIsRemoveModalOpen(true);
                          }}
                          className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-200 hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      )}
                    </li>
                  ))}
                  {event.invitations?.filter((guest) => guest.status !== 'CANCELLED').map((guest) => (
                    <li key={guest.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-tableRowHover)]">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <span className="text-purple-600 font-semibold text-sm">
                          {guest.guestFirstName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[var(--color-text)] flex-1">{guest.guestFirstName} {guest.guestLastName}</span>
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Invitado</span>
                      <span className="relative group" tabIndex={0}>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full cursor-default select-none ${
                            invitationStatusStyles[guest.status] || 'text-[var(--color-textSecondary)] bg-[var(--color-tableRowHover)]'
                          }`}
                        >
                          {invitationStatusLabels[guest.status] || guest.status}
                        </span>
                        {invitationStatusTooltips[guest.status] && (
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-[200px] rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50 text-center whitespace-normal">
                            {invitationStatusTooltips[guest.status]}
                          </span>
                        )}
                      </span>
                      {(() => {
                        const inv = invitations.find(i => i.id === guest.id);
                        return inv?.qrUrl ? (
                          <button
                            onClick={() => setInviteQrModal({ guestName: `${guest.guestFirstName} ${guest.guestLastName}`, qrUrl: inv.qrUrl! })}
                            className="p-1 rounded text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary-100)] transition-colors"
                            title="Ver QR"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                            </svg>
                          </button>
                        ) : null;
                      })()}
                      {(isAdmin || user?.id === event.createdBy || (guest.inviterId && user?.id === guest.inviterId)) && (
                        <button
                          onClick={() => cancelInvitationMutation.mutate(guest.id)}
                          className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-200 hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      )}
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
                <h3 className="text-lg font-semibold text-[var(--color-text)]">
                  Lista de espera ({waitlist.length})
                </h3>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {waitlist.map((registration) => (
                    <li key={registration.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-tableRowHover)]">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-yellow-100 flex items-center justify-center">
                        {registration.user?.profile?.avatar ? (
                          <img
                            src={registration.user.profile.avatar}
                            alt={registration.user?.name || 'Usuario'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-yellow-600 font-semibold text-sm">
                            {displayName(registration.user?.name || '', registration.user?.profile?.nick).charAt(0).toUpperCase() || '?'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-1">
                        {registration.user ? (
                          <UserPopover
                            userId={registration.userId}
                            name={registration.user.name}
                            nick={registration.user.profile?.nick}
                            avatar={registration.user.profile?.avatar}
                            membershipType={registration.user.membership?.type}
                          >
                            <span className="text-[var(--color-text)]">
                              {displayName(registration.user.name, registration.user.profile?.nick)}
                            </span>
                          </UserPopover>
                        ) : null}
                        {registration.user?.membership?.type &&
                          membershipLabels[registration.user.membership.type] && (
                            <span className="text-xs text-[var(--color-textSecondary)] bg-[var(--color-tableRowHover)] px-2 py-0.5 rounded-full">
                              {membershipLabels[registration.user.membership.type]}
                            </span>
                          )}
                      </div>
                      {(isAdmin || user?.id === event.createdBy) &&
                        registration.id &&
                        registration.user?.id !== event.createdBy && (
                        <button
                          onClick={() => {
                            setRemoveTarget({ id: registration.id, name: registration.user?.name });
                            setIsRemoveModalOpen(true);
                          }}
                          className="text-xs text-red-700 bg-red-100 px-2 py-0.5 rounded-full cursor-pointer hover:bg-red-200 hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Pending Approvals Section - Solo visible para organizador/admin */}
        {isOrganizerOrAdmin && event.requiresApproval && pendingRegistrations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Solicitudes Pendientes ({pendingRegistrations.length})</span>
                <span className="text-sm font-normal text-[var(--color-textSecondary)]">
                  Ordenadas por fecha de solicitud
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingRegistrations.map((registration: any) => (
                  <div
                    key={registration.id}
                    className="flex items-center justify-between p-4 bg-[var(--color-tableRowHover)] rounded-lg border border-[var(--color-cardBorder)]"
                  >
                    <div className="flex items-center gap-3">
                      {registration.user.profile?.avatar ? (
                        <img
                          src={registration.user.profile.avatar}
                          alt={registration.user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center font-semibold">
                          {displayName(registration.user.name, registration.user.profile?.nick).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p
                          className="font-medium text-[var(--color-text)]"
                          title={fullNameTooltip(registration.user.name, registration.user.profile?.nick)}
                        >
                          {displayName(registration.user.name, registration.user.profile?.nick)}
                        </p>
                        <p className="text-xs text-[var(--color-textSecondary)]">
                          Solicitó el {new Date(registration.createdAt).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => approveRegistrationMutation.mutate(registration.id)}
                        disabled={approveRegistrationMutation.isPending || rejectRegistrationMutation.isPending}
                        className="!bg-green-600 hover:!bg-green-700"
                      >
                        {approveRegistrationMutation.isPending ? 'Aprobando...' : 'Aprobar'}
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => rejectRegistrationMutation.mutate(registration.id)}
                        disabled={approveRegistrationMutation.isPending || rejectRegistrationMutation.isPending}
                        className="!bg-red-600 hover:!bg-red-700"
                      >
                        {rejectRegistrationMutation.isPending ? 'Rechazando...' : 'Rechazar'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invitados pendientes de aprobación - visible para todos los asistentes */}
        {event.requiresApproval && pendingInvitations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Invitados pendientes de aprobación ({pendingInvitations.length})</span>
                <span className="text-sm font-normal text-[var(--color-textSecondary)]">Por orden de invitación</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingInvitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-4 bg-[var(--color-tableRowHover)] rounded-lg border border-[var(--color-cardBorder)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-semibold text-sm shrink-0">
                        {inv.guestFirstName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--color-text)]">
                          {inv.guestFirstName} {inv.guestLastName}
                        </p>
                        <p className="text-xs text-[var(--color-textSecondary)]">
                          Invitado por <span className="font-medium">{inv.inviter.name}</span>
                          {' · '}
                          {new Date(inv.createdAt).toLocaleString('es-ES', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    {isOrganizerOrAdmin && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => approveInvitationMutation.mutate(inv.id)}
                          disabled={approveInvitationMutation.isPending || rejectInvitationMutation.isPending}
                          className="!bg-green-600 hover:!bg-green-700"
                        >
                          {approveInvitationMutation.isPending ? '...' : 'Aprobar'}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => rejectInvitationMutation.mutate(inv.id)}
                          disabled={approveInvitationMutation.isPending || rejectInvitationMutation.isPending}
                          className="!bg-red-600 hover:!bg-red-700"
                        >
                          {rejectInvitationMutation.isPending ? '...' : 'Rechazar'}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Photo Gallery */}
        <Card>
          <CardContent className="p-6">
            <EventPhotoGallery
              eventId={id!}
              eventDate={event.date}
              canUpload={!!(event.isUserRegistered && event.userRegistrationStatus === 'CONFIRMED')}
              currentUserId={user?.id}
              isAdmin={isAdmin}
            />
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isRemoveModalOpen}
        onClose={() => {
          setIsRemoveModalOpen(false);
          setRemoveTarget(null);
        }}
        title="Eliminar asistente"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-textSecondary)]">
            {removeTarget?.name
              ? `¿Seguro que quieres eliminar a ${removeTarget.name} de la partida?`
              : '¿Seguro que quieres eliminar a este asistente de la partida?'}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsRemoveModalOpen(false);
                setRemoveTarget(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-400 text-black"
              onClick={() => {
                if (!removeTarget?.id) {
                  return;
                }
                removeParticipantMutation.mutate(removeTarget.id);
                setIsRemoveModalOpen(false);
                setRemoveTarget(null);
              }}
              disabled={removeParticipantMutation.isPending}
            >
              {removeParticipantMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>

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
                className="w-full sm:w-48 rounded-lg object-contain bg-[var(--color-tableRowHover)]"
              />
            )}
            <div className="grid grid-cols-2 gap-3 text-sm text-[var(--color-textSecondary)]">
              <div>
                <p className="text-xs text-[var(--color-textSecondary)]">Nota BGG</p>
                <p className="font-semibold">{formatNumber(event.game?.averageRating)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-textSecondary)]">Bayes</p>
                <p className="font-semibold">{formatNumber(event.game?.bayesAverage)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-textSecondary)]">Peso</p>
                <p className="font-semibold">{formatNumber(event.game?.complexityRating)}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-textSecondary)]">Ranking</p>
                <p className="font-semibold">{event.game?.rank ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-textSecondary)]">Jugadores</p>
                <p className="font-semibold">{playersText}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-textSecondary)]">Duracion</p>
                <p className="font-semibold">{timeText}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-textSecondary)]">Edad</p>
                <p className="font-semibold">{minAgeText}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--color-textSecondary)]">Año</p>
                <p className="font-semibold">{yearText}</p>
              </div>
            </div>
          </div>

          {gameDescription && (
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-textSecondary)] mb-2">Descripcion</h4>
              <p className="text-sm text-[var(--color-textSecondary)] whitespace-pre-line">{gameDescription}</p>
            </div>
          )}

          {(event.game?.categories?.length || event.game?.mechanics?.length) && (
            <div className="space-y-2 text-sm text-[var(--color-textSecondary)]">
              {event.game?.categories?.length ? (
                <div>
                  <p className="text-xs text-[var(--color-textSecondary)] mb-1">Categorias</p>
                  <p>{event.game.categories.join(', ')}</p>
                </div>
              ) : null}
              {event.game?.mechanics?.length ? (
                <div>
                  <p className="text-xs text-[var(--color-textSecondary)] mb-1">Mecanicas</p>
                  <p>{event.game.mechanics.join(', ')}</p>
                </div>
              ) : null}
            </div>
          )}

          {(event.game?.designers?.length || event.game?.publishers?.length) && (
            <div className="space-y-2 text-sm text-[var(--color-textSecondary)]">
              {event.game?.designers?.length ? (
                <div>
                  <p className="text-xs text-[var(--color-textSecondary)] mb-1">Diseñadores</p>
                  <p>{event.game.designers.join(', ')}</p>
                </div>
              ) : null}
              {event.game?.publishers?.length ? (
                <div>
                  <p className="text-xs text-[var(--color-textSecondary)] mb-1">Editoriales</p>
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
              <label className="block text-sm font-medium text-[var(--color-textSecondary)]">
                Nombre *
              </label>
              <input
                type="text"
                value={guestFirstName}
                onChange={(e) => setGuestFirstName(e.target.value)}
                minLength={2}
                className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                placeholder="Nombre"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-textSecondary)]">
                Apellidos *
              </label>
              <input
                type="text"
                value={guestLastName}
                onChange={(e) => setGuestLastName(e.target.value)}
                minLength={2}
                className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                placeholder="Apellidos"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-textSecondary)]">
                DNI / NIE *
              </label>
              <input
                type="text"
                value={guestDni}
                onChange={(e) => setGuestDni(e.target.value)}
                maxLength={9}
                className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                placeholder="12345678A"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--color-textSecondary)]">
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
                    !isValidDniNie(guestDni.trim())
                  }
                  variant="primary"
                >
                  {createInvitationMutation.isPending ? 'Creando...' : 'Crear invitacion'}
                </Button>
                {isAdmin && (
                  <label className="flex items-center gap-2 text-sm text-[var(--color-textSecondary)]">
                    <input
                      type="checkbox"
                      checked={isExceptional}
                      onChange={(e) => setIsExceptional(e.target.checked)}
                      className="w-4 h-4 text-[var(--color-primary)] border-[var(--color-inputBorder)] rounded focus:ring-[var(--color-primary)]"
                    />
                    Invitacion excepcional
                  </label>
                )}
              </div>
            </div>
          </div>

          {qrUrl && (
            <div className="border border-[var(--color-cardBorder)] rounded-lg p-4 bg-[var(--color-tableRowHover)]">
              <div className="flex flex-col md:flex-row gap-4 items-center">
                {qrImageUrl && (
                  <img
                    src={qrImageUrl}
                    alt="QR Invitacion"
                    className="w-44 h-44"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-[var(--color-textSecondary)]">Enlace del QR</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={qrUrl}
                      className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-cardBackground)] text-sm"
                    />
                    <Button onClick={handleCopyQr} variant="outline">
                      Copiar
                    </Button>
                  </div>
                  <p className="text-xs text-[var(--color-textSecondary)]">
                    Comparte este QR con el invitado. Es de un solo uso y válido solo para el {eventDateText}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!canInvite && (
            <p className="text-sm text-[var(--color-textSecondary)]">
              No se pueden crear invitaciones para eventos cancelados o pasados.
            </p>
          )}

          <div>
            <h4 className="text-sm font-semibold text-[var(--color-textSecondary)] mb-2">Invitaciones creadas</h4>
            {isInvitesLoading ? (
              <p className="text-sm text-[var(--color-textSecondary)]">Cargando invitaciones...</p>
            ) : isInvitesError ? (
              <p className="text-sm text-[var(--color-textSecondary)]">No tienes permisos para ver invitaciones.</p>
            ) : invitations.length === 0 ? (
              <p className="text-sm text-[var(--color-textSecondary)]">No hay invitaciones registradas.</p>
            ) : (
              <div className="space-y-2">
                {invitations.map((invite) => {
                  const isExpanded = expandedInviteId === invite.id;
                  return (
                    <div
                      key={invite.id}
                      onClick={() => handleToggleInviteQr(invite)}
                      className={`flex items-center justify-between p-3 border rounded-lg bg-[var(--color-tableRowHover)] ${
                        invite.qrUrl ? 'cursor-pointer hover:brightness-110' : ''
                      } ${
                        isExpanded ? 'border-[var(--color-primary)]' : 'border-[var(--color-cardBorder)]'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-[var(--color-text)]">
                          {invite.guestFirstName} {invite.guestLastName}
                        </p>
                        {invite.guestDniMasked && (
                          <p className="text-xs text-[var(--color-textSecondary)]">DNI: {invite.guestDniMasked}</p>
                        )}
                        <p className="text-xs text-[var(--color-textSecondary)]">
                          {new Date(invite.validDate).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                      <span className="relative group" tabIndex={0}>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium cursor-default select-none ${
                          invite.status === 'USED'
                            ? 'bg-green-700 text-green-100'
                            : invite.status === 'EXPIRED' || invite.status === 'CANCELLED'
                            ? 'bg-red-700 text-red-100'
                            : 'bg-yellow-700 text-yellow-100'
                        }`}>
                          {invitationStatusLabels[invite.status] || invite.status}
                        </span>
                        {invitationStatusTooltips[invite.status] && (
                          <span className="pointer-events-none absolute bottom-full right-0 mb-2 w-max max-w-[200px] rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-50 text-center whitespace-normal">
                            {invitationStatusTooltips[invite.status]}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal apuntar miembro */}
      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => {
          setIsAddMemberModalOpen(false);
          setMemberSearchQuery('');
          setMemberSearchResults([]);
        }}
        title="Apuntar miembro"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-textSecondary)]">
            Busca un miembro del club para apuntarlo directamente a esta partida.
          </p>
          <input
            type="text"
            value={memberSearchQuery}
            onChange={(e) => handleMemberSearch(e.target.value)}
            placeholder="Escribe el nombre del miembro..."
            autoFocus
            className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)]"
          />
          {memberSearchLoading && (
            <p className="text-sm text-[var(--color-textSecondary)]">Buscando...</p>
          )}
          {memberSearchResults.length > 0 && (
            <ul className="space-y-1 max-h-60 overflow-y-auto">
              {memberSearchResults.map(member => (
                <li key={member.id}>
                  <button
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-tableRowHover)] text-left transition-colors"
                    onClick={() => addMemberMutation.mutate(member.id)}
                    disabled={addMemberMutation.isPending}
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-[var(--color-tableRowHover)] flex items-center justify-center flex-shrink-0">
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[var(--color-primary)] font-semibold text-sm">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-medium text-[var(--color-text)]">{member.name}</span>
                      {member.membershipType && (
                        <span className="ml-2 text-xs text-[var(--color-textSecondary)] bg-[var(--color-tableRowHover)] px-2 py-0.5 rounded-full">
                          {member.membershipType}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {memberSearchQuery.trim().length >= 2 && !memberSearchLoading && memberSearchResults.length === 0 && (
            <p className="text-sm text-[var(--color-textSecondary)] text-center py-2">
              No se encontraron miembros con ese nombre.
            </p>
          )}
        </div>
      </Modal>

      {/* Modal de edición */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Editar partida"
        size="lg"
      >
        <div className="space-y-5">
          {/* Juego */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Juego (opcional)</label>
            {editSelectedGame ? (
              <div className="flex items-center gap-4 p-3 border-2 border-[var(--color-primary)] rounded-lg bg-[var(--color-cardBackground)]">
                {editSelectedGame.image && (
                  <img src={editSelectedGame.image} alt={editSelectedGame.name} className="w-12 h-12 object-cover rounded" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-sm text-[var(--color-text)]">{editSelectedGame.name}</p>
                </div>
                <button type="button" onClick={() => { setEditSelectedGame(null); setEditSelectedCategory(''); }} className="text-red-500 hover:text-red-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setIsEditGameModalOpen(true)} className="w-full px-4 py-3 border-2 border-dashed border-[var(--color-inputBorder)] rounded-lg hover:border-[var(--color-primary)] transition-colors text-[var(--color-textSecondary)] text-sm">
                Buscar juego en BoardGameGeek
              </button>
            )}
          </div>

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Categoría del juego (opcional)</label>
            <select value={editSelectedCategory} onChange={(e) => setEditSelectedCategory(e.target.value)} className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)]">
              <option value="">Sin categoría</option>
              <option value="EUROGAMES">{getCategoryIcon('EUROGAMES')} {getCategoryDisplayName('EUROGAMES')}</option>
              <option value="TEMATICOS">{getCategoryIcon('TEMATICOS')} {getCategoryDisplayName('TEMATICOS')}</option>
              <option value="WARGAMES">{getCategoryIcon('WARGAMES')} {getCategoryDisplayName('WARGAMES')}</option>
              <option value="ROL">{getCategoryIcon('ROL')} {getCategoryDisplayName('ROL')}</option>
              <option value="MINIATURAS">{getCategoryIcon('MINIATURAS')} {getCategoryDisplayName('MINIATURAS')}</option>
              <option value="WARHAMMER">{getCategoryIcon('WARHAMMER')} {getCategoryDisplayName('WARHAMMER')}</option>
              <option value="FILLERS_PARTY">{getCategoryIcon('FILLERS_PARTY')} {getCategoryDisplayName('FILLERS_PARTY')}</option>
            </select>
          </div>

          {/* Requiere aprobación */}
          <div className="flex items-center gap-3 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] px-4 py-3">
            <input id="edit-requiresApproval" type="checkbox" checked={editFormData.requiresApproval} onChange={(e) => setEditFormData(prev => ({ ...prev, requiresApproval: e.target.checked }))} className="h-4 w-4 rounded border-[var(--color-inputBorder)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
            <label htmlFor="edit-requiresApproval" className="text-sm text-[var(--color-textSecondary)]">Requiere aprobación del organizador</label>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Título *</label>
            <input type="text" required minLength={3} maxLength={100} value={editFormData.title} onChange={(e) => setEditFormData(prev => ({ ...prev, title: e.target.value }))} className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)]" />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Descripción (opcional)</label>
            <textarea rows={3} value={editFormData.description} onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))} className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] resize-none bg-[var(--color-inputBackground)] text-[var(--color-inputText)]" />
          </div>

          {/* Fecha y hora */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Fecha y hora *</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Fecha</label>
                <input type="date" required min={new Date().toISOString().split('T')[0]} value={editFormData.date} onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))} className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)] [color-scheme:dark]" />
              </div>
              <div>
                <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Hora</label>
                <select value={editFormData.startHour} onChange={(e) => setEditFormData(prev => ({ ...prev, startHour: e.target.value }))} className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)]">
                  <option value="">--</option>
                  {Array.from({ length: 24 }, (_, i) => i).map(h => <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Minutos</label>
                <select value={editFormData.startMinute} onChange={(e) => setEditFormData(prev => ({ ...prev, startMinute: e.target.value }))} className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)]">
                  {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Duración */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Duración estimada (opcional)</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Horas</label>
                <select value={editFormData.durationHours} onChange={(e) => setEditFormData(prev => ({ ...prev, durationHours: e.target.value }))} className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)]">
                  <option value="">--</option>
                  {Array.from({ length: 13 }, (_, i) => i).map(h => <option key={h} value={h}>{h}h</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Minutos</label>
                <select value={editFormData.durationMinutes} onChange={(e) => setEditFormData(prev => ({ ...prev, durationMinutes: e.target.value }))} className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)]">
                  {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m}min</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Capacidad */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Número máximo de jugadores *</label>
            <input type="number" required min={1} max={100} value={editFormData.maxAttendees} onChange={(e) => setEditFormData(prev => ({ ...prev, maxAttendees: parseInt(e.target.value) }))} className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)]" />
          </div>

          {/* Ubicación */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Ubicación</label>
            <input type="text" value={editFormData.location} onChange={(e) => setEditFormData(prev => ({ ...prev, location: e.target.value }))} placeholder="Club Dreadnought" className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)]" />
          </div>

          {/* Dirección */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Dirección (opcional)</label>
            <input type="text" value={editFormData.address} onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))} className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)]" />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button onClick={() => setIsEditModalOpen(false)} variant="outline">Cancelar</Button>
            <Button onClick={handleEditSubmit} variant="primary" disabled={editEventMutation.isPending || !editFormData.title.trim() || !editFormData.date}>
              {editEventMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </div>
      </Modal>

      <GameSearchModal
        isOpen={isEditGameModalOpen}
        onClose={() => setIsEditGameModalOpen(false)}
        onSelect={async (game) => {
          setEditSelectedGame(game);
          setIsEditGameModalOpen(false);
          try {
            const response = await api.get(`/api/games/${game.id}`);
            if (response.data?.data?.badgeCategory) {
              setEditSelectedCategory(response.data.data.badgeCategory);
            }
          } catch {
            // ignorar error al guardar juego en BD
          }
        }}
      />

      {/* Modal de confirmación de cerrar plazas */}
      <Modal
        isOpen={isCloseCapacityModalOpen}
        onClose={() => setIsCloseCapacityModalOpen(false)}
        title="Cerrar plazas"
      >
        <div className="space-y-4">
          <p className="text-[var(--color-textSecondary)]">
            ¿Quieres cerrar la partida al número actual de asistentes?
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => setIsCloseCapacityModalOpen(false)}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                closeCapacityMutation.mutate();
                setIsCloseCapacityModalOpen(false);
              }}
              disabled={closeCapacityMutation.isPending}
            >
              {closeCapacityMutation.isPending ? 'Cerrando...' : 'Aceptar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Eliminar partida"
      >
        <div className="space-y-4">
          <p className="text-[var(--color-textSecondary)]">
            ¿Estás seguro de que quieres eliminar esta partida? Se marcará como cancelada.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => setIsDeleteModalOpen(false)}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                deleteEventMutation.mutate();
                setIsDeleteModalOpen(false);
              }}
              disabled={deleteEventMutation.isPending}
              variant="danger"
            >
              {deleteEventMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmación de abandono */}
      <Modal
        isOpen={isUnregisterModalOpen}
        onClose={() => setIsUnregisterModalOpen(false)}
        title="Abandonar partida"
      >
        <div className="space-y-4">
          <p className="text-[var(--color-textSecondary)]">
            ¿Estás seguro de que quieres abandonar esta partida? Se notificará al organizador y al resto de jugadores.
          </p>
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => setIsUnregisterModalOpen(false)}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                unregisterMutation.mutate();
                setIsUnregisterModalOpen(false);
              }}
              disabled={unregisterMutation.isPending}
              variant="danger"
            >
              {unregisterMutation.isPending ? 'Abandonando...' : 'Abandonar partida'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal QR invitación individual */}
      {inviteQrModal && (
        <Modal
          isOpen={true}
          onClose={() => setInviteQrModal(null)}
          title={`QR — ${inviteQrModal.guestName}`}
          size="sm"
        >
          <div className="flex flex-col items-center gap-4">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(inviteQrModal.qrUrl)}`}
              alt="QR Invitación"
              className="w-44 h-44"
            />
            <div className="w-full space-y-2">
              <p className="text-sm text-[var(--color-textSecondary)]">Enlace del QR</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteQrModal.qrUrl}
                  className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-cardBackground)] text-sm"
                />
                <Button
                  onClick={() => navigator.clipboard.writeText(inviteQrModal.qrUrl).then(() => success('Enlace copiado')).catch(() => showError('No se pudo copiar el enlace'))}
                  variant="outline"
                >
                  Copiar
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}

