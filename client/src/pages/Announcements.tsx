// client/src/pages/Announcements.tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import { api } from '../api/axios';
import { useToast } from '../hooks/useToast';
import type { Announcement } from '../types/announcement';
import type { ApiResponse } from '../types/auth';

export default function Announcements() {
  const queryClient = useQueryClient();
  const { error: showError } = useToast();

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Announcement[]>>('/api/announcements');
      return res.data.data ?? [];
    }
  });

  const likeMutation = useMutation({
    mutationFn: (id: string) => api.post<{ success: boolean; data: { userHasLiked: boolean; likeCount: number } }>(`/api/announcements/${id}/like`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['announcements'] });
      const previous = queryClient.getQueryData<Announcement[]>(['announcements']);
      queryClient.setQueryData<Announcement[]>(['announcements'], old =>
        old?.map(a => a.id === id
          ? { ...a, userHasLiked: !a.userHasLiked, likeCount: a.userHasLiked ? a.likeCount - 1 : a.likeCount + 1 }
          : a
        )
      );
      return { previous };
    },
    onError: (err: any, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['announcements'], context.previous);
      if (err?.response?.status === 429) showError('Espera unos segundos antes de volver a dar Me gusta');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    }
  });

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)] mb-6">Tablón de anuncios</h1>

        {isLoading ? (
          <p className="text-sm text-[var(--color-textSecondary)]">Cargando anuncios...</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-[var(--color-textSecondary)]">No hay anuncios publicados.</p>
        ) : (
          <div className="space-y-6">
            {announcements.map(a => (
              <div key={a.id} className="relative">
                <Card>
                  <CardContent className="py-4">
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
                    <p className="text-xs text-[var(--color-textSecondary)] mt-3">
                      {new Date(a.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </CardContent>
                </Card>
                <button
                  onClick={() => !likeMutation.isPending && likeMutation.mutate(a.id)}
                  disabled={likeMutation.isPending}
                  className={`absolute -bottom-3 right-4 flex items-center gap-1.5 text-sm px-3 py-1 rounded-full border transition-all ${
                    a.userHasLiked
                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)] text-white font-medium'
                      : 'bg-[var(--color-cardBackground)] border-[var(--color-cardBorder)] text-[var(--color-textSecondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]'
                  }`}
                >
                  {a.userHasLiked && <img src="/meeple.blue.png" alt="" className="w-4 h-4 object-contain" />}
                  Me gusta
                  {a.likeCount > 0 && <span>· {a.likeCount}</span>}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
