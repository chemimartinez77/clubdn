import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api/axios';
import type { ApiResponse } from '../types/auth';
import type { SurpriseBox } from '../types/surpriseBox';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';

function formatDate(box: SurpriseBox) {
  return new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(box.eventDate));
}

function CardShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-background)] px-4 py-8">
      <div className="max-w-3xl mx-auto">{children}</div>
    </div>
  );
}

export default function SurpriseBoxLanding() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: showError } = useToast();
  const { user } = useAuth();

  const { data: box, isLoading, isError } = useQuery({
    queryKey: ['surpriseBoxPublic', token],
    queryFn: async () => {
      const response = await api.get<ApiResponse<SurpriseBox>>(`/api/surprise-boxes/public/${token}`);
      return response.data.data!;
    },
    enabled: !!token,
    retry: false,
  });

  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      const response = await api.post<ApiResponse<SurpriseBox>>(`/api/surprise-boxes/public/${token}/vote`, { optionId });
      return response.data.data!;
    },
    onSuccess: (data) => {
      success('Voto registrado. La partida ya está creada.');
      queryClient.setQueryData(['surpriseBoxPublic', token], data);
    },
    onError: (err: any) => {
      const status = err.response?.status;
      if (status === 401) {
        navigate(`/login?redirect=${encodeURIComponent(`/caja-sorpresa/${token}`)}`);
        return;
      }
      showError(err.response?.data?.message || 'No se ha podido votar esta caja sorpresa');
    },
  });

  if (isLoading) {
    return (
      <CardShell>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]" />
        </div>
      </CardShell>
    );
  }

  if (isError || !box) {
    return (
      <CardShell>
        <div className="rounded-2xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-8 text-center">
          <h1 className="text-2xl font-bold text-[var(--color-text)]">Caja sorpresa no disponible</h1>
          <p className="text-[var(--color-textSecondary)] mt-2">El enlace no existe o ya no está disponible.</p>
        </div>
      </CardShell>
    );
  }

  const winner = box.options.find((option) => option.id === box.winningOptionId) || null;

  return (
    <CardShell>
      <div className="rounded-3xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] shadow-xl overflow-hidden">
        {box.coverImageUrl && (
          <div className="h-72 bg-[var(--color-tableRowHover)]">
            <img src={box.coverImageUrl} alt={box.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-6 md:p-8 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs px-3 py-1 rounded-full bg-[var(--color-tableRowHover)] text-[var(--color-textSecondary)]">
                {box.status === 'OPEN' ? 'Caja abierta' : box.status === 'RESOLVED' ? 'Caja resuelta' : 'Caja cerrada'}
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-[var(--color-tableRowHover)] text-[var(--color-textSecondary)]">
                Organiza {box.createdBy.name}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-[var(--color-text)]">{box.title}</h1>
            {box.subtitle && <p className="text-lg text-[var(--color-textSecondary)]">{box.subtitle}</p>}
            {box.description && <p className="text-[var(--color-textSecondary)]">{box.description}</p>}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[var(--color-cardBorder)] p-4 bg-[var(--color-tableRowHover)]/40">
              <p className="text-xs uppercase tracking-wide text-[var(--color-textSecondary)]">Fecha</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{formatDate(box)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-cardBorder)] p-4 bg-[var(--color-tableRowHover)]/40">
              <p className="text-xs uppercase tracking-wide text-[var(--color-textSecondary)]">Ubicación</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{box.location}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-cardBorder)] p-4 bg-[var(--color-tableRowHover)]/40">
              <p className="text-xs uppercase tracking-wide text-[var(--color-textSecondary)]">Plazas</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{box.maxAttendees}</p>
            </div>
          </div>

          {box.status === 'OPEN' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-xl font-semibold text-[var(--color-text)]">Elige el juego sorpresa</h2>
                  <p className="text-sm text-[var(--color-textSecondary)]">
                    El primer socio que vote desbloquea automáticamente la partida.
                  </p>
                </div>
                {!user && (
                  <button
                    onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/caja-sorpresa/${token}`)}`)}
                    className="text-sm text-[var(--color-primary)] hover:underline"
                  >
                    Inicia sesión para votar
                  </button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {box.options.map((option) => (
                  <div key={option.id} className="rounded-2xl border border-[var(--color-cardBorder)] p-4 bg-[var(--color-tableRowHover)]/30 space-y-3">
                    {(option.gameImage || option.gameThumbnail) && (
                      <img
                        src={option.gameImage || option.gameThumbnail || ''}
                        alt={option.gameName}
                        className="w-full h-44 object-contain rounded-xl bg-[var(--color-cardBackground)]"
                      />
                    )}
                    <h3 className="font-semibold text-[var(--color-text)]">{option.gameName}</h3>
                    <button
                      onClick={() => voteMutation.mutate(option.id)}
                      disabled={voteMutation.isPending}
                      className="w-full px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50"
                    >
                      {voteMutation.isPending ? 'Votando...' : 'Elegir este juego'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {box.status === 'RESOLVED' && winner && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                <p className="text-xs uppercase tracking-wide text-green-700">Juego ganador</p>
                <h2 className="text-2xl font-bold text-green-900 mt-1">{winner.gameName}</h2>
                <p className="text-sm text-green-800 mt-2">
                  La caja sorpresa ya se ha resuelto. La partida está creada y lista para abrirse desde la app.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigate(user ? `/events/${box.resolvedEvent?.id}` : `/login?redirect=${encodeURIComponent(`/events/${box.resolvedEvent?.id}`)}`)}
                  className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90"
                >
                  {user ? 'Abrir partida' : 'Inicia sesión para abrir la partida'}
                </button>
              </div>
            </div>
          )}

          {box.status === 'CLOSED' && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-xl font-semibold text-amber-900">Caja cerrada</h2>
              <p className="text-sm text-amber-800 mt-2">
                Esta caja sorpresa ya no admite votos.
              </p>
            </div>
          )}
        </div>
      </div>
    </CardShell>
  );
}
