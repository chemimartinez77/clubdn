// client/src/components/dashboard/WelcomeCard.tsx
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '../ui/Card';
import { useTheme } from '../../hooks/useTheme';
import { api } from '../../api/axios';
import type { User } from '../../types/auth';
import type { UserProfile } from '../../types/profile';
import type { ApiResponse } from '../../types/auth';

interface WelcomeCardProps {
  user: User;
}

export default function WelcomeCard({ user }: WelcomeCardProps) {
  const { themeName } = useTheme();

  // Obtener perfil del usuario para conocer su preferencia de color de Noughter
  const { data: profile } = useQuery({
    queryKey: ['myProfile'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<{ profile: UserProfile }>>('/api/profile/me');
      return response.data.data?.profile;
    },
    staleTime: 5 * 60 * 1000 // 5 minutos
  });

  // Determinar el color de Noughter: usar preferencia del usuario o el tema actual
  const noughterColor = profile?.noughterColor || themeName;
  const noughterImageSrc = `/noughter.${noughterColor}.png`;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Card
      id="dashboard-welcome"
      className="text-white"
      style={{ background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primaryDark))' }}
    >
      <CardContent className="p-6 relative overflow-visible">
        <div className="flex items-stretch justify-between gap-[20px]">
          <div className="flex-1">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                {getGreeting()}, {user.name}!
              </h2>
              <p className="text-white/80">
                Bienvenido al Club Dreadnought
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
              <div>
                <p className="text-white/70 text-sm">Miembro desde</p>
                <p className="font-medium text-sm">
                  {formatDate(user.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-white/70 text-sm">Último acceso</p>
                <p className="font-medium text-sm">
                  {formatDate(user.lastLoginAt)}
                </p>
              </div>
            </div>
          </div>

          <div className="relative w-[140px]">
            <img
              src={noughterImageSrc}
              alt="Noughter"
              className="absolute right-0 top-1/2 -translate-y-1/2 w-40 h-40 object-contain"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
