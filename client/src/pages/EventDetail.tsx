// client/src/pages/EventDetail.tsx
import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardContent, CardTitle } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import InfoTooltip from '../components/ui/InfoTooltip';
import { useToast } from '../hooks/useToast';
import { useDebounce } from '../hooks/useDebounce';
import { api } from '../api/axios';
import { GameImage } from '../components/events/EventCard';
import EventExpansions from '../components/events/EventExpansions';
import EventPhotoGallery from '../components/events/EventPhotoGallery';
import GameSearchModal from '../components/events/GameSearchModal';
import GameDetailModal from '../components/games/GameDetailModal';
import { useAuth } from '../contexts/AuthContext';
import type { Event, BGGGame, UpdateEventData, PendingInvitation, CreatePartidaCloneState } from '../types/event';
import type { ApiResponse } from '../types/auth';
import type { UserProfile } from '../types/profile';
import type { Invitation } from '../types/invitation';
import { getCategoryDisplayName, getCategoryIcon } from '../types/badge';
import { displayName, fullNameTooltip } from '../utils/displayName';
import UserPopover from '../components/ui/UserPopover';
import FirstPlayerModal from '../components/events/FirstPlayerModal';
import { isMagicTheGatheringBggId } from '../utils/eventRules';
import { isChemiRole, isElevatedRole } from '../utils/roles';

// ---------- tipos resultados ----------
interface EventResultEntry {
  id: string;
  userId: string | null;
  guestName: string | null;
  score: number | null;
  isWinner: boolean;
  notes: string | null;
  user: { id: string; name: string; profile?: { nick?: string | null; avatar?: string | null } | null } | null;
  creator: { id: string; name: string };
}

interface ResultRow {
  userId: string;
  userName: string;
  score: string;
  isWinner: boolean;
  guestName: string;
  isGuest: boolean;
  notes: string;
  invitationId?: string;
}


