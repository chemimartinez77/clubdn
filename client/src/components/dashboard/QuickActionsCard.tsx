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
      <div className="p-4 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-tableRowHover)] opacity-60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--color-cardBorder)] text-[var(--color-textSecondary)]">
            {icon}
          </div>
          <div className="flex-1">
            <p className="font-medium text-[var(--color-textSecondary)]">{title}</p>
            <p className="text-sm text-[var(--color-textSecondary)]">{description}</p>
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
        <h3 className="text-lg font-semibold text-[var(--color-text)]">Acciones rápidas</h3>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Acción crítica para admins - No está duplicada como acción principal en el menú */}
        {isAdmin && (
          <QuickAction
            to="/admin/pending-approvals"
            title="Aprobar Usuarios"
            description="Aprobar solicitudes pendientes"
            icon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
        )}

        {/* Acción principal - Crear partidas es la funcionalidad más usada */}
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

        {/* Consulta frecuente - Acceso rápido al calendario */}
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

        {/* Acceso a ludoteca - Enlace directo al catálogo */}
        <QuickAction
          to="/ludoteca"
          title="Ludoteca del Club"
          description="Explora nuestra colección"
          enabled={true}
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />

        {/* Acceso al perfil - Ver y editar información personal */}
        <QuickAction
          to="/profile"
          title="Mi Perfil"
          description="Ver y editar mi información"
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

