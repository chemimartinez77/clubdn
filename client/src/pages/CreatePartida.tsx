// client/src/pages/CreatePartida.tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import GameSearchModal from '../components/events/GameSearchModal';
import { useToast } from '../hooks/useToast';
import { api } from '../api/axios';
import type { BGGGame, CreateEventData } from '../types/event';
import { getCategoryDisplayName, getCategoryIcon } from '../types/badge';

export default function CreatePartida() {
  const navigate = useNavigate();
  const location = useLocation();
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();

  // Obtener fecha predefinida del estado de navegación (desde el calendario)
  const preselectedDate = (location.state as { selectedDate?: string })?.selectedDate;

  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<BGGGame | null>(null);

  // Generar opciones para horas (0-23)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  // Opciones para minutos (0, 15, 30, 45)
  const minutes = [0, 15, 30, 45];

  const createMutation = useMutation({
    mutationFn: async (data: CreateEventData) => {
      const response = await api.post('/api/events', data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      success(data.message || 'Partida creada correctamente');
      navigate('/events');
    },
    onError: (err: any) => {
      showError(err.response?.data?.message || 'Error al crear partida');
    }
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const dateValue = formData.get('date') as string;
    const startHour = formData.get('startHour') as string;
    const startMinute = formData.get('startMinute') as string;
    const locationValue = (formData.get('location') as string)?.trim();
    const attend = formData.get('attend') === 'on';

    // Crear fecha completa con hora
    const eventDate = new Date(dateValue);
    if (startHour) eventDate.setHours(parseInt(startHour));
    if (startMinute) eventDate.setMinutes(parseInt(startMinute));

    const gameCategory = formData.get('gameCategory') as string;

    const data: CreateEventData = {
      type: 'PARTIDA',
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      date: eventDate.toISOString(),
      startHour: startHour ? parseInt(startHour) : undefined,
      startMinute: startMinute ? parseInt(startMinute) : undefined,
      durationHours: formData.get('durationHours') ? parseInt(formData.get('durationHours') as string) : undefined,
      durationMinutes: formData.get('durationMinutes') ? parseInt(formData.get('durationMinutes') as string) : undefined,
      location: locationValue || 'Club DN',
      address: (formData.get('address') as string) || undefined,
      maxAttendees: parseInt(formData.get('maxAttendees') as string),
      attend,
      gameName: selectedGame?.name,
      gameImage: selectedGame?.image,
      bggId: selectedGame?.id,
      gameCategory: gameCategory || undefined
    };

    createMutation.mutate(data);
  };

  const handleGameSelect = async (game: BGGGame) => {
    setSelectedGame(game);

    // Guardar el juego completo en la base de datos
    try {
      await api.get(`/api/games/${game.id}`);
      console.log(`Juego ${game.name} guardado en BD`);
    } catch (error) {
      console.error('Error al guardar juego en BD:', error);
      // No mostramos error al usuario porque el juego ya se seleccionó correctamente
    }
  };

  const handleRemoveGame = () => {
    setSelectedGame(null);
  };

  // Fecha mínima (hoy)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[var(--color-textSecondary)] hover:text-[var(--color-text)] mb-4"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <h1 className="text-3xl font-bold text-[var(--color-text)]">Organizar una Partida</h1>
          <p className="text-[var(--color-textSecondary)] mt-1">Crea una partida para jugar con otros miembros del club</p>
        </div>

        {/* Form */}
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Juego */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Elige un juego (opcional)
                </label>
                {selectedGame ? (
                  <div className="flex items-center gap-4 p-4 border border-[var(--color-primary-300)] rounded-lg bg-[var(--color-primary-50)]">
                    {selectedGame.image && (
                      <img
                        src={selectedGame.image}
                        alt={selectedGame.name}
                        className="w-16 h-16 object-cover rounded"
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
                      className="text-red-600 hover:text-red-800"
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
                    Buscar juego en BoardGameGeek
                  </button>
                )}
              </div>

              {/* Categoría del juego (para badges) */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Categoría del juego (opcional)
                </label>
                <select
                  name="gameCategory"
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  <option value="">Sin categoría</option>
                  <option value="EUROGAMES">{getCategoryIcon('EUROGAMES')} {getCategoryDisplayName('EUROGAMES')}</option>
                  <option value="TEMATICOS">{getCategoryIcon('TEMATICOS')} {getCategoryDisplayName('TEMATICOS')}</option>
                  <option value="WARGAMES">{getCategoryIcon('WARGAMES')} {getCategoryDisplayName('WARGAMES')}</option>
                  <option value="ROL">{getCategoryIcon('ROL')} {getCategoryDisplayName('ROL')}</option>
                  <option value="MINIATURAS">{getCategoryIcon('MINIATURAS')} {getCategoryDisplayName('MINIATURAS')}</option>
                  <option value="WARHAMMER">{getCategoryIcon('WARHAMMER')} {getCategoryDisplayName('WARHAMMER')}</option>
                  <option value="FILLERS_PARTY">{getCategoryIcon('FILLERS_PARTY')} {getCategoryDisplayName('FILLERS_PARTY')}</option>
                </select>
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                  Ayuda a otros miembros a desbloquear badges automáticamente
                </p>
              </div>

              {/* Asistencia */}
              <div className="flex items-center gap-3 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] px-4 py-3">
                <input
                  id="attend"
                  name="attend"
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 rounded border-[var(--color-inputBorder)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <label htmlFor="attend" className="text-sm text-[var(--color-textSecondary)]">
                  Asistire a la partida
                </label>
              </div>

              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Título de la partida *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  minLength={3}
                  maxLength={100}
                  defaultValue={selectedGame ? `${selectedGame.name}` : ''}
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  placeholder="Ej: Partida de Catan"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Descripción de la partida *
                </label>
                <textarea
                  name="description"
                  required
                  minLength={10}
                  rows={4}
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
                  placeholder="Dale a los jugadores más información acerca de la partida..."
                />
              </div>

              {/* Fecha y Hora */}
              <div>
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
                      defaultValue={preselectedDate || ''}
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Hora</label>
                    <select
                      name="startHour"
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    >
                      <option value="">--</option>
                      {minutes.map(minute => (
                        <option key={minute} value={minute}>
                          {minute.toString().padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Duración estimada */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Duración estimada (opcional)
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-[var(--color-textSecondary)] mb-1">Horas</label>
                    <select
                      name="durationHours"
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
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
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    >
                      <option value="">--</option>
                      {minutes.map(minute => (
                        <option key={minute} value={minute}>{minute}min</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Número de jugadores */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  ¿Cuántos necesitáis para la partida? *
                </label>
                <input
                  type="number"
                  name="maxAttendees"
                  required
                  min={1}
                  max={100}
                  defaultValue={4}
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                  Incluye el organizador en este número
                </p>
              </div>

              {/* Ubicación */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Ubicación (opcional)
                </label>
                <input
                  type="text"
                  name="location"
                  minLength={3}
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  placeholder="Club DN"
                />
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                  Dirección (opcional)
                </label>
                <input
                  type="text"
                  name="address"
                  className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  placeholder="Direccion completa"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={createMutation.isPending}
                  className="flex-1"
                >
                  {createMutation.isPending ? 'Creando...' : 'Guardar'}
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

      {/* Game Search Modal */}
      <GameSearchModal
        isOpen={isGameModalOpen}
        onClose={() => setIsGameModalOpen(false)}
        onSelect={handleGameSelect}
      />
    </Layout>
  );
}

