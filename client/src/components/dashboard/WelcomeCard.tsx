// client/src/components/dashboard/WelcomeCard.tsx
import { Card, CardContent } from '../ui/Card';
import type { User } from '../../types/auth';

interface WelcomeCardProps {
  user: User;
}

export default function WelcomeCard({ user }: WelcomeCardProps) {
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
    <Card className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              {getGreeting()}, {user.name}!
            </h2>
            <p className="text-purple-100">
              Bienvenido al Club DN
            </p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-3xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
          <div>
            <p className="text-purple-200 text-sm">Miembro desde</p>
            <p className="font-medium text-sm">
              {formatDate(user.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-purple-200 text-sm">Último acceso</p>
            <p className="font-medium text-sm">
              {formatDate(user.lastLoginAt)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
