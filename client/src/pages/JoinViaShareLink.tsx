// client/src/pages/JoinViaShareLink.tsx
import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/axios';
import type { ApiResponse } from '../types/auth';

interface ShareLinkData {
  event: { id: string };
}

export default function JoinViaShareLink() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const { data, isError } = useQuery({
    queryKey: ['shareLink', token],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ShareLinkData>>(`/api/share/${token}`);
      return res.data.data!;
    },
    enabled: !!token,
    retry: false
  });

  useEffect(() => {
    if (!data) return;
    const eventPath = `/events/${data.event.id}`;
    if (localStorage.getItem('token')) {
      navigate(eventPath, { replace: true });
    } else {
      navigate(`/login?redirect=${encodeURIComponent(eventPath)}`, { replace: true });
    }
  }, [data, navigate]);

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center p-8">
          <p className="text-lg font-semibold text-[var(--color-text)] mb-2">Enlace no válido</p>
          <p className="text-[var(--color-textSecondary)]">Este enlace no existe o ha expirado.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
      <p className="text-[var(--color-textSecondary)]">Cargando...</p>
    </div>
  );
}
