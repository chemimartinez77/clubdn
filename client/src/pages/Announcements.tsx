// client/src/pages/Announcements.tsx
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import { api } from '../api/axios';
import type { Announcement } from '../types/announcement';
import type { ApiResponse } from '../types/auth';

export default function Announcements() {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Announcement[]>>('/api/announcements');
      return res.data.data ?? [];
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
          <div className="space-y-3">
            {announcements.map(a => (
              <Card key={a.id}>
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
                  <p className="text-xs text-[var(--color-textSecondary)] mt-2">
                    {new Date(a.createdAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
