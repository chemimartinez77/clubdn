// client/src/components/dashboard/QuickActionsCard.tsx
import { Link } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../ui/Card';

interface QuickActionProps {
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  enabled?: boolean;
}

function QuickAction({ to, title, description, icon, enabled = true }: QuickActionProps) {
  if (!enabled) {
    return (
      <div className="p-4 rounded-lg border border-gray-200 bg-gray-50 opacity-60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-200 text-gray-400">
            {icon}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-500">{title}</p>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={to}
      className="block p-4 rounded-lg border border-[var(--color-primary-200)] bg-[var(--color-primary-50)] hover:bg-[var(--color-primary-100)] transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--color-primary-100)] text-[var(--color-primary)]">
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-medium text-[var(--color-primary-900)]">{title}</p>
          <p className="text-sm text-[var(--color-primaryDark)]">{description}</p>
        </div>
        <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}

interface QuickActionsCardProps {
  isAdmin: boolean;
}

export default function QuickActionsCard({ isAdmin }: QuickActionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">Acciones rápidas</h3>
      </CardHeader>
      <CardContent className="space-y-3">
        {isAdmin && (
          <QuickAction
            to="/admin/pending-approvals"
            title="Gestión de Usuarios"
            description="Aprobar solicitudes pendientes"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
        )}

        {isAdmin && (
          <QuickAction
            to="/admin/dashboard"
            title="Panel de Administración"
            description="Ver estadísticas y métricas"
            enabled={true}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />
        )}

        {isAdmin && (
          <QuickAction
            to="/admin/membership"
            title="Gestión de Membresías"
            description="Control de pagos y cuotas"
            enabled={true}
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
          />
        )}

        <QuickAction
          to="/events/crear-partida"
          title="Organizar Partida"
          description="Crea una partida para jugar"
          enabled={true}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        />

        <QuickAction
          to="/events"
          title="Ver Eventos"
          description="Próximos encuentros del club"
          enabled={true}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />

        <QuickAction
          to="/games"
          title="Catálogo de Juegos"
          description="Explora nuestra colección"
          enabled={false}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />

        <QuickAction
          to="/profile"
          title="Mi Perfil"
          description="Editar información personal"
          enabled={true}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
      </CardContent>
    </Card>
  );
}
