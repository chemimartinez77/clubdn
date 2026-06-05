import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import GameSearchModal from '../components/events/GameSearchModal';
import Modal from '../components/ui/Modal';
import { api } from '../api/axios';
import { useToast } from '../hooks/useToast';
import type { ApiResponse } from '../types/auth';
import type { BGGGame } from '../types/event';
import type { SurpriseBox } from '../types/surpriseBox';

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = [0, 15, 30, 45];

type FormState = {
  title: string;
  subtitle: string;
  description: string;
  date: string;
  startHour: string;
  startMinute: string;
  durationHours: string;
  durationMinutes: string;
  location: string;
  address: string;
  maxAttendees: string;
  requiresApproval: boolean;
  allowLateJoin: boolean;
  language: 'es' | 'en';
  englishLevel: string;
};

const initialForm: FormState = {
  title: 'Caja misteriosa',
  subtitle: 'El primer voto decide qué se juega',
  description: '',
  date: '',
  startHour: '17',
  startMinute: '0',
  durationHours: '3',
  durationMinutes: '0',
  location: 'Club Dreadnought',
  address: '',
  maxAttendees: '4',
  requiresApproval: true,
  allowLateJoin: false,
  language: 'es',
  englishLevel: '',
};

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function formatEventTime(box: SurpriseBox) {
  if (box.startHour == null) return 'Sin hora definida';
  return `${String(box.startHour).padStart(2, '0')}:${String(box.startMinute ?? 0).padStart(2, '0')}`;
}

function formatShareDateTime(box: SurpriseBox) {
  const dateText = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(box.eventDate));

  if (box.startHour == null) {
    return dateText;
  }

  return `${dateText}, ${formatEventTime(box)}`;
}

