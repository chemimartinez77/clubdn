// client/src/pages/admin/Announcements.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { api } from '../../api/axios';
import { useAuth } from '../../contexts/AuthContext';
import type { Announcement, AnnouncementFormData } from '../../types/announcement';
import type { ApiResponse } from '../../types/auth';

const EMPTY_FORM: AnnouncementFormData = { title: '', content: '', pinned: false };

export default function AdminAnnouncements() {
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [form, setForm] = useState<AnnouncementFormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Announcement[]>>('/api/announcements');
      return res.data.data ?? [];
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: AnnouncementFormData) =>
      api.post('/api/announcements', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      success('Anuncio creado');
      setForm(EMPTY_FORM);
      setShowForm(false);
    },
    onError: () => showError('Error al crear el anuncio')
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AnnouncementFormData }) =>
      api.put(`/api/announcements/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      success('Anuncio actualizado');
      setEditingId(null);
      setForm(EMPTY_FORM);
      setShowForm(false);
    },
    onError: () => showError('Error al actualizar el anuncio')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/announcements/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      success('Anuncio eliminado');
    },
    onError: () => showError('Error al eliminar el anuncio')
  });

  const notifyMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/announcements/${id}/notify`),
    onSuccess: () => success('Notificación enviada a todos los usuarios'),
    onError: () => showError('Error al enviar la notificación')
  });

  const handleEdit = (a: Announcement) => {
    setEditingId(a.id);
    setForm({ title: a.title ?? '', content: a.content, pinned: a.pinned });
    setShowForm(true);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!form.content.trim()) return;
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Tablón de anuncios</h1>
          {!showForm && (
            <Button onClick={() => setShowForm(true)}>Nuevo anuncio</Button>
          )}
        </div>

        {showForm && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Editar anuncio' : 'Nuevo anuncio'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Título (opcional)
                </label>
                <input
                  type="text"
                  value={form.title ?? ''}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Ej: Cambio de horario"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-inputBackground)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-primary)]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-textSecondary)] mb-1">
                  Contenido <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  rows={4}
                  placeholder="Escribe el anuncio aquí..."
                  className="w-full px-3 py-2 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-inputBackground)] text-[var(--color-text)] text-sm focus:outline-none focus:border-[var(--color-primary)] resize-none"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pinned ?? false}
                  onChange={e => setForm(f => ({ ...f, pinned: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-[var(--color-textSecondary)]">Fijar arriba</span>
              </label>
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSubmit} disabled={isPending || !form.content.trim()}>
                  {editingId ? 'Guardar cambios' : 'Publicar'}
                </Button>
                <Button variant="secondary" onClick={handleCancel} disabled={isPending}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <p className="text-sm text-[var(--color-textSecondary)]">Cargando anuncios...</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-[var(--color-textSecondary)]">No hay anuncios publicados.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map(a => (
              <Card key={a.id}>
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {a.pinned && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                            Fijado
                          </span>
                        )}
                        {a.title && (
                          <span className="font-semibold text-[var(--color-text)]">{a.title}</span>
                        )}
                      </div>
                      <p className="text-sm text-[var(--color-text)] whitespace-pre-wrap">{a.content}</p>
                      <p className="text-xs text-[var(--color-textSecondary)] mt-2">
                        {a.author.name} · {new Date(a.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {isSuperAdmin && (
                        <button
                          onClick={() => notifyMutation.mutate(a.id)}
                          disabled={notifyMutation.isPending}
                          title="Notificar"
                          aria-label="Notificar"
                          className="text-[var(--color-primary)] hover:text-[var(--color-primary)]/80 transition-colors disabled:opacity-50"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(a)}
                        className="text-xs text-[var(--color-textSecondary)] hover:text-[var(--color-primary)] transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(a.id)}
                        disabled={deleteMutation.isPending}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
