// client/src/pages/UserProfile.tsx
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '../components/layout/Layout';
import { Card, CardContent } from '../components/ui/Card';
import { api } from '../api/axios';
import { displayName } from '../utils/displayName';
import type { ApiResponse } from '../types/auth';
import type { UserProfile } from '../types/profile';

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfile', userId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ profile: UserProfile }>>(`/api/profile/${userId}`);
      return response.data.data?.profile;
    },
    enabled: !!userId,
  });

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
          <p className="text-red-600">Perfil no encontrado</p>
        </div>
      </Layout>
    );
  }

  const name = profile.user?.name ?? '';
  const shown = displayName(name, profile.nick);
  const hasNick = profile.nick?.trim() && profile.nick.trim() !== name;

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(d));
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-[var(--color-textSecondary)] hover:text-[var(--color-text)]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver
        </button>

        <Card>
          <CardContent>
            <div className="flex items-center gap-4 mb-6">
              {profile.avatar ? (
                <img src={profile.avatar} alt={shown} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white"
                  style={{ background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primaryDark))' }}
                >
                  {shown.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-text)]">{shown}</h1>
                {hasNick && <p className="text-sm text-[var(--color-textSecondary)]">{name}</p>}
              </div>
            </div>

            <div className="space-y-4">
              {profile.bio && (
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Biografía</p>
                  <p className="text-[var(--color-text)]">{profile.bio}</p>
                </div>
              )}

              {profile.favoriteGames && profile.favoriteGames.length > 0 && (
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)] mb-1">Juegos favoritos</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.favoriteGames.map((g, i) => (
                      <span key={i} className="px-3 py-1 bg-[var(--color-primary-100)] text-[var(--color-primary-800)] rounded-full text-sm">
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.playStyle && (
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Estilo de juego</p>
                  <p className="font-medium text-[var(--color-text)]">{profile.playStyle}</p>
                </div>
              )}

              {formatDate(profile.birthDate) && (
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)]">Fecha de nacimiento</p>
                  <p className="font-medium text-[var(--color-text)]">{formatDate(profile.birthDate)}</p>
                </div>
              )}

              {(profile.discord || profile.telegram) && (
                <div>
                  <p className="text-sm text-[var(--color-textSecondary)] mb-1">Redes sociales</p>
                  <div className="flex flex-col gap-1">
                    {profile.discord && <p className="text-sm text-[var(--color-text)]">Discord: <span className="font-medium">{profile.discord}</span></p>}
                    {profile.telegram && <p className="text-sm text-[var(--color-text)]">Telegram: <span className="font-medium">{profile.telegram}</span></p>}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
