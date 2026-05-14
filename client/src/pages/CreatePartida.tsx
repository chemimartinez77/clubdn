// client/src/pages/CreatePartida.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import GameSearchModal from '../components/events/GameSearchModal';
import { useToast } from '../hooks/useToast';
import { api } from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import type { ApiResponse } from '../types/auth';
import type { BGGGame, CreateEventData, CreatePartidaCloneState } from '../types/event';
import { getCategoryDisplayName, getCategoryIcon } from '../types/badge';
import CreatePartidaTour from '../components/tour/CreatePartidaTour';
import { useTour } from '../hooks/useTour';
import { isMagicTheGatheringBggId } from '../utils/eventRules';
import { isChemiRole } from '../utils/roles';

type CreatePartidaLocationState = {
  selectedDate?: string;
} | CreatePartidaCloneState | null;

interface CreatedEventResponse {
  event?: {
    id: string;
  };
}

export default function CreatePartida() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const isChemi = isChemiRole(user?.role);
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();
  const { shouldShow: showTour, dismissTour } = useTour('createPartida');

  const locationState = location.state as CreatePartidaLocationState;
  const cloneState = locationState && 'mode' in locationState && locationState.mode === 'clone'
    ? locationState
    : null;
  const preselectedDate = locationState && !('mode' in locationState) ? locationState.selectedDate : undefined;
  const clonePrefill = cloneState?.prefill;
  const cloneAttendees = cloneState?.clonedAttendees ?? [];
  const currentUserWasConfirmed = !!user && cloneAttendees.some((attendee) => attendee.id === user.id);

  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [isExpansionModalOpen, setIsExpansionModalOpen] = useState(false);
  const [isLinkedGameModalOpen, setIsLinkedGameModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<BGGGame | null>(() => (
    clonePrefill?.bggId
      ? {
          id: clonePrefill.bggId,
          name: clonePrefill.gameName ?? clonePrefill.title,
          image: clonePrefill.gameImage ?? '',
          thumbnail: '',
          yearPublished: ''
        }
      : null
  ));
  const [selectedExpansions, setSelectedExpansions] = useState<BGGGame[]>(() =>
    (clonePrefill?.expansions ?? []).map((expansion) => ({
      id: expansion.gameId,
      name: expansion.name,
      image: expansion.image ?? '',
      thumbnail: expansion.thumbnail ?? '',
      yearPublished: '',
      itemType: 'boardgameexpansion',
    }))
  );
  const [linkedNextGame, setLinkedNextGame] = useState<BGGGame | null>(null);
  const [isLinkedNextExpansionModalOpen, setIsLinkedNextExpansionModalOpen] = useState(false);
  const [linkedNextExpansions, setLinkedNextExpansions] = useState<BGGGame[]>([]);
  const [linkedNextDurationHours, setLinkedNextDurationHours] = useState('1');
  const [linkedNextDurationMinutes, setLinkedNextDurationMinutes] = useState('0');
  const [linkedNextStartHour, setLinkedNextStartHour] = useState('');
  const [linkedNextStartMinute, setLinkedNextStartMinute] = useState('0');

  // Controlled state for main game time/duration — needed to calculate linked game start time
  const [mainStartHour, setMainStartHour] = useState(() =>
    clonePrefill?.startHour !== null && clonePrefill?.startHour !== undefined ? String(clonePrefill.startHour) : '17'
  );
  const [mainStartMinute, setMainStartMinute] = useState(() =>
    clonePrefill?.startMinute !== null && clonePrefill?.startMinute !== undefined ? String(clonePrefill.startMinute) : '0'
  );
  const [mainDurationHours, setMainDurationHours] = useState(() =>
    clonePrefill?.durationHours !== null && clonePrefill?.durationHours !== undefined ? String(clonePrefill.durationHours) : '3'
  );
  const [mainDurationMinutes, setMainDurationMinutes] = useState(() =>
    clonePrefill?.durationMinutes !== null && clonePrefill?.durationMinutes !== undefined ? String(clonePrefill.durationMinutes) : '0'
  );

  const [selectedCategory, setSelectedCategory] = useState<string>(clonePrefill?.gameCategory ?? '');
  const [confirmedCategory, setConfirmedCategory] = useState<string | null>(null);
  const [victoryType, setVictoryType] = useState<string>('COMPETITIVE');
  const [selectedClonedAttendeeIds, setSelectedClonedAttendeeIds] = useState<string[]>(() => cloneAttendees.map((attendee) => attendee.id));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allowLateJoin, setAllowLateJoin] = useState<boolean>(clonePrefill?.allowLateJoin ?? false);
  const [language, setLanguage] = useState<'es' | 'en'>(clonePrefill?.language === 'en' ? 'en' : 'es');
  const [englishLevel, setEnglishLevel] = useState<string>(clonePrefill?.englishLevel ?? '');

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = [0, 15, 30, 45];

  const createMutation = useMutation({
    mutationFn: async (data: CreateEventData) => {
      const response = await api.post<ApiResponse<CreatedEventResponse>>('/api/events', data);
      return response.data;
    }
  });

  const ensureGameInCatalog = async (game: BGGGame) => {
    const isRpg = game.id.startsWith('rpgg-');
    const endpoint = isRpg
      ? `/api/games/rpgg/${game.id.slice(5)}`
      : `/api/games/${game.id}`;
    return api.get(endpoint);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const dateValue = formData.get('date') as string;
    const startHour = formData.get('startHour') as string;
    const startMinute = formData.get('startMinute') as string;
    const locationValue = (formData.get('location') as string)?.trim();
    const attend = formData.get('attend') === 'on';
    const requiresApproval = formData.get('requiresApproval') === 'on';

    const eventDate = new Date(dateValue);
    if (startHour) eventDate.setHours(parseInt(startHour, 10));
    if (startMinute) eventDate.setMinutes(parseInt(startMinute, 10));

    const gameCategory = formData.get('gameCategory') as string;

    const data: CreateEventData = {
      type: 'PARTIDA',
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      date: eventDate.toISOString(),
      startHour: startHour ? parseInt(startHour, 10) : undefined,
      startMinute: startMinute ? parseInt(startMinute, 10) : undefined,
      durationHours: formData.get('durationHours') ? parseInt(formData.get('durationHours') as string, 10) : undefined,
      durationMinutes: formData.get('durationMinutes') ? parseInt(formData.get('durationMinutes') as string, 10) : undefined,
      location: locationValue || 'Club Dreadnought',
      address: (formData.get('address') as string) || undefined,
      maxAttendees: parseInt(formData.get('maxAttendees') as string, 10),
      attend,
      requiresApproval,
      allowLateJoin,
      gameName: selectedGame?.name,
      gameImage: selectedGame?.image,
      bggId: selectedGame?.id,
      expansions: selectedExpansions.map((expansion) => ({ gameId: expansion.id })),
      linkedNext: linkedNextGame
        ? {
            gameId: linkedNextGame.id,
            startHour: linkedNextStartHour !== '' ? parseInt(linkedNextStartHour, 10) : undefined,
            startMinute: linkedNextStartMinute !== '' ? parseInt(linkedNextStartMinute, 10) : undefined,
            durationHours: linkedNextDurationHours !== '' ? parseInt(linkedNextDurationHours, 10) : undefined,
            durationMinutes: linkedNextDurationMinutes !== '' ? parseInt(linkedNextDurationMinutes, 10) : undefined,
            expansions: linkedNextExpansions.map(e => ({ gameId: e.id })),
          }
        : null,
      gameCategory: gameCategory || undefined,
      victoryType,
      language,
      englishLevel: language === 'en' ? (englishLevel || null) : null
    };

    try {
      setIsSubmitting(true);
      const response = await createMutation.mutateAsync(data);
      const newEventId = response.data?.event?.id;

      if (!newEventId) {
        throw new Error('No se pudo obtener la nueva partida creada');
      }

      const attendeeIdsToAdd = cloneState
        ? selectedClonedAttendeeIds.filter((attendeeId) => !(attend && attendeeId === user?.id))
        : [];

      const addAttendeeResults = await Promise.allSettled(
        attendeeIdsToAdd.map((attendeeId) => api.post(`/api/events/${newEventId}/add-member`, { userId: attendeeId }))
      );

      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['event', newEventId] });

      const failedAttendees = cloneState
        ? addAttendeeResults
            .map((result, index) => ({ result, attendee: cloneAttendees.find((attendee) => attendee.id === attendeeIdsToAdd[index]) }))
            .filter((entry) => entry.result.status === 'rejected' && entry.attendee)
            .map((entry) => entry.attendee!.nick || entry.attendee!.name)
        : [];

      if (failedAttendees.length > 0) {
        showError(`Partida creada, pero no se pudo apuntar a: ${failedAttendees.join(', ')}`);
      } else {
        success(response.message || 'Partida creada correctamente');
      }

      navigate(`/events/${newEventId}`);
    } catch (err: any) {
      showError(err.response?.data?.message || err.message || 'Error al crear partida');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGameSelect = async (game: BGGGame) => {
    setSelectedGame(game);
    setAllowLateJoin(isMagicTheGatheringBggId(game.id) ? true : false);
    setConfirmedCategory(null);

    try {
      const response = await ensureGameInCatalog(game);

      if (response.data?.data?.confirmedCategory) {
        setSelectedCategory(response.data.data.confirmedCategory);
        setConfirmedCategory(response.data.data.confirmedCategory);
      } else if (response.data?.data?.badgeCategory) {
        setSelectedCategory(response.data.data.badgeCategory);
      }
    } catch (error) {
      console.error('Error al guardar juego en BD:', error);
    }
  };

  const handleRemoveGame = () => {
    setSelectedGame(null);
    setAllowLateJoin(false);
    setSelectedExpansions([]);
    setLinkedNextGame(null);
    setSelectedCategory('');
    setConfirmedCategory(null);
  };

  const handleExpansionSelect = async (game: BGGGame) => {
    await ensureGameInCatalog(game);
    setSelectedExpansions((current) => (
      current.some((expansion) => expansion.id === game.id)
        ? current
        : [...current, { ...game, itemType: 'boardgameexpansion' }]
    ));
  };

  const handleRemoveExpansion = (gameId: string) => {
    setSelectedExpansions((current) => current.filter((expansion) => expansion.id !== gameId));
  };

  const handleLinkedNextSelect = async (game: BGGGame) => {
    await ensureGameInCatalog(game);
    setLinkedNextGame(game);
  };

  const handleToggleClonedAttendee = (attendeeId: string) => {
    setSelectedClonedAttendeeIds((current) => (
      current.includes(attendeeId)
        ? current.filter((id) => id !== attendeeId)
        : [...current, attendeeId]
    ));
  };

  const today = new Date().toISOString().split('T')[0];
  const titleDefaultValue = clonePrefill?.title ?? (selectedGame ? `${selectedGame.name}` : '');
  const descriptionDefaultValue = clonePrefill?.description ?? '';
  const locationDefaultValue = clonePrefill?.location ?? '';
  const addressDefaultValue = clonePrefill?.address ?? '';
  const maxAttendeesDefaultValue = clonePrefill?.maxAttendees ?? 4;
  const requiresApprovalDefaultValue = clonePrefill?.requiresApproval ?? true;
  const attendDefaultValue = cloneState ? currentUserWasConfirmed : true;
  const [willAttend, setWillAttend] = useState<boolean>(attendDefaultValue);
  const isMagicSelected = isMagicTheGatheringBggId(selectedGame?.id);
  const canConfigureLateJoin = isChemi || isMagicSelected;

  useEffect(() => {
    if (isMagicSelected) {
      setAllowLateJoin(true);
    }
  }, [isMagicSelected]);

  // Recalculate linked game start time when main game time/duration changes
  useEffect(() => {
    if (!linkedNextGame) return;
    const startH = parseInt(mainStartHour, 10);
    const startM = parseInt(mainStartMinute, 10);
    const durH = parseInt(mainDurationHours, 10) || 0;
    const durM = parseInt(mainDurationMinutes, 10) || 0;
    if (Number.isNaN(startH)) return;
    const totalMinutes = startH * 60 + (startM || 0) + durH * 60 + durM;
    const calcH = Math.floor(totalMinutes / 60) % 24;
    const calcM = totalMinutes % 60;
    setLinkedNextStartHour(String(calcH));
    setLinkedNextStartMinute(String(calcM));
  }, [linkedNextGame, mainStartHour, mainStartMinute, mainDurationHours, mainDurationMinutes]);

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div id="create-partida-header">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] mb-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">
            {cloneState ? 'Clonar partida' : 'Organizar una Partida'}
          </h1>
          <p className="text-[var(--color-textSecondary)] mt-1">
            {cloneState
              ? `Nueva partida basada en "${cloneState.sourceTitle}".`
              : 'Crea una partida para jugar con otros miembros del club'}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {cloneState && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  Se ha copiado la ficha, la hora y la duración de la partida original. La fecha no se copia y debes elegir una nueva.
                </div>
              )}

              <div id="create-partida-game">
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Elige un juego (opcional)
                </label>
                {selectedGame ? (
                  <div className="flex items-center gap-4 p-4 border-2 border-[var(--color-primary)] rounded-lg bg-[var(--color-cardBackground)]">
                    {selectedGame.image && (
                      <img
                        src={selectedGame.image}
                        alt={selectedGame.name}
                        className="w-16 h-16 object-cover rounded border border-[var(--color-cardBorder)]"
                      />
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-[var(--color-text)]">{selectedGame.name}</h3>
                      {selectedGame.yearPublished && (
                        <p className="text-sm text-[var(--color-textSecondary)]">{selectedGame.yearPublished}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveGame}
                      className="text-red-500 hover:text-red-600 transition-colors"
                      aria-label="Eliminar juego"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsGameModalOpen(true)}
                    className="w-full px-4 py-3 border-2 border-dashed border-[var(--color-inputBorder)] rounded-lg hover:border-[var(--color-primary-400)] hover:bg-[var(--color-primary-50)] transition-colors text-[var(--color-textSecondary)] hover:text-[var(--color-primaryDark)]"
                  >
                    <svg className="w-6 h-6 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Buscar juego
                  </button>
                )}
              </div>

              {selectedGame && (
                <div className="space-y-3 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium text-[var(--color-text)]">Expansiones</h3>
                      <p className="text-xs text-[var(--color-textSecondary)]">
                        Añade una o varias expansiones que se jugarán junto al juego base.
                      </p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setIsExpansionModalOpen(true)}>
                      Añadir expansión desde la BGG
                    </Button>
                  </div>

                  {selectedExpansions.length > 0 ? (
                    <div className="space-y-2">
                      {selectedExpansions.map((expansion) => (
                        <div key={expansion.id} className="flex items-center gap-3 rounded-lg border border-[var(--color-cardBorder)] px-3 py-2">
                          {expansion.image ? (
                            <img
                              src={expansion.image}
                              alt={expansion.name}
                              className="h-12 w-12 rounded object-cover border border-[var(--color-cardBorder)]"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded bg-[var(--color-tableRowHover)]" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-[var(--color-text)]">{expansion.name}</p>
                            <p className="text-xs text-amber-600">Expansión</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveExpansion(expansion.id)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                            aria-label={`Eliminar expansión ${expansion.name}`}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-textSecondary)]">No has añadido expansiones todavía.</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Categoría del juego (opcional)
                </label>
                <select
                  name="gameCategory"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={!!confirmedCategory}
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-inputBackground)] text-[var(--color-inputText)] disabled:opacity-60 disabled:cursor-not-allowed"
                >
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
                {!selectedCategory && !confirmedCategory ? (
                  <p className="text-xs mt-1 text-amber-600">
                    Sin categoría, esta partida no contará para los logros de género ni para el logro Catalogador.
                  </p>
                ) : (
                  <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                    {confirmedCategory
                      ? 'Categoría fijada por la comunidad. Contacta con un admin para cambiarla.'
                      : 'Categoría cargada automáticamente. Puedes cambiarla si es incorrecta.'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Tipo de victoria
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'COMPETITIVE', label: 'Competitivo', desc: 'Puntuación numérica' },
                    { value: 'RACING', label: 'Carreras', desc: 'Posición en carrera' },
                    { value: 'COOPERATIVE', label: 'Cooperativo', desc: 'Todos ganan o pierden' },
                    { value: 'SEMI_COOPERATIVE', label: 'Semi-cooperativo', desc: 'Victoria individual (Némesis...)' },
                  ] as const).map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setVictoryType(value)}
                      className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                        victoryType === value
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                          : 'border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] text-[var(--color-textSecondary)]'
                      }`}
                    >
                      <span className="font-medium block">{label}</span>
                      <span className="text-xs opacity-75">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] px-4 py-3">
                <input
                  id="attend"
                  name="attend"
                  type="checkbox"
                  checked={willAttend}
                  onChange={(e) => setWillAttend(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--color-inputBorder)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <label htmlFor="attend" className="text-sm text-[var(--color-textSecondary)]">
                  Asistire a la partida
                </label>
              </div>

              <div className="flex items-center gap-3 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] px-4 py-3">
                <input
                  id="requiresApproval"
                  name="requiresApproval"
                  type="checkbox"
                  defaultChecked={requiresApprovalDefaultValue}
                  className="h-4 w-4 rounded border-[var(--color-inputBorder)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <label htmlFor="requiresApproval" className="text-sm text-[var(--color-textSecondary)]">
                  Requiere aprobación del organizador
                </label>
              </div>

              <div className="space-y-3 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] px-4 py-3">
                <p className="text-sm font-medium text-[var(--color-textSecondary)]">Idioma de la partida</p>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${language === 'es' ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-textSecondary)]'}`}>
                    Castellano
                  </span>
                  <button
                    type="button"
                    onClick={() => { setLanguage(language === 'es' ? 'en' : 'es'); setEnglishLevel(''); }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      language === 'en' ? 'bg-orange-500' : 'bg-[var(--color-cardBorder)]'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      language === 'en' ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                  <span className={`text-sm ${language === 'en' ? 'font-semibold text-orange-600' : 'text-[var(--color-textSecondary)]'}`}>
                    Inglés
                  </span>
                </div>
                {language === 'en' && (
                  <div className="flex gap-2 pt-1">
                    {(['basic', 'medium', 'advanced'] as const).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setEnglishLevel(level)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                          englishLevel === level
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-transparent text-[var(--color-textSecondary)] border-[var(--color-cardBorder)] hover:border-orange-400'
                        }`}
                      >
                        {level === 'basic' ? 'Básico' : level === 'medium' ? 'Medio' : 'Avanzado'}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {canConfigureLateJoin && (
                <div className="space-y-2 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <input
                      id="allowLateJoin"
                      type="checkbox"
                      checked={allowLateJoin}
                      disabled={isMagicSelected}
                      onChange={(e) => setAllowLateJoin(e.target.checked)}
                      className="h-4 w-4 rounded border-[var(--color-inputBorder)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-70"
                    />
                    <label htmlFor="allowLateJoin" className="text-sm text-[var(--color-textSecondary)]">
                      Permitir incorporaciones una vez iniciada
                    </label>
                  </div>
                  <p className="text-xs text-[var(--color-textSecondary)]">
                    {isMagicSelected
                      ? 'En Magic: The Gathering esta opción se activa automáticamente.'
                      : 'Permite apuntar o invitar jugadores cuando la sesión ya está en curso.'}
                  </p>
                </div>
              )}

              <div id="create-partida-title">
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Título de la partida *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  minLength={3}
                  maxLength={100}
                  defaultValue={titleDefaultValue}
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-inputBackground)] text-[var(--color-inputText)] placeholder:text-gray-500"
                  placeholder="Ej: Partida de Catan"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Descripción de la partida (opcional)
                </label>
                <textarea
                  name="description"
                  rows={4}
                  defaultValue={descriptionDefaultValue}
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none bg-[var(--color-inputBackground)] text-[var(--color-inputText)] placeholder:text-gray-500"
                  placeholder="Dale a los jugadores más información acerca de la partida..."
                />
              </div>

              <div id="create-partida-datetime">
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  ¿Cuándo será la partida? *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Fecha de inicio</label>
                    <input
                      type="date"
                      name="date"
                      required
                      min={today}
                      defaultValue={cloneState ? '' : (preselectedDate || '')}
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-inputBackground)] text-[var(--color-inputText)] [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Hora</label>
                    <select
                      name="startHour"
                      value={mainStartHour}
                      onChange={e => setMainStartHour(e.target.value)}
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-inputBackground)] text-[var(--color-inputText)]"
                    >
                      <option value="">--</option>
                      {hours.map(hour => (
                        <option key={hour} value={hour}>
                          {hour.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Minutos</label>
                    <select
                      name="startMinute"
                      value={mainStartMinute}
                      onChange={e => setMainStartMinute(e.target.value)}
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-inputBackground)] text-[var(--color-inputText)]"
                    >
                      {minutes.map(minute => (
                        <option key={minute} value={minute}>
                          {minute.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Duración estimada (opcional)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Horas</label>
                    <select
                      name="durationHours"
                      value={mainDurationHours}
                      onChange={e => setMainDurationHours(e.target.value)}
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-inputBackground)] text-[var(--color-inputText)]"
                    >
                      <option value="">--</option>
                      {Array.from({ length: 13 }, (_, i) => i).map(hour => (
                        <option key={hour} value={hour}>{hour}h</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Minutos</label>
                    <select
                      name="durationMinutes"
                      value={mainDurationMinutes}
                      onChange={e => setMainDurationMinutes(e.target.value)}
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-inputBackground)] text-[var(--color-inputText)]"
                    >
                      {minutes.map(minute => (
                        <option key={minute} value={minute}>{minute}min</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {selectedGame && (
                <div className="space-y-4 rounded-lg border border-dashed border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-medium text-[var(--color-text)]">Segunda partida enlazada</h3>
                      <p className="text-xs text-[var(--color-textSecondary)]">
                        Se mostrará como continuación de esta partida y tendrá resultados propios.
                      </p>
                    </div>
                    {!linkedNextGame && (
                      <Button type="button" variant="outline" onClick={() => setIsLinkedGameModalOpen(true)}>
                        Añadir segunda partida enlazada
                      </Button>
                    )}
                  </div>

                  {linkedNextGame ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 rounded-lg border border-[var(--color-cardBorder)] p-3">
                        {linkedNextGame.image ? (
                          <img
                            src={linkedNextGame.image}
                            alt={linkedNextGame.name}
                            className="w-16 h-16 object-cover rounded border border-[var(--color-cardBorder)]"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded bg-[var(--color-tableRowHover)]" />
                        )}
                        <div className="flex-1 min-w-0">
                          <h4 className="truncate font-medium text-[var(--color-text)]">{linkedNextGame.name}</h4>
                          <p className="text-xs text-[var(--color-textSecondary)]">Se jugará al terminar la partida principal</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLinkedNextGame(null)}
                          className="text-red-500 hover:text-red-600 transition-colors"
                          aria-label="Eliminar segunda partida enlazada"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>

                      {/* Hora de inicio de la segunda partida */}
                      {(() => {
                        const mainH = parseInt(mainStartHour, 10);
                        const mainM = parseInt(mainStartMinute, 10) || 0;
                        const minStartMinutes = Number.isNaN(mainH) ? null : mainH * 60 + mainM + 60;
                        const linkedH = parseInt(linkedNextStartHour, 10);
                        const linkedM = parseInt(linkedNextStartMinute, 10) || 0;
                        const linkedTotalMinutes = Number.isNaN(linkedH) ? null : linkedH * 60 + linkedM;
                        const isTooEarly = minStartMinutes !== null && linkedTotalMinutes !== null && linkedTotalMinutes < minStartMinutes;
                        return (
                          <div>
                            <label className="block text-xs text-[var(--color-textSecondary)] mb-1">
                              Hora de inicio
                              {minStartMinutes !== null && (
                                <span className="ml-1 text-[var(--color-textSecondary)]">
                                  (mínimo {String(Math.floor(minStartMinutes / 60) % 24).padStart(2, '0')}:{String(minStartMinutes % 60).padStart(2, '0')})
                                </span>
                              )}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={linkedNextStartHour}
                                onChange={e => setLinkedNextStartHour(e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-inputBackground)] text-[var(--color-inputText)] ${isTooEarly ? 'border-red-500' : 'border-[var(--color-inputBorder)]'}`}
                              >
                                <option value="">--</option>
                                {hours.map(h => {
                                  const disabled = minStartMinutes !== null && h * 60 + linkedM < minStartMinutes && h * 60 + 59 < minStartMinutes;
                                  return <option key={h} value={h} disabled={disabled}>{String(h).padStart(2, '0')}h</option>;
                                })}
                              </select>
                              <select
                                value={linkedNextStartMinute}
                                onChange={e => setLinkedNextStartMinute(e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-inputBackground)] text-[var(--color-inputText)] ${isTooEarly ? 'border-red-500' : 'border-[var(--color-inputBorder)]'}`}
                              >
                                {minutes.map(m => {
                                  const disabled = minStartMinutes !== null && linkedH * 60 + m < minStartMinutes;
                                  return <option key={m} value={m} disabled={disabled}>{String(m).padStart(2, '0')}min</option>;
                                })}
                              </select>
                            </div>
                            {isTooEarly && (
                              <p className="text-xs text-red-500 mt-1">
                                La segunda partida no puede empezar antes de 1h después del inicio de la primera.
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* Duración de la segunda partida */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Duración (horas)</label>
                          <select
                            value={linkedNextDurationHours}
                            onChange={(e) => setLinkedNextDurationHours(e.target.value)}
                            className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-inputBackground)] text-[var(--color-inputText)]"
                          >
                            <option value="">--</option>
                            {Array.from({ length: 13 }, (_, i) => i).map(hour => (
                              <option key={hour} value={hour}>{hour}h</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Duración (minutos)</label>
                          <select
                            value={linkedNextDurationMinutes}
                            onChange={(e) => setLinkedNextDurationMinutes(e.target.value)}
                            className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-inputBackground)] text-[var(--color-inputText)]"
                          >
                            {minutes.map(minute => (
                              <option key={minute} value={minute}>{minute}min</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Expansiones de la segunda partida */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs text-[var(--color-textSecondary)]">Expansiones</label>
                          <button
                            type="button"
                            onClick={() => setIsLinkedNextExpansionModalOpen(true)}
                            className="text-xs text-[var(--color-primary)] hover:underline"
                          >
                            + Añadir expansión
                          </button>
                        </div>
                        {linkedNextExpansions.length > 0 && (
                          <ul className="space-y-1">
                            {linkedNextExpansions.map(exp => (
                              <li key={exp.id} className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                                {exp.thumbnail && <img src={exp.thumbnail} alt="" className="w-6 h-6 rounded object-cover" />}
                                <span className="flex-1 truncate">{exp.name}</span>
                                <button
                                  type="button"
                                  onClick={() => setLinkedNextExpansions(prev => prev.filter(e => e.id !== exp.id))}
                                  className="text-red-500 hover:text-red-600"
                                  aria-label={`Eliminar ${exp.name}`}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-textSecondary)]">No has configurado una segunda partida enlazada.</p>
                  )}
                </div>
              )}

              <div id="create-partida-attendees">
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Aforo máximo de jugadores *
                </label>
                <input
                  type="number"
                  name="maxAttendees"
                  required
                  min={1}
                  max={100}
                  defaultValue={maxAttendeesDefaultValue}
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-inputBackground)] text-[var(--color-inputText)]"
                />
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                  {willAttend
                    ? 'Incluye al organizador en este número.'
                    : 'No incluye al organizador, porque has indicado que no asistirás.'}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Ubicación (opcional)
                </label>
                <input
                  type="text"
                  name="location"
                  minLength={3}
                  defaultValue={locationDefaultValue}
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-inputBackground)] text-[var(--color-inputText)] placeholder:text-gray-500"
                  placeholder="Club Dreadnought"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Dirección (opcional)
                </label>
                <input
                  type="text"
                  name="address"
                  defaultValue={addressDefaultValue}
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-inputBackground)] text-[var(--color-inputText)] placeholder:text-gray-500"
                  placeholder="Direccion completa"
                />
              </div>

              {cloneState && (
                <div className="space-y-4 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-4">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--color-text)]">Asistentes clonados</h2>
                    <p className="text-sm text-[var(--color-textSecondary)]">
                      Los miembros seleccionados se apuntarán a la nueva partida y recibirán la notificación habitual.
                    </p>
                    {cloneState.hadExternalGuests && (
                      <p className="mt-2 text-sm text-amber-700">
                        La partida original tenía invitados externos. No se copian y tendrás que volver a invitarlos manualmente.
                      </p>
                    )}
                  </div>

                  {cloneAttendees.length === 0 ? (
                    <p className="text-sm text-[var(--color-textSecondary)]">La partida original no tenía asistentes confirmados para clonar.</p>
                  ) : (
                    <div className="space-y-2">
                      {cloneAttendees.map((attendee) => (
                        <label
                          key={attendee.id}
                          className="flex items-center gap-3 rounded-lg border border-[var(--color-cardBorder)] px-3 py-2 text-sm text-[var(--color-text)]"
                        >
                          <input
                            type="checkbox"
                            checked={selectedClonedAttendeeIds.includes(attendee.id)}
                            onChange={() => handleToggleClonedAttendee(attendee.id)}
                            className="h-4 w-4 rounded border-[var(--color-inputBorder)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                          />
                          {attendee.avatar ? (
                            <img src={attendee.avatar} alt={attendee.name} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-tableRowHover)] text-xs font-semibold">
                              {attendee.name.slice(0, 1).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{attendee.nick || attendee.name}</p>
                            {attendee.nick && (
                              <p className="truncate text-xs text-[var(--color-textSecondary)]">{attendee.name}</p>
                            )}
                          </div>
                          {attendee.membershipType && (
                            <span className="text-xs text-[var(--color-textSecondary)]">{attendee.membershipType}</span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div id="create-partida-submit" className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={createMutation.isPending || isSubmitting}
                  className="flex-1"
                >
                  {createMutation.isPending || isSubmitting ? 'Creando...' : 'Guardar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex-1"
                >
                  Volver
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      <GameSearchModal
        isOpen={isGameModalOpen}
        onClose={() => setIsGameModalOpen(false)}
        onSelect={handleGameSelect}
      />

      <GameSearchModal
        isOpen={isExpansionModalOpen}
        onClose={() => setIsExpansionModalOpen(false)}
        onSelect={handleExpansionSelect}
        title="Añadir expansión desde la BGG"
        searchPlaceholder="Busca una expansión..."
        allowRPGG={false}
        filterExpansionOnly
      />

      <GameSearchModal
        isOpen={isLinkedGameModalOpen}
        onClose={() => setIsLinkedGameModalOpen(false)}
        onSelect={handleLinkedNextSelect}
        title="Seleccionar segunda partida enlazada"
      />

      <GameSearchModal
        isOpen={isLinkedNextExpansionModalOpen}
        onClose={() => setIsLinkedNextExpansionModalOpen(false)}
        onSelect={(game) => {
          setLinkedNextExpansions(prev =>
            prev.some(e => e.id === game.id) ? prev : [...prev, game]
          );
          setIsLinkedNextExpansionModalOpen(false);
        }}
        title="Añadir expansión a la segunda partida"
        searchPlaceholder="Busca una expansión..."
        allowRPGG={false}
        filterExpansionOnly
      />

      {showTour && <CreatePartidaTour onDismiss={dismissTour} />}
    </Layout>
  );
}
