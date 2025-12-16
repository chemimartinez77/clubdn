// client/src/pages/Profile.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ThemeSelector from '../components/ThemeSelector';
import { useToast } from '../hooks/useToast';
import { api } from '../api/axios';
import type { UserProfile, UpdateProfileData } from '../types/profile';
import type { ApiResponse } from '../types/auth';

export default function Profile() {
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ profile: UserProfile }>>('/api/profile/me');
      return response.data.data?.profile;
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      const response = await api.put<ApiResponse<{ profile: UserProfile }>>('/api/profile/me', data);
      return response.data.data?.profile;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      success('Perfil actualizado correctamente');
      setIsEditing(false);
    },
    onError: () => {
      showError('Error al actualizar perfil');
    }
  });

  const [formData, setFormData] = useState<UpdateProfileData>({});

  const handleEdit = () => {
    if (profile) {
      setFormData({
        avatar: profile.avatar || '',
        phone: profile.phone || '',
        birthDate: profile.birthDate ? profile.birthDate.split('T')[0] : '',
        bio: profile.bio || '',
        favoriteGames: profile.favoriteGames || [],
        playStyle: profile.playStyle || '',
        discord: profile.discord || '',
        telegram: profile.telegram || '',
        notifications: profile.notifications,
        emailUpdates: profile.emailUpdates
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleFavoriteGamesChange = (value: string) => {
    const games = value.split(',').map(g => g.trim()).filter(g => g);
    setFormData({ ...formData, favoriteGames: games });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-red-600">Error al cargar el perfil</p>
        </div>
      </Layout>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No especificado';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
            <p className="text-gray-600 mt-1">Gestiona tu información personal</p>
          </div>
          {!isEditing && (
            <Button onClick={handleEdit} variant="primary">
              Editar Perfil
            </Button>
          )}
        </div>

        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primaryDark))' }}
              >
                <span className="text-3xl font-bold text-white">
                  {profile.user?.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{profile.user?.name}</h2>
                <p className="text-gray-600">{profile.user?.email}</p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        placeholder="+34 600 000 000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fecha de Nacimiento
                      </label>
                      <input
                        type="date"
                        value={formData.birthDate || ''}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Biografía
                    </label>
                    <textarea
                      value={formData.bio || ''}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="Cuéntanos sobre ti..."
                    />
                  </div>
                </div>

                {/* Gaming Preferences */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferencias de Juego</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Juegos Favoritos
                      </label>
                      <input
                        type="text"
                        value={formData.favoriteGames?.join(', ') || ''}
                        onChange={(e) => handleFavoriteGamesChange(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        placeholder="Catan, Ticket to Ride, Pandemic"
                      />
                      <p className="text-xs text-gray-500 mt-1">Separados por comas</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estilo de Juego
                      </label>
                      <select
                        value={formData.playStyle || ''}
                        onChange={(e) => setFormData({ ...formData, playStyle: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      >
                        <option value="">Selecciona...</option>
                        <option value="Competitivo">Competitivo</option>
                        <option value="Casual">Casual</option>
                        <option value="Social">Social</option>
                        <option value="Estratégico">Estratégico</option>
                        <option value="Party Games">Party Games</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Social */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Redes Sociales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Discord
                      </label>
                      <input
                        type="text"
                        value={formData.discord || ''}
                        onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        placeholder="usuario#1234"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Telegram
                      </label>
                      <input
                        type="text"
                        value={formData.telegram || ''}
                        onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        placeholder="@usuario"
                      />
                    </div>
                  </div>
                </div>

                {/* Notifications */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Notificaciones</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.notifications ?? true}
                        onChange={(e) => setFormData({ ...formData, notifications: e.target.checked })}
                        className="w-5 h-5 text-[var(--color-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)]"
                      />
                      <span className="text-sm text-gray-700">Recibir notificaciones en la aplicación</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.emailUpdates ?? true}
                        onChange={(e) => setFormData({ ...formData, emailUpdates: e.target.checked })}
                        className="w-5 h-5 text-[var(--color-primary)] border-gray-300 rounded focus:ring-[var(--color-primary)]"
                      />
                      <span className="text-sm text-gray-700">Recibir actualizaciones por email</span>
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <Button type="submit" variant="primary" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Información Personal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Teléfono</p>
                      <p className="font-medium text-gray-900">{profile.phone || 'No especificado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Fecha de Nacimiento</p>
                      <p className="font-medium text-gray-900">{formatDate(profile.birthDate)}</p>
                    </div>
                  </div>
                  {profile.bio && (
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">Biografía</p>
                      <p className="font-medium text-gray-900 mt-1">{profile.bio}</p>
                    </div>
                  )}
                </div>

                {/* Gaming Preferences */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Preferencias de Juego</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Juegos Favoritos</p>
                      {profile.favoriteGames.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {profile.favoriteGames.map((game, idx) => (
                            <span key={idx} className="px-3 py-1 bg-[var(--color-primary-100)] text-[var(--color-primary-800)] rounded-full text-sm">
                              {game}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="font-medium text-gray-900">No especificado</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Estilo de Juego</p>
                      <p className="font-medium text-gray-900">{profile.playStyle || 'No especificado'}</p>
                    </div>
                  </div>
                </div>

                {/* Social */}
                {(profile.discord || profile.telegram) && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Redes Sociales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {profile.discord && (
                        <div>
                          <p className="text-sm text-gray-500">Discord</p>
                          <p className="font-medium text-gray-900">{profile.discord}</p>
                        </div>
                      )}
                      {profile.telegram && (
                        <div>
                          <p className="text-sm text-gray-500">Telegram</p>
                          <p className="font-medium text-gray-900">{profile.telegram}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Settings */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuración</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded ${profile.notifications ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        <span className="text-sm text-gray-700">Notificaciones en la aplicación</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`w-5 h-5 rounded ${profile.emailUpdates ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                        <span className="text-sm text-gray-700">Actualizaciones por email</span>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm font-medium text-gray-700 mb-3">Tema de la aplicación</p>
                      <ThemeSelector />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
