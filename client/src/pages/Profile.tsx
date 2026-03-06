// client/src/pages/Profile.tsx
import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import ThemeSelector from '../components/ThemeSelector';
import NoughterColorSelector from '../components/profile/NoughterColorSelector';
import BadgeGrid from '../components/badges/BadgeGrid';
import ChangePasswordSection from '../components/profile/ChangePasswordSection';
import { useToast } from '../hooks/useToast';
import { api } from '../api/axios';
import type { UserProfile, UpdateProfileData } from '../types/profile';
import { displayName, fullNameTooltip } from '../utils/displayName';
import type { ApiResponse } from '../types/auth';
import type { UserBadgesResponse } from '../types/badge';

function FieldRow({
  label,
  fieldKey,
  display,
  editingField,
  onEdit,
  onSave,
  onCancel,
  isSaving,
  children,
}: {
  label: string;
  fieldKey: string;
  display: React.ReactNode;
  editingField: string | null;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving?: boolean;
  children: React.ReactNode;
}) {
  const isActive = editingField === fieldKey;
  return (
    <div>
      <p className="text-sm text-[var(--color-textSecondary)]">{label}</p>
      {isActive ? (
        <div className="mt-1 space-y-2">
          {children}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={onSave}
              className="px-3 py-1 text-xs font-medium bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primaryDark)] disabled:opacity-60"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1 text-xs font-medium border border-[var(--color-cardBorder)] rounded-md text-[var(--color-textSecondary)] hover:bg-[var(--color-tableRowHover)]"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="group flex items-start gap-2 mt-0.5">
          <div className="font-medium text-[var(--color-text)]">{display}</div>
          <button
            type="button"
            onClick={onEdit}
            title="Editar"
            className="opacity-40 hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--color-tableRowHover)] text-[var(--color-textSecondary)] hover:text-[var(--color-text)] flex-shrink-0 mt-0.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function NotifToggle({
  value,
  label,
  description,
  onToggle,
  disabled = false,
  tooltip,
  muted = false,
}: {
  value: boolean;
  label: string;
  description?: string;
  onToggle?: () => void;
  disabled?: boolean;
  tooltip?: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onToggle}
      disabled={disabled}
      title={tooltip}
      className={`flex items-start gap-3 w-full text-left rounded-lg px-2 py-1.5 transition-colors ${
        disabled ? 'cursor-default' : 'cursor-pointer hover:bg-[var(--color-tableRowHover)]'
      }`}
    >
      <span
        className={`flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold transition-colors ${
          value
            ? 'bg-green-500 text-white'
            : muted
            ? 'bg-[var(--color-cardBorder)] text-[var(--color-textSecondary)] opacity-40'
            : 'bg-[var(--color-cardBorder)] text-[var(--color-textSecondary)]'
        }`}
      >
        {value ? '✓' : '✕'}
      </span>
      <div>
        <span className={`text-sm font-medium ${muted ? 'text-[var(--color-textSecondary)] opacity-40' : 'text-[var(--color-text)]'}`}>
          {label}
          {tooltip && <span className="ml-1 text-xs opacity-60" title={tooltip}>ⓘ</span>}
        </span>
        {description && (
          <p className={`text-xs mt-0.5 ${muted ? 'opacity-40' : 'text-[var(--color-textSecondary)]'}`}>{description}</p>
        )}
      </div>
    </button>
  );
}

export default function Profile() {
  const { success, error: showError } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [favoriteGamesInput, setFavoriteGamesInput] = useState('');
  const [calendarCopied, setCalendarCopied] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [fieldValue, setFieldValue] = useState('');

  // Fetch profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ profile: UserProfile }>>('/api/profile/me');
      return response.data.data?.profile;
    }
  });

  // Fetch badges
  const { data: badgesData, isLoading: isLoadingBadges } = useQuery({
    queryKey: ['myBadges'],
    queryFn: async () => {
      const response = await api.get<UserBadgesResponse>('/api/badges/my-badges');
      return response.data.data;
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
    },
    onError: () => {
      showError('Error al actualizar perfil');
    }
  });

  const saveField = (key: keyof UpdateProfileData, value: any) => {
    updateMutation.mutate({ [key]: value } as UpdateProfileData, {
      onSuccess: () => setEditingField(null),
    });
  };

  const startEditField = (key: string, current: string) => {
    setEditingField(key);
    setFieldValue(current);
  };

  const [formData, setFormData] = useState<UpdateProfileData>({});

  // Función para subir avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showError('Tipo de archivo no permitido. Solo JPG, PNG, GIF o WebP');
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError('La imagen no puede superar 5MB');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      await api.post('/api/profile/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      success('Avatar actualizado correctamente');
    } catch {
      showError('Error al subir avatar');
    } finally {
      setIsUploadingAvatar(false);
      // Limpiar input para permitir subir el mismo archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const generateCalendarTokenMutation = useMutation({
    mutationFn: () => api.post<ApiResponse<{ token: string }>>('/api/calendar/token'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
      success('URL de calendario generada');
    },
    onError: () => showError('Error al generar la URL del calendario')
  });

  const handleCopyCalendarUrl = (token: string) => {
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/calendar/${token}`;
    navigator.clipboard.writeText(url).then(() => {
      setCalendarCopied(true);
      setTimeout(() => setCalendarCopied(false), 2000);
    });
  };

  const handleEdit = () => {
    if (profile) {
      setFavoriteGamesInput((profile.favoriteGames || []).join(', '));
      setFormData({
        avatar: profile.avatar || '',
        nick: profile.nick || '',
        phone: profile.phone || '',
        birthDate: profile.birthDate ? profile.birthDate.split('T')[0] : '',
        bio: profile.bio || '',
        favoriteGames: profile.favoriteGames || [],
        playStyle: profile.playStyle || '',
        discord: profile.discord || '',
        telegram: profile.telegram || '',
        notifications: profile.notifications,
        emailUpdates: false,
        notifyNewEvents: profile.notifyNewEvents,
        notifyEventChanges: profile.notifyEventChanges,
        notifyEventCancelled: profile.notifyEventCancelled,
        notifyInvitations: profile.notifyInvitations,
        allowEventInvitations: profile.allowEventInvitations,
        noughterColor: profile.noughterColor ?? undefined
      });
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({});
    setFavoriteGamesInput('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData, { onSuccess: () => setIsEditing(false) });
  };

  const handleFavoriteGamesChange = (value: string) => {
    setFavoriteGamesInput(value);
    const games = value.split(/[;,]/).map(g => g.trim()).filter(g => g);
    setFormData({ ...formData, favoriteGames: games });
  };

  const handleNoughterChange = (color: string | null) => {
    if (updateMutation.isPending) return;
    const nextColor = color ?? null;

    queryClient.setQueryData(['myProfile'], (current?: UserProfile) => {
      if (!current) return current;
      return { ...current, noughterColor: nextColor };
    });

    updateMutation.mutate({ noughterColor: nextColor });
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
            <h1 className="text-3xl font-bold text-[var(--color-text)]">Mi Perfil</h1>
            <p className="text-[var(--color-textSecondary)] mt-1">Gestiona tu información personal</p>
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
              {/* Avatar con opción de cambio */}
              <div className="relative group">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.user?.name || 'Avatar'}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primaryDark))' }}
                  >
                    <span className="text-3xl font-bold text-white">
                      {profile.user?.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Overlay para cambiar foto */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute inset-0 w-20 h-20 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  title="Cambiar foto"
                >
                  {isUploadingAvatar ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
                {/* Input oculto para selección de archivo */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>
              <div>
                <h2
                  className="text-2xl font-bold text-[var(--color-text)]"
                  title={fullNameTooltip(profile.user?.name ?? '', profile.nick)}
                >
                  {displayName(profile.user?.name ?? '', profile.nick)}
                </h2>
                {profile.nick && (
                  <p className="text-sm text-[var(--color-textSecondary)]">{profile.user?.name}</p>
                )}
                <p className="text-[var(--color-textSecondary)]">{profile.user?.email}</p>
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">Pasa el cursor sobre la foto para cambiarla</p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {isEditing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Información Personal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                        Nick (nombre visible en partidas y comentarios)
                      </label>
                      <input
                        type="text"
                        value={formData.nick || ''}
                        onChange={(e) => setFormData({ ...formData, nick: e.target.value })}
                        className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        placeholder="Ej: Llorx, Chemi, Worf..."
                        maxLength={30}
                      />
                      <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                        Si lo rellenas, este nombre aparecerá en toda la web. El nombre real siempre estará disponible para administración.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        placeholder="+34 600 000 000"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                        Fecha de Nacimiento
                      </label>
                      <input
                        type="date"
                        value={formData.birthDate || ''}
                        onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                        className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                      Biografía
                    </label>
                    <textarea
                      value={formData.bio || ''}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      rows={4}
                      className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                      placeholder="Cuéntanos sobre ti..."
                    />
                  </div>
                </div>

                {/* Gaming Preferences */}
                <div>
                  <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Preferencias de Juego</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                        Juegos Favoritos
                      </label>
                      <input
                        type="text"
                        value={favoriteGamesInput}
                        onChange={(e) => handleFavoriteGamesChange(e.target.value)}
                        className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        placeholder="Catan, Ticket to Ride, Pandemic"
                      />
                      <p className="text-xs text-[var(--color-textSecondary)] mt-1">Separados por comas o punto y coma</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                        Estilo de Juego
                      </label>
                      <select
                        value={formData.playStyle || ''}
                        onChange={(e) => setFormData({ ...formData, playStyle: e.target.value })}
                        className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
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
                  <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Redes Sociales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                        Discord
                      </label>
                      <input
                        type="text"
                        value={formData.discord || ''}
                        onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                        className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        placeholder="usuario#1234"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-2">
                        Telegram
                      </label>
                      <input
                        type="text"
                        value={formData.telegram || ''}
                        onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                        className="w-full px-4 py-2 border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                        placeholder="@usuario"
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-[var(--color-cardBorder)]">
                  <Button type="submit" variant="primary" disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : null}
          </CardContent>
        </Card>

        {!isEditing && (
          <>
            {/* Block 1: Información Personal + Preferencias de Juego + Redes Sociales */}
            <Card>
              <CardContent>
                <div className="space-y-6">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Información Personal</h3>
                    <div className="mb-4">
                      <FieldRow
                        label="Nick"
                        fieldKey="nick"
                        display={
                          <span title={profile.nick ? profile.user?.name : undefined}>
                            {profile.nick || 'No especificado'}
                          </span>
                        }
                        editingField={editingField}
                        onEdit={() => startEditField('nick', profile.nick || '')}
                        onSave={() => saveField('nick', fieldValue)}
                        onCancel={() => setEditingField(null)}
                        isSaving={updateMutation.isPending}
                      >
                        <input
                          type="text"
                          value={fieldValue}
                          onChange={e => setFieldValue(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                          placeholder="Ej: Llorx, Chemi, Worf..."
                          maxLength={30}
                          autoFocus
                        />
                      </FieldRow>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FieldRow
                        label="Teléfono"
                        fieldKey="phone"
                        display={profile.phone || 'No especificado'}
                        editingField={editingField}
                        onEdit={() => startEditField('phone', profile.phone || '')}
                        onSave={() => saveField('phone', fieldValue)}
                        onCancel={() => setEditingField(null)}
                        isSaving={updateMutation.isPending}
                      >
                        <input
                          type="tel"
                          value={fieldValue}
                          onChange={e => setFieldValue(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                          placeholder="+34 600 000 000"
                          autoFocus
                        />
                      </FieldRow>
                      <FieldRow
                        label="Fecha de Nacimiento"
                        fieldKey="birthDate"
                        display={formatDate(profile.birthDate)}
                        editingField={editingField}
                        onEdit={() => startEditField('birthDate', profile.birthDate ? profile.birthDate.split('T')[0] : '')}
                        onSave={() => saveField('birthDate', fieldValue || null)}
                        onCancel={() => setEditingField(null)}
                        isSaving={updateMutation.isPending}
                      >
                        <input
                          type="date"
                          value={fieldValue}
                          onChange={e => setFieldValue(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                          autoFocus
                        />
                      </FieldRow>
                    </div>
                    <div className="mt-4">
                      <FieldRow
                        label="Biografía"
                        fieldKey="bio"
                        display={profile.bio || 'No especificado'}
                        editingField={editingField}
                        onEdit={() => startEditField('bio', profile.bio || '')}
                        onSave={() => saveField('bio', fieldValue)}
                        onCancel={() => setEditingField(null)}
                        isSaving={updateMutation.isPending}
                      >
                        <textarea
                          value={fieldValue}
                          onChange={e => setFieldValue(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-1.5 text-sm border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-cardBackground)] text-[var(--color-text)] resize-y"
                          placeholder="Cuéntanos sobre ti..."
                          autoFocus
                        />
                      </FieldRow>
                    </div>
                  </div>

                  {/* Gaming Preferences */}
                  <div className="pt-4 border-t border-[var(--color-cardBorder)]">
                    <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Preferencias de Juego</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FieldRow
                        label="Juegos Favoritos"
                        fieldKey="favoriteGames"
                        display={
                          profile.favoriteGames.length > 0 ? (
                            <div className="flex flex-wrap gap-2 mt-1">
                              {profile.favoriteGames.map((game, idx) => (
                                <span key={idx} className="px-3 py-1 bg-[var(--color-primary-100)] text-[var(--color-primary-800)] rounded-full text-sm">
                                  {game}
                                </span>
                              ))}
                            </div>
                          ) : 'No especificado'
                        }
                        editingField={editingField}
                        onEdit={() => startEditField('favoriteGames', (profile.favoriteGames || []).join(', '))}
                        onSave={() => saveField('favoriteGames', fieldValue.split(/[;,]/).map(g => g.trim()).filter(g => g))}
                        onCancel={() => setEditingField(null)}
                        isSaving={updateMutation.isPending}
                      >
                        <>
                          <input
                            type="text"
                            value={fieldValue}
                            onChange={e => setFieldValue(e.target.value)}
                            className="w-full px-3 py-1.5 text-sm border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                            placeholder="Catan, Ticket to Ride, Pandemic"
                            autoFocus
                          />
                          <p className="text-xs text-[var(--color-textSecondary)]">Separados por comas o punto y coma</p>
                        </>
                      </FieldRow>
                      <FieldRow
                        label="Estilo de Juego"
                        fieldKey="playStyle"
                        display={profile.playStyle || 'No especificado'}
                        editingField={editingField}
                        onEdit={() => startEditField('playStyle', profile.playStyle || '')}
                        onSave={() => saveField('playStyle', fieldValue)}
                        onCancel={() => setEditingField(null)}
                        isSaving={updateMutation.isPending}
                      >
                        <select
                          value={fieldValue}
                          onChange={e => setFieldValue(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                          autoFocus
                        >
                          <option value="">Selecciona...</option>
                          <option value="Competitivo">Competitivo</option>
                          <option value="Casual">Casual</option>
                          <option value="Social">Social</option>
                          <option value="Estratégico">Estratégico</option>
                          <option value="Party Games">Party Games</option>
                        </select>
                      </FieldRow>
                    </div>
                  </div>

                  {/* Social */}
                  <div className="pt-4 border-t border-[var(--color-cardBorder)]">
                    <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Redes Sociales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FieldRow
                        label="Discord"
                        fieldKey="discord"
                        display={profile.discord || 'No especificado'}
                        editingField={editingField}
                        onEdit={() => startEditField('discord', profile.discord || '')}
                        onSave={() => saveField('discord', fieldValue)}
                        onCancel={() => setEditingField(null)}
                        isSaving={updateMutation.isPending}
                      >
                        <input
                          type="text"
                          value={fieldValue}
                          onChange={e => setFieldValue(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                          placeholder="usuario#1234"
                          autoFocus
                        />
                      </FieldRow>
                      <FieldRow
                        label="Telegram"
                        fieldKey="telegram"
                        display={profile.telegram || 'No especificado'}
                        editingField={editingField}
                        onEdit={() => startEditField('telegram', profile.telegram || '')}
                        onSave={() => saveField('telegram', fieldValue)}
                        onCancel={() => setEditingField(null)}
                        isSaving={updateMutation.isPending}
                      >
                        <input
                          type="text"
                          value={fieldValue}
                          onChange={e => setFieldValue(e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-[var(--color-inputBorder)] rounded-lg focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent bg-[var(--color-cardBackground)] text-[var(--color-text)]"
                          placeholder="@usuario"
                          autoFocus
                        />
                      </FieldRow>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Block 1.5: Sincronización de Calendario */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Sincronización de Calendario</h3>
                {profile.calendarToken ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/calendar/${profile.calendarToken}`}
                        className="flex-1 px-3 py-2 text-xs border border-[var(--color-inputBorder)] rounded-lg bg-[var(--color-tableRowHover)] text-[var(--color-textSecondary)] truncate"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopyCalendarUrl(profile.calendarToken!)}
                        className="px-3 py-2 text-sm font-medium border border-[var(--color-inputBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] text-[var(--color-text)] whitespace-nowrap"
                      >
                        {calendarCopied ? 'Copiado' : 'Copiar URL'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => generateCalendarTokenMutation.mutate()}
                      disabled={generateCalendarTokenMutation.isPending}
                      className="text-xs text-[var(--color-textSecondary)] hover:text-[var(--color-text)] underline"
                    >
                      Regenerar URL (invalida la anterior)
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => generateCalendarTokenMutation.mutate()}
                    disabled={generateCalendarTokenMutation.isPending}
                    className="px-4 py-2 text-sm font-medium border border-[var(--color-inputBorder)] rounded-lg hover:bg-[var(--color-tableRowHover)] text-[var(--color-text)]"
                  >
                    {generateCalendarTokenMutation.isPending ? 'Generando...' : 'Generar URL de calendario'}
                  </button>
                )}
              </CardContent>
            </Card>

            {/* Block 2: Seguridad */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Seguridad</h3>
                <ChangePasswordSection />
              </CardContent>
            </Card>

            {/* Block 3: Configuración */}
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Configuración</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-textSecondary)] mb-3">Notificaciones</p>
                    <div className="space-y-2">
                      <NotifToggle
                        value={profile.notifications}
                        label="Notificaciones en la aplicación"
                        onToggle={() => updateMutation.mutate({ notifications: !profile.notifications })}
                        disabled={updateMutation.isPending}
                      />
                      <NotifToggle
                        value={false}
                        label="Actualizaciones por email"
                        disabled
                        tooltip="De momento no disponible"
                        muted
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[var(--color-cardBorder)]">
                    <p className="text-sm font-medium text-[var(--color-textSecondary)] mb-3">Preferencias de Notificaciones</p>
                    <div className="space-y-2">
                      <NotifToggle
                        value={profile.notifyNewEvents}
                        label="Nuevas partidas creadas"
                        onToggle={() => updateMutation.mutate({ notifyNewEvents: !profile.notifyNewEvents })}
                        disabled={updateMutation.isPending}
                      />
                      <NotifToggle
                        value={profile.notifyEventChanges}
                        label="Cambios en eventos inscritos"
                        onToggle={() => updateMutation.mutate({ notifyEventChanges: !profile.notifyEventChanges })}
                        disabled={updateMutation.isPending}
                      />
                      <NotifToggle
                        value={profile.notifyEventCancelled}
                        label="Eventos cancelados"
                        onToggle={() => updateMutation.mutate({ notifyEventCancelled: !profile.notifyEventCancelled })}
                        disabled={updateMutation.isPending}
                      />
                      <NotifToggle
                        value={profile.notifyInvitations}
                        label="Estado de invitaciones"
                        onToggle={() => updateMutation.mutate({ notifyInvitations: !profile.notifyInvitations })}
                        disabled={updateMutation.isPending}
                      />
                      <NotifToggle
                        value={profile.allowEventInvitations}
                        label="Permitir invitaciones a partidas"
                        onToggle={() => updateMutation.mutate({ allowEventInvitations: !profile.allowEventInvitations })}
                        disabled={updateMutation.isPending}
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[var(--color-cardBorder)]">
                    <p className="text-sm font-medium text-[var(--color-textSecondary)] mb-3">Tema de la aplicación</p>
                    <ThemeSelector />
                  </div>

                  <div className="pt-4 border-t border-[var(--color-cardBorder)]">
                    <p className="text-sm font-medium text-[var(--color-textSecondary)] mb-3">Personalización</p>
                    <NoughterColorSelector
                      selectedColor={profile.noughterColor}
                      onChange={handleNoughterChange}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Block 4: Logros y Badges */}
            <Card>
              <CardContent>
                {isLoadingBadges ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
                  </div>
                ) : badgesData ? (
                  <BadgeGrid
                    allBadges={badgesData.allBadges}
                    unlockedBadges={badgesData.unlockedBadges}
                    progress={badgesData.progress}
                    userId={profile?.userId}
                  />
                ) : (
                  <div className="text-center py-8">
                    <p className="text-[var(--color-textSecondary)]">No se pudieron cargar los badges</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}