export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();
  const { isAdmin, user } = useAuth();
  const isChemi = isChemiRole(user?.role);
  const [disputeConfirmModal, setDisputeConfirmModal] = useState<'played' | 'not-played' | null>(null);
  const [isShareLinkModalOpen, setIsShareLinkModalOpen] = useState(false);
  const [shareLinkUrl, setShareLinkUrl] = useState<string | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedGameSource, setSelectedGameSource] = useState<'bgg' | 'rpggeek'>('bgg');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUnregisterModalOpen, setIsUnregisterModalOpen] = useState(false);
  const [isCloseCapacityModalOpen, setIsCloseCapacityModalOpen] = useState(false);
  const [isRemoveModalOpen, setIsRemoveModalOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{ id: string; name?: string } | null>(null);
  const [removalReason, setRemovalReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');

  // Estado modal apuntar miembro
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const debouncedMemberSearch = useDebounce(memberSearchQuery, 350);
  const [memberSearchResults, setMemberSearchResults] = useState<Array<{ id: string; name: string; nick: string | null; avatar: string | null; membershipType: string | null; email: string | null }>>([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);

  // Estado modal primer jugador
  const [showFirstPlayerModal, setShowFirstPlayerModal] = useState(false);

  // Estado dropdown opciones
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [optionsPos, setOptionsPos] = useState<{ top: number; right: number } | null>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const optionsDesktopRef = useRef<HTMLDivElement>(null);
  const optionsBtnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const inMobileSheet = optionsRef.current?.contains(e.target as Node);
      const inDesktopMenu = optionsDesktopRef.current?.contains(e.target as Node);
      const inBtn = optionsBtnRef.current?.contains(e.target as Node);
      if (!inMobileSheet && !inDesktopMenu && !inBtn) {
        setIsOptionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleOptions = () => {
    if (!isOptionsOpen && optionsBtnRef.current) {
      const rect = optionsBtnRef.current.getBoundingClientRect();
      setOptionsPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
    setIsOptionsOpen(prev => !prev);
  };

  // Estado modal edición
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditGameModalOpen, setIsEditGameModalOpen] = useState(false);
  const [isEditExpansionModalOpen, setIsEditExpansionModalOpen] = useState(false);
  const [isEditLinkedGameModalOpen, setIsEditLinkedGameModalOpen] = useState(false);
  const [editSelectedGame, setEditSelectedGame] = useState<BGGGame | null>(null);
  const [editSelectedExpansions, setEditSelectedExpansions] = useState<BGGGame[]>([]);
  const [editLinkedNextGame, setEditLinkedNextGame] = useState<BGGGame | null>(null);
  const [editLinkedDurationHours, setEditLinkedDurationHours] = useState('1');
  const [editLinkedDurationMinutes, setEditLinkedDurationMinutes] = useState('0');
  const [editSelectedCategory, setEditSelectedCategory] = useState('');
  const [editConfirmedCategory, setEditConfirmedCategory] = useState<string | null>(null);
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
    allowLateJoin: false,
  });

  // Estado QR de validación de partida
  const [showValidationQr, setShowValidationQr] = useState(false);
  const [resultEditing, setResultEditing] = useState(false);
  const [resultRows, setResultRows] = useState<ResultRow[]>([]);
  const [tiebreakModal, setTiebreakModal] = useState<{ rowIndex: number } | null>(null);
  const [tiebreakNotes, setTiebreakNotes] = useState('');

  // Configuración pública del club (para spinEffect)
  const { data: publicConfig } = useQuery({
    queryKey: ['publicConfig'],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: { spinEffect: string } }>('/api/config/public');
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });
  const spinEffect = (publicConfig?.spinEffect ?? 'ruleta') as 'ruleta' | 'spotlight';

  // Fetch event details
  const { data: event, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ event: Event }>>(`/api/events/${id}`);
      return response.data.data?.event;
    },
    enabled: !!id
  });

  const { data: profileData } = useQuery({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ profile: UserProfile }>>('/api/profile/me');
      return response.data.data?.profile;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user,
  });

  const useMulticolorButtons = (profileData?.eventButtonStyle ?? 'dropdown') === 'multicolor';

  // Resultados de partida
  const { data: existingResults, isLoading: resultsLoading } = useQuery({
    queryKey: ['eventResults', id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<EventResultEntry[]>>(`/api/events/${id}/results`);
      return res.data.data ?? [];
    },
    enabled: !!id,
  });

  const saveResultsMutation = useMutation({
    mutationFn: async () => {
      const results = resultRows
        .filter((r) => r.userName.trim() || r.guestName.trim())
        .map((r) => ({
          userId: r.isGuest ? undefined : (r.userId || undefined),
          guestName: r.isGuest ? r.guestName.trim() : undefined,
          score: r.score !== '' ? parseInt(r.score) : undefined,
          isWinner: r.isWinner,
          notes: r.notes?.trim() || undefined,
        }));
      await api.put(`/api/events/${id}/results`, { results });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventResults', id] });
      setResultEditing(false);
      success('Resultados guardados');
    },
    onError: () => showError('Error al guardar los resultados'),
  });

  const startResultEditing = () => {
    if (existingResults && existingResults.length > 0) {
      setResultRows(
        existingResults.map((r) => ({
          userId: r.userId ?? '',
          userName: displayName(r.user?.name ?? '', r.user?.profile?.nick),
          score: r.score !== null ? String(r.score) : '',
          isWinner: r.isWinner,
          guestName: r.guestName ?? '',
          isGuest: !r.userId,
          notes: r.notes ?? '',
        }))
      );
    } else {
      // Precargar socios confirmados e invitados del evento
      const confirmedRows: ResultRow[] = (event?.registrations?.filter((r) => r.status === 'CONFIRMED') ?? []).map((r) => ({
        userId: r.userId,
        userName: displayName(r.user?.name ?? '', r.user?.profile?.nick),
        score: '',
        isWinner: false,
        guestName: '',
        isGuest: false,
        notes: '',
      }));
      const invitationRows: ResultRow[] = (event?.invitations?.filter((i) => i.status !== 'CANCELLED') ?? []).map((i) => ({
        userId: '',
        userName: '',
        guestName: `${i.guestFirstName} ${i.guestLastName}`.trim(),
        score: '',
        isWinner: false,
        isGuest: true,
        notes: '',
        invitationId: i.id,
      }));
      setResultRows([...confirmedRows, ...invitationRows]);
    }
    setResultEditing(true);
  };

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

  const ensureGameInCatalog = async (game: BGGGame) => {
    const isRpg = game.id.startsWith('rpgg-');
    const endpoint = isRpg ? `/api/games/rpgg/${game.id.slice(5)}` : `/api/games/${game.id}`;
    return api.get(endpoint);
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
    mutationFn: async ({ registrationId, reason }: { registrationId: string; reason: string }) => {
      const response = await api.delete(`/api/events/${id}/registrations/${registrationId}`, { data: { removalReason: reason } });
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
    mutationFn: async (reason: string) => {
      const response = await api.delete(`/api/events/${id}`, { data: { cancellationReason: reason } });
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
  useEffect(() => {
    const q = debouncedMemberSearch.trim();
    if (q.length < 2) {
      setMemberSearchResults([]);
      return;
    }
    let cancelled = false;
    setMemberSearchLoading(true);
    api.get(`/api/events/members/search?q=${encodeURIComponent(q)}`)
      .then(res => { if (!cancelled) setMemberSearchResults(res.data.data || []); })
      .catch(() => { if (!cancelled) setMemberSearchResults([]); })
      .finally(() => { if (!cancelled) setMemberSearchLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedMemberSearch]);

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
      allowLateJoin: event.allowLateJoin ?? false,
    });
    setEditSelectedGame(event.bggId ? { id: event.bggId, name: event.gameName ?? '', image: event.gameImage ?? '', thumbnail: '', yearPublished: '' } : null);
    setEditSelectedExpansions(
      (event.expansions ?? []).map((expansion) => ({
        id: expansion.gameId,
        name: expansion.name,
        image: expansion.image ?? '',
        thumbnail: expansion.thumbnail ?? '',
        yearPublished: '',
        itemType: 'boardgameexpansion',
      }))
    );
    setEditLinkedNextGame(
      event.linkedNextEvent?.bggId && event.linkedNextEvent.gameName
        ? {
            id: event.linkedNextEvent.bggId,
            name: event.linkedNextEvent.gameName ?? event.linkedNextEvent.title,
            image: event.linkedNextEvent.gameImage ?? '',
            thumbnail: '',
            yearPublished: '',
          }
        : null
    );
    setEditLinkedDurationHours(event.linkedNextEvent?.durationHours?.toString() ?? '1');
    setEditLinkedDurationMinutes(event.linkedNextEvent?.durationMinutes?.toString() ?? '0');
    setEditSelectedCategory(event.gameCategory ?? '');
    setEditConfirmedCategory(event.confirmedCategory ?? null);
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
      location: editFormData.location || 'Club Dreadnought',
      address: editFormData.address || undefined,
      maxAttendees: editFormData.maxAttendees,
      requiresApproval: editFormData.requiresApproval,
      allowLateJoin: editFormData.allowLateJoin,
      gameName: editSelectedGame?.name ?? null,
      gameImage: editSelectedGame?.image ?? null,
      bggId: editSelectedGame?.id ?? null,
      expansions: editSelectedExpansions.map((expansion) => ({ gameId: expansion.id })),
      gameCategory: editSelectedCategory || null,
      linkedNext: editLinkedNextGame
        ? {
            gameId: editLinkedNextGame.id,
            durationHours: editLinkedDurationHours !== '' ? parseInt(editLinkedDurationHours) : undefined,
            durationMinutes: editLinkedDurationMinutes !== '' ? parseInt(editLinkedDurationMinutes) : undefined,
          }
        : null,
    });
  };

  const handleEditExpansionSelect = async (game: BGGGame) => {
    await ensureGameInCatalog(game);
    setEditSelectedExpansions((current) => (
      current.some((expansion) => expansion.id === game.id)
        ? current
        : [...current, { ...game, itemType: 'boardgameexpansion' }]
    ));
  };

  const handleRemoveEditExpansion = (gameId: string) => {
    setEditSelectedExpansions((current) => current.filter((expansion) => expansion.id !== gameId));
  };

  const handleEditLinkedGameSelect = async (game: BGGGame) => {
    await ensureGameInCatalog(game);
    setEditLinkedNextGame(game);
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

  const confirmPlayedMutation = useMutation({
    mutationFn: () => api.post(`/api/events/${id}/confirm-played`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      setDisputeConfirmModal(null);
      success('Partida confirmada como disputada');
    },
    onError: (err: unknown) => showError(getErrorMessage(err, 'Error al confirmar'))
  });

  const confirmNotPlayedMutation = useMutation({
    mutationFn: () => api.post(`/api/events/${id}/confirm-not-played`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      setDisputeConfirmModal(null);
      success('Partida marcada como no disputada');
    },
    onError: (err: unknown) => showError(getErrorMessage(err, 'Error al confirmar'))
  });

  const generateShareLinkMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<ApiResponse<{ url: string }>>('/api/share/generate', { eventId: id });
      return response.data;
    },
    onSuccess: (data) => {
      setShareLinkUrl(data.data?.url || null);
      queryClient.invalidateQueries({ queryKey: ['event', id] });
    },
    onError: (err: unknown) => {
      showError(getErrorMessage(err, 'Error al generar el enlace de invitación'));
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
  const calcLinkedEstimatedStartDate = (prev: NonNullable<Event['linkedPreviousEvent']>) => {
    const previousStart = resolveEventStartDate(prev.date, prev.startHour, prev.startMinute);
    if (!previousStart) return null;

    const previousDurationMinutes = (prev.durationHours ?? 0) * 60 + (prev.durationMinutes ?? 0);
    if (previousDurationMinutes <= 0) return null;

    return new Date(previousStart.getTime() + previousDurationMinutes * 60 * 1000);
  };
  const formatScheduleFromStart = (start: Date, durationHours?: number | null, durationMinutes?: number | null) => {
    const startText = formatClockTime(start);
    const totalMinutes = (durationHours ?? 0) * 60 + (durationMinutes ?? 0);
    if (totalMinutes <= 0) return startText;

    const end = new Date(start.getTime() + totalMinutes * 60 * 1000);
    const endText = formatClockTime(end);
    const durationText = formatDurationText(durationHours, durationMinutes);

    return durationText ? `${startText}-${endText} (${durationText})` : `${startText}-${endText}`;
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
    COLABORADOR: 'Colaborador',
    FAMILIAR: 'Familiar',
    EN_PRUEBAS: 'En pruebas'
  };

  const isPartida = event.type === 'PARTIDA';
  const eventStart = resolveEventStartDate(event.date, event.startHour, event.startMinute) ?? new Date(event.date);
  const isPast = eventStart < new Date();

  const effectiveStatus = (() => {
    if (event.status === 'CANCELLED') return 'CANCELLED';
    if (event.status === 'COMPLETED') return 'COMPLETED';
    const now = new Date();
    const durationMs = ((event.durationHours ?? 0) * 60 + (event.durationMinutes ?? 0)) * 60 * 1000;
    const end = new Date(eventStart.getTime() + durationMs);
    if (now >= end) return 'COMPLETED';
    if (now >= eventStart) return 'ONGOING';
    return 'SCHEDULED';
  })();
  const isFull = (event.registeredCount || 0) >= event.maxAttendees;
  const isPendingApproval = event.userRegistrationStatus === 'PENDING_APPROVAL';
  const inheritsRegistrationsFromPrevious = Boolean(event.linkedPreviousEvent);
  const canLateJoin = (Boolean(event.allowLateJoin) || isMagicTheGatheringBggId(event.bggId)) && effectiveStatus === 'ONGOING';
  const canRegister = !event.isUserRegistered
    && !isFull
    && !inheritsRegistrationsFromPrevious
    && (effectiveStatus === 'SCHEDULED' || canLateJoin);
  const canUnregister = event.isUserRegistered && event.userRegistrationStatus !== 'CANCELLED' && !isPast && !inheritsRegistrationsFromPrevious;
  const canInvite = !isFull
    && !inheritsRegistrationsFromPrevious
    && (effectiveStatus === 'SCHEDULED' || canLateJoin);
  const canDelete = isPartida && !isPast && event.status !== 'CANCELLED' && (isAdmin || user?.id === event.createdBy);
  const canEdit = isOrganizerOrAdmin && event.status !== 'CANCELLED' && !isPast;
  const canAddMemberNormally = isOrganizerOrAdmin
    && !isFull
    && !inheritsRegistrationsFromPrevious
    && (effectiveStatus === 'SCHEDULED' || canLateJoin);
  const canAddMemberWithChemiOverride = isOrganizerOrAdmin
    && !inheritsRegistrationsFromPrevious
    && effectiveStatus !== 'CANCELLED';
  const canAddMember = isChemi ? canAddMemberWithChemiOverride : canAddMemberNormally;
  const showChemiAddMemberIndicator = canAddMember && isChemi && !canAddMemberNormally;
  const canClone = isPartida && isOrganizerOrAdmin && ['SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED'].includes(event.status);
  const canCloseCapacity = isPartida
    && !isPast
    && (isAdmin || user?.id === event.createdBy)
    && !isFull
    && (event.registeredCount || 0) > 0;
  const canShareWhatsApp = !isPast && event.status !== 'ONGOING' && event.status !== 'COMPLETED' && !isFull;
  const isEditMagicSelected = isMagicTheGatheringBggId(editSelectedGame?.id);
  const canConfigureLateJoin = isChemi || isEditMagicSelected;

  // Ventana de validación QR: desde 1h antes del inicio hasta 24h tras el fin estimado
  const validationWindowOpen = new Date(eventStart.getTime() - 60 * 60 * 1000);
  const durationMinutes = (event.durationHours ?? 0) * 60 + (event.durationMinutes ?? 0);
  const eventEndTime = new Date(eventStart.getTime() + durationMinutes * 60 * 1000);
  const validationWindowClose = new Date(eventEndTime.getTime() + 24 * 60 * 60 * 1000);
  const now = new Date();
  const isInValidationWindow = now >= validationWindowOpen && now <= validationWindowClose;

  // Ventana de resultados: desde el inicio de la partida hasta 24h tras el fin estimado
  const isSuperAdmin = isElevatedRole(user?.role);
  const resultsWindowClose = new Date(eventEndTime.getTime() + 24 * 60 * 60 * 1000);
  const isInResultsWindow = isSuperAdmin || (isPartida && now >= eventStart && now <= resultsWindowClose);
  // Pueden añadir/editar resultados: organizador, admin, o participante confirmado; dentro de la ventana temporal
  const canAddResults = isInResultsWindow && (isAdmin || user?.id === event.createdBy || (event.isUserRegistered && event.userRegistrationStatus === 'CONFIRMED'));

  // El usuario puede validar si: es PARTIDA, está inscrito como CONFIRMED, está en la ventana temporal, y la partida no está ya validada
  const canValidateQr = isPartida
    && isInValidationWindow
    && event.isUserRegistered
    && event.userRegistrationStatus === 'CONFIRMED'
    && event.disputeResult !== true;

  // Puede girar la ruleta si es PARTIDA con al menos 2 asistentes confirmados con cuenta y el usuario es uno de ellos
  // Ventana: desde 1h antes del inicio hasta 2h después del inicio
  const firstPlayerWindowOpen = new Date(eventStart.getTime() - 60 * 60 * 1000);
  const firstPlayerWindowClose = new Date(eventStart.getTime() + 2 * 60 * 60 * 1000);
  const isInFirstPlayerWindow = now >= firstPlayerWindowOpen && now <= firstPlayerWindowClose;
  const confirmedMembersCount = (event.registrations ?? []).filter(r => r.status === 'CONFIRMED' && r.user).length;
  const canSpinFirstPlayer = isPartida
    && isInFirstPlayerWindow
    && event.isUserRegistered
    && event.userRegistrationStatus === 'CONFIRMED'
    && confirmedMembersCount >= 2;

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
  const canShowGameDetails = isPartida && !!event.bggId;
  const expansionsLabel = (event.expansions ?? []).map((expansion) => expansion.name).join(', ');
  const eventDateText = formatDateOnly(event.date);
  const linkedEstimatedStart = event.linkedPreviousEvent
    ? calcLinkedEstimatedStartDate(event.linkedPreviousEvent)
    : null;
  const eventScheduleText = linkedEstimatedStart
    ? `Inicio estimado: ${formatScheduleFromStart(linkedEstimatedStart, event.durationHours, event.durationMinutes)}`
    : formatEventSchedule(
        event.date,
        event.startHour,
        event.startMinute,
        event.durationHours,
        event.durationMinutes
      );

  const handleCloseShareLinkModal = () => {
    setIsShareLinkModalOpen(false);
    setShareLinkUrl(null);
    setShareLinkCopied(false);
  };

  const handleOpenGameModal = () => {
    if (!event?.bggId) return;
    setSelectedGameSource(event.bggId.startsWith('rpgg-') ? 'rpggeek' : 'bgg');
    setSelectedGameId(event.bggId.startsWith('rpgg-') ? event.bggId.replace('rpgg-', '') : event.bggId);
  };

  const handleOpenExpansionModal = (gameId: string) => {
    setSelectedGameSource(gameId.startsWith('rpgg-') ? 'rpggeek' : 'bgg');
    setSelectedGameId(gameId.startsWith('rpgg-') ? gameId.replace('rpgg-', '') : gameId);
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
      ? `Asistentes: ${registeredCount} de ${event.maxAttendees} (${spotsLeft} ${spotsLeft === 1 ? 'plaza libre' : 'plazas libres'})`
      : `Asistentes: ${registeredCount} de ${event.maxAttendees} (COMPLETO)`;
    const scheduleText = formatEventSchedule(
      event.date,
      event.startHour,
      event.startMinute,
      event.durationHours,
      event.durationMinutes
    );
    const shareTimeText = scheduleText || 'Hora pendiente';

    const capitalizeFirst = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);
    const dateTextCapitalized = capitalizeFirst(eventDateText);

    const buildMessage = (shareUrl: string) => {
      // Título: solo si no hay imagen (si hay imagen ya sale en la previsualización)
      let message = '';
      if (!gameImageUrl) {
        message += `*${event.title}*\n\n`;
      }

      // Fecha y hora
      message += `· ${dateTextCapitalized}\n`;
      message += `· ${shareTimeText}\n`;

      if (event.type !== 'PARTIDA' && event.location) {
        message += `· Lugar: ${event.location}\n`;
      }

      if (event.description) {
        message += `\n${event.description}\n`;
      }

      if (expansionsLabel) {
        message += `\nExpansiones: ${expansionsLabel}\n`;
      }

      if (event.linkedNextEvent?.gameName) {
        message += `\nDespués se jugará: ${event.linkedNextEvent.gameName}\n`;
      }

      message += `\n${spotsText}\n`;

      // Indicar si hay socios apuntados (sin datos personales)
      const confirmedRegistrations = event.registrations?.filter(reg => reg.status === 'CONFIRMED') || [];
      const hasSocios = confirmedRegistrations.some(reg => reg.user?.membership?.type === 'SOCIO');

      if (hasSocios) {
        message += `\nHay socios apuntados\n`;
      }

      message += `\nMás info aquí: ${shareUrl}`;
      return message;
    };

    // Usamos la URL de preview como enlace del mensaje: genera los meta tags OG (imagen)
    // y redirige automáticamente a los usuarios a la app
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const previewUrl = `${apiBase}/preview/events/${event.id}?v=${Date.now()}`;

    const whatsappWindow = window.open(`https://wa.me/?text=${encodeURIComponent(buildMessage(previewUrl))}`, '_blank');
    void whatsappWindow;
  };

  const handleCloneEvent = () => {
    if (!event || !canClone) return;

    const confirmedAttendees = (event.registrations || [])
      .filter((registration) => registration.status === 'CONFIRMED' && registration.user)
      .map((registration) => ({
        id: registration.user!.id,
        name: registration.user!.name,
        nick: registration.user!.profile?.nick ?? null,
        avatar: registration.user!.profile?.avatar ?? null,
        membershipType: registration.user!.membership?.type ?? null
      }));

    const cloneState: CreatePartidaCloneState = {
      mode: 'clone',
      sourceEventId: event.id,
      sourceTitle: event.title,
      sourceStatus: event.status,
      prefill: {
        title: event.title,
        description: event.description,
        gameName: event.gameName ?? null,
        gameImage: event.gameImage ?? null,
        bggId: event.bggId ?? null,
        expansions: (event.expansions ?? []).map((expansion) => ({
          gameId: expansion.gameId,
          name: expansion.name,
          image: expansion.image ?? null,
          thumbnail: expansion.thumbnail ?? null,
        })),
        gameCategory: event.gameCategory ?? null,
        location: event.location || 'Club Dreadnought',
        address: event.address ?? null,
        maxAttendees: event.maxAttendees,
        requiresApproval: event.requiresApproval ?? true,
        allowLateJoin: event.allowLateJoin ?? false,
        startHour: event.startHour ?? null,
        startMinute: event.startMinute ?? null,
        durationHours: event.durationHours ?? null,
        durationMinutes: event.durationMinutes ?? null
      },
      clonedAttendees: confirmedAttendees,
      hadExternalGuests: (event.invitations?.filter((invitation) => invitation.status !== 'CANCELLED').length ?? 0) > 0
    };

    navigate('/events/crear-partida', { state: cloneState });
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
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[effectiveStatus as keyof typeof statusColors]}`}>
                    {statusLabels[effectiveStatus as keyof typeof statusLabels]}
                  </span>
                  {inheritsRegistrationsFromPrevious && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
                      Asistencia heredada de la partida principal
                    </span>
                  )}
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
                        <span>{unregisterMutation.isPending ? 'Cancelando...' : isPendingApproval ? 'Cancelar solicitud' : 'No asistiré'}</span>
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

                  {/* Botones secundarios: dropdown u multicolor según preferencia del usuario */}
                  {useMulticolorButtons ? (
                    <>
                      <Button
                        onClick={() => setIsShareLinkModalOpen(true)}
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
                            <span className="flex items-center gap-1">
                              <span>Apuntar miembro</span>
                              {showChemiAddMemberIndicator && (
                                <span title="Habilitado por override de rol CHEMI">‼️</span>
                              )}
                            </span>
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
                      >
                        <span className="flex items-center justify-center gap-2">
                          <span>Añadir al calendario</span>
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </span>
                      </Button>
                      {canShareWhatsApp && (
                        <Button
                          onClick={handleShareWhatsApp}
                          className="w-full sm:w-auto !bg-green-600 hover:!bg-green-700 !text-white transition-all duration-300"
                        >
                          <span className="flex items-center justify-center gap-2">
                            <span>WhatsApp</span>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </span>
                        </Button>
                      )}
                      {canSpinFirstPlayer && (
                        <Button
                          onClick={() => setShowFirstPlayerModal(true)}
                          className="w-full sm:w-auto !bg-amber-500 hover:!bg-amber-600 !text-white transition-all duration-300"
                        >
                          <span className="flex items-center justify-center gap-2">
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <rect x="2" y="2" width="20" height="20" rx="3" ry="3" strokeLinecap="round" strokeLinejoin="round"/>
                              <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/>
                              <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none"/>
                              <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none"/>
                              <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none"/>
                              <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>
                            </svg>
                            <span>Jugador inicial</span>
                          </span>
                        </Button>
                      )}
                      {canClone && (
                        <Button
                          onClick={handleCloneEvent}
                          className="w-full sm:w-auto !bg-sky-600 hover:!bg-sky-700 !text-white transition-all duration-300"
                        >
                          <span className="flex items-center justify-center gap-2">
                            <span>Clonar partida</span>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h6m-7 8h8a2 2 0 002-2V7a2 2 0 00-2-2h-1l-.447-.894A1 1 0 0013.658 3h-3.316a1 1 0 00-.895.553L9 5H8a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </span>
                        </Button>
                      )}
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
                    </>
                  ) : (
                  /* Dropdown Opciones */
                  <div className="relative">
                    <Button
                      ref={optionsBtnRef}
                      onClick={handleToggleOptions}
                      className="w-full sm:w-auto transition-all duration-300"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span>Opciones</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    </Button>
                    {/* Bottom sheet en móvil */}
                    {isOptionsOpen && (
                      <div
                        className="sm:hidden fixed inset-0 z-[9999]"
                        onClick={() => setIsOptionsOpen(false)}
                      >
                        <div className="absolute inset-0 bg-black/40" />
                        <div
                          ref={optionsRef}
                          className="absolute bottom-0 left-0 right-0 bg-[var(--color-cardBackground)] rounded-t-2xl shadow-xl overflow-hidden"
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-[var(--color-cardBorder)]" />
                          </div>
                          <div className="px-2 pb-safe pb-6">
                            {isOrganizerOrAdmin && (
                              <button
                                onClick={() => { setIsAddMemberModalOpen(true); setIsOptionsOpen(false); }}
                                disabled={!canAddMember}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--color-cardBorder)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3 rounded-lg"
                              >
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                <span className="flex items-center gap-1">
                                  <span>Apuntar miembro</span>
                                  {showChemiAddMemberIndicator && (
                                    <span title="Habilitado por override de rol CHEMI">‼️</span>
                                  )}
                                </span>
                              </button>
                            )}
                            <button
                              onClick={() => { setIsShareLinkModalOpen(true); setIsOptionsOpen(false); }}
                              disabled={!canInvite}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--color-cardBorder)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3 rounded-lg"
                            >
                              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                              Invitar externo
                            </button>
                            {canShareWhatsApp && (
                              <button
                                onClick={() => { handleShareWhatsApp(); setIsOptionsOpen(false); }}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--color-cardBorder)] flex items-center gap-3 rounded-lg"
                              >
                                <svg className="w-5 h-5 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                WhatsApp
                              </button>
                            )}
                            {canSpinFirstPlayer && (
                              <button
                                onClick={() => { setShowFirstPlayerModal(true); setIsOptionsOpen(false); }}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--color-cardBorder)] flex items-center gap-3 rounded-lg"
                              >
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                                  <rect x="2" y="2" width="20" height="20" rx="3" ry="3" strokeLinecap="round" strokeLinejoin="round"/>
                                  <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/>
                                  <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none"/>
                                  <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none"/>
                                  <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none"/>
                                  <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>
                                </svg>
                                Jugador inicial
                              </button>
                            )}
                            {canCloseCapacity && (
                              <button
                                onClick={() => { setIsCloseCapacityModalOpen(true); setIsOptionsOpen(false); }}
                                disabled={closeCapacityMutation.isPending}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--color-cardBorder)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3 rounded-lg"
                              >
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                {closeCapacityMutation.isPending ? 'Cerrando...' : 'Cerrar plazas'}
                              </button>
                            )}
                            <button
                              onClick={() => { handleAddToCalendar(); setIsOptionsOpen(false); }}
                              disabled={isPast || event.status === 'ONGOING' || event.status === 'COMPLETED'}
                              className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--color-cardBorder)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3 rounded-lg"
                            >
                              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                              Añadir al calendario
                            </button>
                            {canClone && (
                              <button
                                onClick={() => { handleCloneEvent(); setIsOptionsOpen(false); }}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--color-cardBorder)] flex items-center gap-3 rounded-lg"
                              >
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h6m-7 8h8a2 2 0 002-2V7a2 2 0 00-2-2h-1l-.447-.894A1 1 0 0013.658 3h-3.316a1 1 0 00-.895.553L9 5H8a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                Clonar partida
                              </button>
                            )}
                            {canEdit && (
                              <button
                                onClick={() => { handleOpenEditModal(); setIsOptionsOpen(false); }}
                                className="w-full text-left px-4 py-3 text-sm hover:bg-[var(--color-cardBorder)] flex items-center gap-3 rounded-lg"
                              >
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                Editar
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => { setIsDeleteModalOpen(true); setIsOptionsOpen(false); }}
                                disabled={deleteEventMutation.isPending}
                                className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-[var(--color-cardBorder)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-3 rounded-lg"
                              >
                                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                {deleteEventMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* Dropdown desktop */}
                    {isOptionsOpen && optionsPos && (
                      <div
                        ref={optionsDesktopRef}
                        className="hidden sm:block fixed w-52 rounded-lg shadow-xl bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] overflow-hidden"
                        style={{ top: optionsPos.top, right: optionsPos.right, zIndex: 9999 }}
                      >
                        {isOrganizerOrAdmin && (
                          <button
                            onClick={() => { setIsAddMemberModalOpen(true); setIsOptionsOpen(false); }}
                            disabled={!canAddMember}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-cardBorder)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="flex items-center gap-1">
                              <span>Apuntar miembro</span>
                              {showChemiAddMemberIndicator && (
                                <span title="Habilitado por override de rol CHEMI">‼️</span>
                              )}
                            </span>
                          </button>
                        )}
                        <button
                          onClick={() => { setIsShareLinkModalOpen(true); setIsOptionsOpen(false); }}
                          disabled={!canInvite}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-cardBorder)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                          Invitar externo
                        </button>
                        {canShareWhatsApp && (
                          <button
                            onClick={() => { handleShareWhatsApp(); setIsOptionsOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-cardBorder)] flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                            WhatsApp
                          </button>
                        )}
                        {canSpinFirstPlayer && (
                          <button
                            onClick={() => { setShowFirstPlayerModal(true); setIsOptionsOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-cardBorder)] flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                              <rect x="2" y="2" width="20" height="20" rx="3" ry="3" strokeLinecap="round" strokeLinejoin="round"/>
                              <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none"/>
                              <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none"/>
                              <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none"/>
                              <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none"/>
                              <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>
                            </svg>
                            Jugador inicial
                          </button>
                        )}
                        {canCloseCapacity && (
                          <button
                            onClick={() => { setIsCloseCapacityModalOpen(true); setIsOptionsOpen(false); }}
                            disabled={closeCapacityMutation.isPending}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-cardBorder)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            {closeCapacityMutation.isPending ? 'Cerrando...' : 'Cerrar plazas'}
                          </button>
                        )}
                        <button
                          onClick={() => { handleAddToCalendar(); setIsOptionsOpen(false); }}
                          disabled={isPast || event.status === 'ONGOING' || event.status === 'COMPLETED'}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-cardBorder)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Añadir al calendario
                        </button>
                        {canClone && (
                          <button
                            onClick={() => { handleCloneEvent(); setIsOptionsOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-cardBorder)] flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-6 4h6m-7 8h8a2 2 0 002-2V7a2 2 0 00-2-2h-1l-.447-.894A1 1 0 0013.658 3h-3.316a1 1 0 00-.895.553L9 5H8a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            Clonar partida
                          </button>
                        )}
                        {canEdit && (
                          <button
                            onClick={() => { handleOpenEditModal(); setIsOptionsOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-[var(--color-cardBorder)] flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Editar
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => { setIsDeleteModalOpen(true); setIsOptionsOpen(false); }}
                            disabled={deleteEventMutation.isPending}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-[var(--color-cardBorder)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {deleteEventMutation.isPending ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
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

            {!!event.expansions?.length && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Expansiones</h3>
                <EventExpansions
                  expansions={event.expansions}
                  onOpenGame={handleOpenExpansionModal}
                  variant="cards"
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:flex-wrap"
                />

                {inheritsRegistrationsFromPrevious && (
                  <p className="mt-3 text-sm text-[var(--color-textSecondary)]">
                    Los asistentes de esta partida enlazada se gestionan automáticamente desde la partida principal. No puedes apuntarte ni borrarte aquí por separado.
                  </p>
                )}
              </div>
            )}

            {event.linkedNextEvent && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Después se jugará</h3>
                <button
                  type="button"
                  onClick={() => navigate(`/events/${event.linkedNextEvent!.id}`)}
                  className="w-full flex items-center gap-3 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-3 text-left hover:border-[var(--color-primary)] transition-colors"
                >
                  <GameImage
                    src={event.linkedNextEvent.gameImage || null}
                    alt={event.linkedNextEvent.gameName || event.linkedNextEvent.title}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--color-text)]">{event.linkedNextEvent.gameName || event.linkedNextEvent.title}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">Partida enlazada</p>
                  </div>
                  <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}

            {event.linkedPreviousEvent && (
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Partida anterior enlazada</h3>
                <button
                  type="button"
                  onClick={() => navigate(`/events/${event.linkedPreviousEvent!.id}`)}
                  className="w-full flex items-center gap-3 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-3 text-left hover:border-[var(--color-primary)] transition-colors"
                >
                  <GameImage
                    src={event.linkedPreviousEvent.gameImage || null}
                    alt={event.linkedPreviousEvent.gameName || event.linkedPreviousEvent.title}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--color-text)]">{event.linkedPreviousEvent.gameName || event.linkedPreviousEvent.title}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">Evento principal</p>
                  </div>
                  <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
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

        {/* Confirmación de disputa por el organizador */}
        {isOrganizerOrAdmin && isPartida && event.status === 'COMPLETED' && event.disputeResult === null && (
          <Card>
            <CardHeader>
              <CardTitle>¿Se celebró esta partida?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-[var(--color-textSecondary)]">
                Solo podrás marcarlo una vez y no podrá deshacerse.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  onClick={() => setDisputeConfirmModal('played')}
                  className="flex-1"
                >
                  Sí, se jugó
                </Button>
                <Button
                  onClick={() => setDisputeConfirmModal('not-played')}
                  className="flex-1"
                >
                  No llegó a jugarse
                </Button>
              </div>
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
                      {!inheritsRegistrationsFromPrevious &&
                        (isAdmin || user?.id === event.createdBy) &&
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
                          {guest.status === 'RESERVED' ? '?' : (guest.guestFirstName?.charAt(0).toUpperCase() ?? '?')}
                        </span>
                      </div>
                      <span className="text-[var(--color-text)] flex-1">
                        {guest.status === 'RESERVED'
                          ? 'Plaza reservada'
                          : `${guest.guestFirstName ?? ''} ${guest.guestLastName ?? ''}`.trim()}
                      </span>
                      <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Invitado</span>
                      {guest.status !== 'RESERVED' && (invitationStatusTooltips[guest.status] ? (
                        <InfoTooltip
                          content={invitationStatusTooltips[guest.status]}
                          ariaLabel={`Información del estado ${invitationStatusLabels[guest.status] || guest.status}`}
                        >
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full cursor-help select-none ${
                              invitationStatusStyles[guest.status] || 'text-[var(--color-textSecondary)] bg-[var(--color-tableRowHover)]'
                            }`}
                          >
                            {invitationStatusLabels[guest.status] || guest.status}
                          </span>
                        </InfoTooltip>
                      ) : (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full select-none ${
                            invitationStatusStyles[guest.status] || 'text-[var(--color-textSecondary)] bg-[var(--color-tableRowHover)]'
                          }`}
                        >
                          {invitationStatusLabels[guest.status] || guest.status}
                        </span>
                      ))}
                      {(isAdmin || user?.id === event.createdBy || (guest.inviterId && user?.id === guest.inviterId)) &&
                        (guest.status !== 'USED' || isAdmin) && (
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
                      {!inheritsRegistrationsFromPrevious &&
                        (isAdmin || user?.id === event.createdBy) &&
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
        {isOrganizerOrAdmin && event.requiresApproval && !inheritsRegistrationsFromPrevious && pendingRegistrations.length > 0 && (
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
                          Solicitó el {new Date(registration.updatedAt ?? registration.createdAt).toLocaleDateString('es-ES', {
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

        {/* Resultados de partida */}
        {isPartida && (existingResults && existingResults.length > 0 || canAddResults) && (
          <Card>
            <CardHeader>
              <CardTitle>Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              {resultsLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !resultEditing && existingResults && existingResults.length > 0 ? (
                <div className="space-y-2">
                  {existingResults.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-tableRowHover)]">
                      {r.isWinner && <span title="Ganador">🏆</span>}
                      <span className="flex-1 text-sm text-[var(--color-text)] font-medium">
                        {r.user ? (
                          <UserPopover
                            userId={r.user.id}
                            name={r.user.name}
                            nick={r.user.profile?.nick}
                            avatar={r.user.profile?.avatar}
                          >
                            <span>{displayName(r.user.name, r.user.profile?.nick)}</span>
                          </UserPopover>
                        ) : (
                          <>{r.guestName ?? 'Invitado'}<span className="ml-1 text-xs text-[var(--color-textSecondary)]">(invitado)</span></>
                        )}
                        {r.isWinner && r.notes && (
                          <span className="ml-1 text-xs text-[var(--color-textSecondary)]">({r.notes})</span>
                        )}
                      </span>
                      {r.score !== null && (
                        <span className="text-sm text-[var(--color-textSecondary)] font-mono">{r.score} pts</span>
                      )}
                    </div>
                  ))}
                  {canAddResults && (
                    <button onClick={startResultEditing} className="mt-2 text-sm text-[var(--color-primary)] hover:underline">
                      Editar resultados
                    </button>
                  )}
                </div>
              ) : !resultEditing ? (
                <div className="text-center py-2">
                  <p className="text-sm text-[var(--color-textSecondary)] mb-3">No hay resultados registrados.</p>
                  {canAddResults && (
                    <Button onClick={startResultEditing} className="!bg-[var(--color-primary)] !text-white">
                      Añadir resultados
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {resultRows.map((row, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2 p-2 border border-[var(--color-cardBorder)] rounded-lg">
                      <label className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
                        <input
                          type="checkbox"
                          checked={row.isGuest}
                          onChange={(e) => setResultRows((prev) => prev.map((r, idx) => idx === i ? { ...r, isGuest: e.target.checked } : r))}
                        />
                        Invitado
                      </label>
                      {row.isGuest ? (
                        <input
                          type="text"
                          value={row.guestName}
                          onChange={(e) => setResultRows((prev) => prev.map((r, idx) => idx === i ? { ...r, guestName: e.target.value } : r))}
                          placeholder="Nombre del invitado"
                          className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-[var(--color-cardBorder)] rounded bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                        />
                      ) : (
                        <input
                          type="text"
                          value={row.userName}
                          readOnly
                          className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-[var(--color-cardBorder)] rounded bg-[var(--color-tableRowHover)] text-[var(--color-text)] cursor-default"
                        />
                      )}
                      <input
                        type="number"
                        value={row.score}
                        onChange={(e) => {
                          const newScore = e.target.value;
                          setResultRows((prev) => {
                            const updated = prev.map((r, idx) => idx === i ? { ...r, score: newScore } : r);
                            // Recalcular ganador automáticamente
                            const scores = updated.map((r) => r.score !== '' ? parseInt(r.score) : NaN).filter((s) => !isNaN(s));
                            if (scores.length === 0) return updated;
                            const maxScore = Math.max(...scores);
                            return updated.map((r) => ({
                              ...r,
                              isWinner: r.score !== '' && !isNaN(parseInt(r.score)) && parseInt(r.score) === maxScore,
                            }));
                          });
                        }}
                        placeholder="Puntos"
                        className="w-20 px-2 py-1 text-sm border border-[var(--color-cardBorder)] rounded bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                      />
                      <label className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
                        <input
                          type="checkbox"
                          checked={row.isWinner}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (checked) {
                              const currentWinners = resultRows.filter((r, idx) => idx !== i && r.isWinner);
                              if (currentWinners.length > 0) {
                                // Ya hay otro ganador → pedir motivo de empate
                                setTiebreakModal({ rowIndex: i });
                                setTiebreakNotes('');
                                return;
                              }
                            }
                            setResultRows((prev) => prev.map((r, idx) => idx === i ? { ...r, isWinner: checked } : r));
                          }}
                        />
                        Ganador
                      </label>
                      <button
                        onClick={() => setResultRows((prev) => prev.filter((_, idx) => idx !== i))}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        Quitar
                      </button>
                    </div>
                  ))}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setResultEditing(false)}
                      className="px-4 py-2 text-sm border border-[var(--color-cardBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)]"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => saveResultsMutation.mutate()}
                      disabled={saveResultsMutation.isPending}
                      className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                      {saveResultsMutation.isPending ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              )}

              {/* Modal motivo de empate */}
              {tiebreakModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  <div className="absolute inset-0 bg-black/50" onClick={() => setTiebreakModal(null)} />
                  <div className="relative bg-[var(--color-cardBackground)] rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
                    <h3 className="text-base font-bold text-[var(--color-text)]">Victoria compartida</h3>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      Ya hay otro ganador marcado. Puedes indicar el motivo del empate o la victoria compartida (opcional).
                    </p>
                    <input
                      type="text"
                      value={tiebreakNotes}
                      onChange={(e) => setTiebreakNotes(e.target.value)}
                      placeholder="Ej: Puntuación de criterio de desempate"
                      className="w-full px-3 py-2 text-sm border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                    />
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setTiebreakModal(null)}
                        className="px-4 py-2 text-sm border border-[var(--color-cardBorder)] rounded-lg text-[var(--color-text)] hover:bg-[var(--color-tableRowHover)]"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          const notes = tiebreakNotes.trim();
                          setResultRows((prev) => prev.map((r, idx) => {
                            if (idx === tiebreakModal.rowIndex) return { ...r, isWinner: true, notes };
                            if (r.isWinner) return { ...r, notes };
                            return r;
                          }));
                          setTiebreakModal(null);
                          setTiebreakNotes('');
                        }}
                        className="px-4 py-2 text-sm bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
          setRemovalReason('');
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
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
              Motivo <span className="text-red-500">*</span>
            </label>
            <select
              value={removalReason}
              onChange={(e) => setRemovalReason(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Selecciona un motivo...</option>
              <option value="No se presentó">No se presentó</option>
              <option value="Comportamiento inadecuado">Comportamiento inadecuado</option>
              <option value="Solicitud del propio jugador">Solicitud del propio jugador</option>
              <option value="Aforo reducido">Aforo reducido</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsRemoveModalOpen(false);
                setRemoveTarget(null);
                setRemovalReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-400 text-black"
              onClick={() => {
                if (!removeTarget?.id || !removalReason) return;
                removeParticipantMutation.mutate({ registrationId: removeTarget.id, reason: removalReason });
                setIsRemoveModalOpen(false);
                setRemoveTarget(null);
                setRemovalReason('');
              }}
              disabled={removeParticipantMutation.isPending || !removalReason}
            >
              {removeParticipantMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </Modal>

      <GameDetailModal
        gameId={selectedGameId}
        isOpen={selectedGameId !== null}
        onClose={() => setSelectedGameId(null)}
        source={selectedGameSource}
      />

      {disputeConfirmModal !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setDisputeConfirmModal(null)}
        >
          <div
            className="bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-[var(--color-text)]">¿Estás seguro?</h2>
            <p className="text-sm text-[var(--color-textSecondary)]">
              Esta acción es irreversible. Una vez confirmada no podrás cambiarla.
            </p>
            <div className="flex gap-3 mt-2">
              <Button
                onClick={() => setDisputeConfirmModal(null)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                className="flex-1"
                disabled={confirmPlayedMutation.isPending || confirmNotPlayedMutation.isPending}
                onClick={() => {
                  if (disputeConfirmModal === 'played') confirmPlayedMutation.mutate();
                  else confirmNotPlayedMutation.mutate();
                }}
              >
                {(confirmPlayedMutation.isPending || confirmNotPlayedMutation.isPending) ? 'Confirmando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={isShareLinkModalOpen}
        onClose={handleCloseShareLinkModal}
        title="Invitar a alguien"
        size="sm"
      >
        <div className="space-y-5">
          <p className="text-sm text-[var(--color-textSecondary)]">
            Genera un enlace único y envíaselo a tu invitado por WhatsApp. Él rellenará sus datos y recibirá un QR para entrar al club. Al generar el enlace se creará una reserva de plaza por 15 minutos para que el invitado pueda apuntarse.
          </p>
          <p className="text-sm text-[var(--color-textSecondary)]">
            Cuando tu invitado acepte, recarga la página para ver su nombre en la lista de asistentes.
          </p>

          {shareLinkUrl && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 bg-[var(--color-tableRowHover)] border border-[var(--color-cardBorder)] rounded-lg">
                <p className="text-sm text-[var(--color-text)] flex-1 break-all">{shareLinkUrl}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareLinkUrl);
                    setShareLinkCopied(true);
                    setTimeout(() => setShareLinkCopied(false), 2000);
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium bg-[var(--color-primary)] text-white hover:opacity-90 transition-opacity"
                >
                  {shareLinkCopied ? 'Copiado' : 'Copiar'}
                </button>
              </div>
              <p className="text-xs text-[var(--color-textSecondary)]">
                Envía este enlace a tu invitado por WhatsApp. El enlace es reutilizable para esta partida.
              </p>
            </div>
          )}

          <Button
            onClick={() => generateShareLinkMutation.mutate()}
            disabled={generateShareLinkMutation.isPending || !canInvite}
            variant="primary"
            className="w-full"
          >
            {generateShareLinkMutation.isPending
              ? 'Generando...'
              : shareLinkUrl ? 'Reservar otra plaza' : 'Generar enlace de invitación'}
          </Button>

          {!canInvite && (
            <p className="text-sm text-[var(--color-textSecondary)]">
              No se pueden crear invitaciones para eventos cancelados o pasados.
            </p>
          )}

          <div>
            <h4 className="text-sm font-semibold text-[var(--color-textSecondary)] mb-2">Invitaciones</h4>
            {isInvitesLoading ? (
              <p className="text-sm text-[var(--color-textSecondary)]">Cargando...</p>
            ) : isInvitesError ? (
              <p className="text-sm text-[var(--color-textSecondary)]">No tienes permisos para ver invitaciones.</p>
            ) : invitations.length === 0 ? (
              <p className="text-sm text-[var(--color-textSecondary)]">Aún no hay invitaciones para esta partida.</p>
            ) : (
              <div className="space-y-2">
                {invitations.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-3 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-tableRowHover)]"
                  >
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text)]">
                        {invite.guestFirstName} {invite.guestLastName}
                      </p>
                      <p className="text-xs text-[var(--color-textSecondary)]">
                        {new Date(invite.validDate).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    {invitationStatusTooltips[invite.status] ? (
                      <InfoTooltip
                        content={invitationStatusTooltips[invite.status]}
                        ariaLabel={`Información del estado ${invitationStatusLabels[invite.status] || invite.status}`}
                      >
                        <span className={`px-2 py-1 rounded-full text-xs font-medium cursor-help select-none ${
                          invite.status === 'USED'
                            ? 'bg-green-700 text-green-100'
                            : invite.status === 'EXPIRED' || invite.status === 'CANCELLED'
                              ? 'bg-red-700 text-red-100'
                              : 'bg-yellow-700 text-yellow-100'
                        }`}>
                          {invitationStatusLabels[invite.status] || invite.status}
                        </span>
                      </InfoTooltip>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium select-none ${
                        invite.status === 'USED'
                          ? 'bg-green-700 text-green-100'
                          : invite.status === 'EXPIRED' || invite.status === 'CANCELLED'
                            ? 'bg-red-700 text-red-100'
                            : 'bg-yellow-700 text-yellow-100'
                      }`}>
                        {invitationStatusLabels[invite.status] || invite.status}
                      </span>
                    )}
                  </div>
                ))}
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
            onChange={(e) => setMemberSearchQuery(e.target.value)}
            placeholder="Escribe nombre, apellidos, nick o email..."
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
                      <div className="flex items-center flex-wrap gap-x-1">
                        <span className="text-sm font-medium text-[var(--color-text)]">{member.name}</span>
                        {member.nick && (
                          <span className="text-sm text-[var(--color-textSecondary)]">({member.nick})</span>
                        )}
                        {member.membershipType && (
                          <span className="text-xs text-[var(--color-textSecondary)] bg-[var(--color-tableRowHover)] px-2 py-0.5 rounded-full">
                            {member.membershipType}
                          </span>
                        )}
                      </div>
                      {member.email && (
                        <p className="text-xs text-[var(--color-textSecondary)] mt-0.5">Encontrado por email: {member.email}</p>
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
                <button type="button" onClick={() => { setEditSelectedGame(null); setEditSelectedExpansions([]); setEditLinkedNextGame(null); setEditSelectedCategory(''); setEditConfirmedCategory(null); setEditFormData(prev => ({ ...prev, allowLateJoin: false })); }} className="text-red-500 hover:text-red-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => setIsEditGameModalOpen(true)} className="w-full px-4 py-3 border-2 border-dashed border-[var(--color-inputBorder)] rounded-lg hover:border-[var(--color-primary)] transition-colors text-[var(--color-textSecondary)] text-sm">
                Buscar juego
              </button>
            )}
          </div>

          {editSelectedGame && (
            <div className="space-y-3 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-[var(--color-text)]">Expansiones</h3>
                  <p className="text-xs text-[var(--color-textSecondary)]">Se mostrarán junto al juego principal.</p>
                </div>
                <Button type="button" variant="outline" onClick={() => setIsEditExpansionModalOpen(true)}>
                  Añadir expansión desde la BGG
                </Button>
              </div>
              {editSelectedExpansions.length > 0 ? (
                <div className="space-y-2">
                  {editSelectedExpansions.map((expansion) => (
                    <div key={expansion.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-cardBorder)] px-3 py-2">
                      <GameImage src={expansion.image || expansion.thumbnail} alt={expansion.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-[var(--color-text)]">{expansion.name}</p>
                        <p className="text-xs text-amber-600">Expansión</p>
                      </div>
                      <button type="button" onClick={() => handleRemoveEditExpansion(expansion.id)} className="text-red-500 hover:text-red-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--color-textSecondary)]">No hay expansiones añadidas.</p>
              )}
            </div>
          )}

          {editSelectedGame && (
            <div className="space-y-4 rounded-lg border border-dashed border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-[var(--color-text)]">Segunda partida enlazada</h3>
                  <p className="text-xs text-[var(--color-textSecondary)]">Se mantendrá como evento separado enlazado a esta partida.</p>
                </div>
                {!editLinkedNextGame && (
                  <Button type="button" variant="outline" onClick={() => setIsEditLinkedGameModalOpen(true)}>
                    Añadir segunda partida enlazada
                  </Button>
                )}
              </div>
              {editLinkedNextGame ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 rounded-lg border border-[var(--color-cardBorder)] p-3">
                    <GameImage src={editLinkedNextGame.image || editLinkedNextGame.thumbnail} alt={editLinkedNextGame.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[var(--color-text)]">{editLinkedNextGame.name}</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">Se jugará al terminar la partida principal</p>
                    </div>
                    <button type="button" onClick={() => setEditLinkedNextGame(null)} className="text-red-500 hover:text-red-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Horas</label>
                      <select value={editLinkedDurationHours} onChange={(e) => setEditLinkedDurationHours(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)]">
                        <option value="">--</option>
                        {Array.from({ length: 13 }, (_, i) => i).map(h => <option key={h} value={h}>{h}h</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Minutos</label>
                      <select value={editLinkedDurationMinutes} onChange={(e) => setEditLinkedDurationMinutes(e.target.value)} className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)]">
                        {[0, 15, 30, 45].map(m => <option key={m} value={m}>{m}min</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--color-textSecondary)]">No hay segunda partida enlazada.</p>
              )}
            </div>
          )}

          {/* Categoría */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Categoría del juego (opcional)</label>
            <select value={editSelectedCategory} onChange={(e) => setEditSelectedCategory(e.target.value)} disabled={!!editConfirmedCategory} className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] bg-[var(--color-inputBackground)] text-[var(--color-inputText)] disabled:opacity-60 disabled:cursor-not-allowed">
              <option value="">Sin categoría</option>
              <option value="EUROGAMES">{getCategoryIcon('EUROGAMES')} {getCategoryDisplayName('EUROGAMES')}</option>
              <option value="TEMATICOS">{getCategoryIcon('TEMATICOS')} {getCategoryDisplayName('TEMATICOS')}</option>
              <option value="WARGAMES">{getCategoryIcon('WARGAMES')} {getCategoryDisplayName('WARGAMES')}</option>
              <option value="ROL">{getCategoryIcon('ROL')} {getCategoryDisplayName('ROL')}</option>
              <option value="MINIATURAS">{getCategoryIcon('MINIATURAS')} {getCategoryDisplayName('MINIATURAS')}</option>
              <option value="WARHAMMER">{getCategoryIcon('WARHAMMER')} {getCategoryDisplayName('WARHAMMER')}</option>
              <option value="FILLERS_PARTY">{getCategoryIcon('FILLERS_PARTY')} {getCategoryDisplayName('FILLERS_PARTY')}</option>
              <option value="CARTAS_LCG_TCG">{getCategoryIcon('CARTAS_LCG_TCG')} {getCategoryDisplayName('CARTAS_LCG_TCG')}</option>
              <option value="ABSTRACTOS">{getCategoryIcon('ABSTRACTOS')} {getCategoryDisplayName('ABSTRACTOS')}</option>
            </select>
            {editConfirmedCategory && (
              <p className="text-xs text-[var(--color-textSecondary)] mt-1">Categoría fijada por la comunidad. Contacta con un admin para cambiarla.</p>
            )}
          </div>

          {/* Requiere aprobación */}
          <div className="flex items-center gap-3 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] px-4 py-3">
            <input id="edit-requiresApproval" type="checkbox" checked={editFormData.requiresApproval} onChange={(e) => setEditFormData(prev => ({ ...prev, requiresApproval: e.target.checked }))} className="h-4 w-4 rounded border-[var(--color-inputBorder)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]" />
            <label htmlFor="edit-requiresApproval" className="text-sm text-[var(--color-textSecondary)]">Requiere aprobación del organizador</label>
          </div>

          {canConfigureLateJoin && (
            <div className="space-y-2 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] px-4 py-3">
              <div className="flex items-center gap-3">
                <input
                  id="edit-allowLateJoin"
                  type="checkbox"
                  checked={editFormData.allowLateJoin}
                  disabled={isEditMagicSelected}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, allowLateJoin: e.target.checked }))}
                  className="h-4 w-4 rounded border-[var(--color-inputBorder)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-70"
                />
                <label htmlFor="edit-allowLateJoin" className="text-sm text-[var(--color-textSecondary)]">Permitir incorporaciones una vez iniciada</label>
              </div>
              <p className="text-xs text-[var(--color-textSecondary)]">
                {isEditMagicSelected
                  ? 'En Magic: The Gathering esta opción se activa automáticamente.'
                  : 'Permite apuntar o invitar jugadores cuando la sesión ya está en curso.'}
              </p>
            </div>
          )}

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
          setEditFormData(prev => ({ ...prev, allowLateJoin: isMagicTheGatheringBggId(game.id) ? true : false }));
          setEditConfirmedCategory(null);
          setIsEditGameModalOpen(false);
          try {
            const response = await ensureGameInCatalog(game);
            if (response.data?.data?.confirmedCategory) {
              setEditSelectedCategory(response.data.data.confirmedCategory);
              setEditConfirmedCategory(response.data.data.confirmedCategory);
            } else if (response.data?.data?.badgeCategory) {
              setEditSelectedCategory(response.data.data.badgeCategory);
            }
          } catch {
            // ignorar error al guardar juego en BD
          }
        }}
      />

      <GameSearchModal
        isOpen={isEditExpansionModalOpen}
        onClose={() => setIsEditExpansionModalOpen(false)}
        onSelect={async (game) => {
          await handleEditExpansionSelect(game);
          setIsEditExpansionModalOpen(false);
        }}
        title="Añadir expansión desde la BGG"
        searchPlaceholder="Busca una expansión..."
        allowRPGG={false}
        filterExpansionOnly
      />

      <GameSearchModal
        isOpen={isEditLinkedGameModalOpen}
        onClose={() => setIsEditLinkedGameModalOpen(false)}
        onSelect={async (game) => {
          await handleEditLinkedGameSelect(game);
          setIsEditLinkedGameModalOpen(false);
        }}
        title="Seleccionar segunda partida enlazada"
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
        onClose={() => { setIsDeleteModalOpen(false); setCancellationReason(''); }}
        title="Cancelar partida"
      >
        <div className="space-y-4">
          <p className="text-[var(--color-textSecondary)]">
            ¿Estás seguro de que quieres cancelar esta partida? Se notificará a todos los participantes.
          </p>
          <div>
            <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
              Motivo de cancelación <span className="text-red-500">*</span>
            </label>
            <select
              value={cancellationReason}
              onChange={(e) => setCancellationReason(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Selecciona un motivo...</option>
              <option value="Falta de participantes">Falta de participantes</option>
              <option value="Problema con el local">Problema con el local</option>
              <option value="Causa personal del organizador">Causa personal del organizador</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <Button
              onClick={() => { setIsDeleteModalOpen(false); setCancellationReason(''); }}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (!cancellationReason) return;
                deleteEventMutation.mutate(cancellationReason);
                setIsDeleteModalOpen(false);
                setCancellationReason('');
              }}
              disabled={deleteEventMutation.isPending || !cancellationReason}
              variant="danger"
            >
              {deleteEventMutation.isPending ? 'Cancelando...' : 'Cancelar partida'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmación de abandono */}
      <Modal
        isOpen={isUnregisterModalOpen}
        onClose={() => setIsUnregisterModalOpen(false)}
        title={isPendingApproval ? 'Cancelar solicitud' : 'Abandonar partida'}
      >
        <div className="space-y-4">
          <p className="text-[var(--color-textSecondary)]">
            {isPendingApproval
              ? '¿Estás seguro de que quieres cancelar tu solicitud? Se notificará al organizador.'
              : '¿Estás seguro de que quieres abandonar esta partida? Se notificará al organizador y al resto de jugadores.'}
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


      {showFirstPlayerModal && (
        <FirstPlayerModal
          eventId={id!}
          spinEffect={spinEffect}
          onClose={() => setShowFirstPlayerModal(false)}
        />
      )}

    </Layout>
  );
}