export default function SurpriseBoxes() {
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initialForm);
  const [selectedGames, setSelectedGames] = useState<Array<BGGGame | null>>([null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);

  const { data: boxes = [], isLoading } = useQuery({
    queryKey: ['surpriseBoxesMine'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<SurpriseBox[]>>('/api/surprise-boxes/mine');
      return response.data.data ?? [];
    },
  });

  const ensureGameInCatalog = async (game: BGGGame) => {
    await api.get(`/api/games/${game.id}`);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const options = selectedGames.filter(Boolean).map((game) => ({ gameId: game!.id }));
      for (const game of selectedGames.filter(Boolean) as BGGGame[]) {
        await ensureGameInCatalog(game);
      }

      const eventDate = new Date(form.date);
      const startHour = Number.parseInt(form.startHour, 10);
      const startMinute = Number.parseInt(form.startMinute, 10);
      eventDate.setHours(startHour, startMinute, 0, 0);

      const response = await api.post<ApiResponse<SurpriseBox>>('/api/surprise-boxes', {
        title: form.title,
        subtitle: form.subtitle || undefined,
        description: form.description || undefined,
        date: eventDate.toISOString(),
        startHour,
        startMinute,
        durationHours: Number.parseInt(form.durationHours, 10),
        durationMinutes: Number.parseInt(form.durationMinutes, 10),
        location: form.location,
        address: form.address || undefined,
        maxAttendees: Number.parseInt(form.maxAttendees, 10),
        requiresApproval: form.requiresApproval,
        allowLateJoin: form.allowLateJoin,
        language: form.language,
        englishLevel: form.language === 'en' ? form.englishLevel || undefined : undefined,
        options,
      });

      return response.data.data!;
    },
    onSuccess: () => {
      success('Caja misteriosa creada correctamente');
      setForm(initialForm);
      setSelectedGames([null, null, null]);
      queryClient.invalidateQueries({ queryKey: ['surpriseBoxesMine'] });
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al crear la caja misteriosa');
    },
  });

  const closeMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/surprise-boxes/${id}/close`);
    },
    onSuccess: () => {
      success('Caja misteriosa cerrada');
      queryClient.invalidateQueries({ queryKey: ['surpriseBoxesMine'] });
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al cerrar la caja misteriosa');
    },
  });

  const selectedCount = useMemo(
    () => selectedGames.filter(Boolean).length,
    [selectedGames]
  );
  const hasOpenBox = useMemo(
    () => boxes.some((box) => box.status === 'OPEN'),
    [boxes]
  );

  const shareOnWhatsApp = (box: SurpriseBox) => {
    const message = `*${box.title}*\n*${formatShareDateTime(box)}*\n${box.previewUrl}`;
    const whatsappWindow = window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
    void whatsappWindow;
  };

  const handleGameSelect = (game: BGGGame) => {
    if (activeSlot === null) return;
    setSelectedGames((current) => current.map((item, index) => (index === activeSlot ? game : item)));
    setActiveSlot(null);
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)]">Caja misteriosa</h1>
            <p className="text-[var(--color-textSecondary)] mt-1">
              Configura una caja misteriosa, compártela y deja que el primer voto cree la partida automáticamente.
            </p>
          </div>
          <Button variant="secondary" className="shrink-0 text-base px-5 py-2.5" onClick={() => setIsInstructionsOpen(true)}>
            Instrucciones
          </Button>
        </div>


        <Modal isOpen={isInstructionsOpen} onClose={() => setIsInstructionsOpen(false)} title="Cómo funciona la Caja Misteriosa" size="md">
          <div className="space-y-4 text-sm text-[var(--color-text)]">
            <p>La Caja Misteriosa te permite organizar una partida sin desvelar el juego de antemano. Tú preparas las opciones y la comunidad decide con su voto.</p>
            <ol className="space-y-3 list-none">
              {[
                ['1. Configura la caja', 'Elige fecha, hora, ubicación, aforo y entre 2 y 3 juegos candidatos. El título y subtítulo se mostrarán en la landing pública.'],
                ['2. Comparte por WhatsApp', 'Una vez creada, usa el botón "Compartir" para enviar el enlace con vista previa. Los socios verán la imagen, el título y los juegos a elegir.'],
                ['3. El primer voto decide', 'En cuanto un socio autenticado pulse "Elegir este juego", la partida se crea automáticamente con ese juego y ese socio queda inscrito junto a ti.'],
                ['4. La landing cambia', 'El enlace que compartiste pasa a mostrar el juego ganador y un acceso directo a la partida ya creada en la app.'],
                ['5. Solo una activa a la vez', 'No puedes tener dos cajas misteriosas abiertas al mismo tiempo. Cierra o espera a que se resuelva la actual antes de crear otra.'],
              ].map(([titulo, desc]) => (
                <li key={titulo} className="flex gap-3">
                  <span className="mt-0.5 w-2 h-2 rounded-full bg-[var(--color-primary)] shrink-0 translate-y-1" />
                  <div>
                    <p className="font-semibold">{titulo}</p>
                    <p className="text-[var(--color-textSecondary)] mt-0.5">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Modal>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Nueva caja misteriosa</h2>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Título</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Subtítulo</label>
                <input
                  value={form.subtitle}
                  onChange={(e) => setForm((current) => ({ ...current, subtitle: e.target.value }))}
                  placeholder="Subtítulo"
                  className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="opacity-50">
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Imagen de portada</label>
                <input
                  disabled
                  value="Se elegirá una portada aleatoria de Caja Misteriosa"
                  className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)] cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Ubicación</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm((current) => ({ ...current, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                />
              </div>
            </div>

            <div className="opacity-50">
              <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Descripción</label>
              <textarea
                disabled
                value=""
                rows={3}
                placeholder="Deshabilitado temporalmente"
                className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)] cursor-not-allowed resize-none"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Fecha</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((current) => ({ ...current, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Hora</label>
                <select
                  value={form.startHour}
                  onChange={(e) => setForm((current) => ({ ...current, startHour: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                >
                  {HOURS.map((hour) => (
                    <option key={hour} value={hour}>{String(hour).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Minutos</label>
                <select
                  value={form.startMinute}
                  onChange={(e) => setForm((current) => ({ ...current, startMinute: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                >
                  {MINUTES.map((minute) => (
                    <option key={minute} value={minute}>{String(minute).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Aforo</label>
                <input
                  type="number"
                  min={1}
                  value={form.maxAttendees}
                  onChange={(e) => setForm((current) => ({ ...current, maxAttendees: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Duración (h)</label>
                <input
                  type="number"
                  min={0}
                  value={form.durationHours}
                  onChange={(e) => setForm((current) => ({ ...current, durationHours: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Duración (min)</label>
                <select
                  value={form.durationMinutes}
                  onChange={(e) => setForm((current) => ({ ...current, durationMinutes: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                >
                  {[0, 15, 30, 45].map((minute) => (
                    <option key={minute} value={minute}>{String(minute).padStart(2, '0')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Idioma</label>
                <select
                  value={form.language}
                  onChange={(e) => setForm((current) => ({ ...current, language: e.target.value as 'es' | 'en' }))}
                  className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                >
                  <option value="es">Español</option>
                  <option value="en">Inglés</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Dirección</label>
                <input
                  value={form.address}
                  onChange={(e) => setForm((current) => ({ ...current, address: e.target.value }))}
                  className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                />
              </div>
            </div>

            {form.language === 'en' && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">Nivel de inglés</label>
                <input
                  value={form.englishLevel}
                  onChange={(e) => setForm((current) => ({ ...current, englishLevel: e.target.value }))}
                  placeholder="Ej: medio"
                  className="w-full px-3 py-2 border border-[var(--color-cardBorder)] rounded-lg bg-[var(--color-inputBackground)] text-[var(--color-text)]"
                />
              </div>
            )}

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                <input
                  type="checkbox"
                  checked={form.requiresApproval}
                  onChange={(e) => setForm((current) => ({ ...current, requiresApproval: e.target.checked }))}
                />
                Requiere aprobación
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
                <input
                  type="checkbox"
                  checked={form.allowLateJoin}
                  onChange={(e) => setForm((current) => ({ ...current, allowLateJoin: e.target.checked }))}
                />
                Permitir incorporaciones tardías
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-[var(--color-text)]">Juegos a votar</h3>
                  <p className="text-xs text-[var(--color-textSecondary)]">Elige entre 2 y 3 juegos distintos.</p>
                </div>
                <span className="text-xs text-[var(--color-textSecondary)]">{selectedCount}/3 seleccionados</span>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {selectedGames.map((game, index) => (
                  <div key={index} className="rounded-xl border border-[var(--color-cardBorder)] p-4 bg-[var(--color-cardBackground)]">
                    <p className="text-xs uppercase tracking-wide text-[var(--color-textSecondary)] mb-3">Opción {index + 1}</p>
                    {game ? (
                      <div className="space-y-3">
                        {(game.image || game.thumbnail) && (
                          <img
                            src={game.image || game.thumbnail}
                            alt={game.name}
                            className="w-full h-36 object-contain rounded-lg bg-[var(--color-tableRowHover)]"
                          />
                        )}
                        <div>
                          <p className="font-medium text-[var(--color-text)]">{game.name}</p>
                          <p className="text-xs text-[var(--color-textSecondary)]">{game.yearPublished || 'Sin año'}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => setActiveSlot(index)}>Cambiar</Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedGames((current) => current.map((item, slotIndex) => (slotIndex === index ? null : item)))}
                          >
                            Quitar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button type="button" variant="outline" onClick={() => setActiveSlot(index)}>
                        Seleccionar juego
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {(() => {
              const reasons: string[] = [];
              if (hasOpenBox) reasons.push('Ya tienes una caja misteriosa activa');
              if (!form.date) reasons.push('Falta la fecha');
              if (!form.title.trim()) reasons.push('Falta el título');
              if (!form.location.trim()) reasons.push('Falta la ubicación');
              if (selectedCount < 2) reasons.push('Selecciona al menos 2 juegos');
              const isDisabled = createMutation.isPending || reasons.length > 0;
              return (
                <div className="flex flex-col items-end gap-1">
                  <div className="relative group inline-block">
                    <Button
                      type="button"
                      onClick={() => createMutation.mutate()}
                      disabled={isDisabled}
                    >
                      {createMutation.isPending ? 'Creando...' : 'Crear caja misteriosa'}
                    </Button>
                    {reasons.length > 0 && (
                      <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-max max-w-xs rounded-lg bg-[var(--color-cardBackground)] border border-[var(--color-cardBorder)] px-3 py-2 text-xs text-[var(--color-textSecondary)] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                        {reasons.join(' · ')}
                      </div>
                    )}
                  </div>
                  {reasons.length > 0 && (
                    <p className="text-xs text-[var(--color-textSecondary)] text-right sm:hidden">
                      {reasons.join(' · ')}
                    </p>
                  )}
                </div>
              );
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">Mis cajas sorpresa</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <p className="text-sm text-[var(--color-textSecondary)]">Cargando cajas sorpresa...</p>}
            {!isLoading && boxes.length === 0 && (
              <p className="text-sm text-[var(--color-textSecondary)]">Todavía no has creado ninguna caja misteriosa.</p>
            )}

            {boxes.map((box) => (
              <div key={box.id} className="rounded-xl border border-[var(--color-cardBorder)] p-4 space-y-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-[var(--color-text)]">{box.title}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-[var(--color-tableRowHover)] text-[var(--color-textSecondary)]">
                        {box.status === 'OPEN' ? 'Abierta' : box.status === 'RESOLVED' ? 'Resuelta' : 'Cerrada'}
                      </span>
                    </div>
                    {box.subtitle && <p className="text-sm text-[var(--color-textSecondary)] mt-1">{box.subtitle}</p>}
                    <p className="text-sm text-[var(--color-textSecondary)] mt-2">
                      {formatDate(box.eventDate)} · {formatEventTime(box)} · {box.location}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => shareOnWhatsApp(box)}>
                      WhatsApp
                    </Button>
                    {box.status === 'OPEN' && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => closeMutation.mutate(box.id)}
                        disabled={closeMutation.isPending}
                      >
                        Cerrar
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {box.options.map((option) => (
                    <div key={option.id} className="rounded-lg border border-[var(--color-cardBorder)] p-3 bg-[var(--color-tableRowHover)]/40">
                      {(option.gameImage || option.gameThumbnail) && (
                        <img
                          src={option.gameImage || option.gameThumbnail || ''}
                          alt={option.gameName}
                          className="w-full h-28 object-contain rounded-md bg-[var(--color-cardBackground)] mb-2"
                        />
                      )}
                      <p className="font-medium text-[var(--color-text)]">{option.gameName}</p>
                      {option.isWinner && (
                        <p className="text-xs text-green-700 mt-1">Juego ganador</p>
                      )}
                    </div>
                  ))}
                </div>

                {box.resolvedEvent && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
                    Partida creada: {box.resolvedEvent.gameName || box.resolvedEvent.title}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <GameSearchModal
        isOpen={activeSlot !== null}
        onClose={() => setActiveSlot(null)}
        onSelect={handleGameSelect}
        title="Seleccionar juego para la caja misteriosa"
        allowRPGG={false}
      />
    </Layout>
  );
}
