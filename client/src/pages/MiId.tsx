// client/src/pages/MiId.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { displayName, fullNameTooltip } from '../utils/displayName';

export default function MiId() {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const membershipLabel =
    user?.membership?.type === 'SOCIO'
      ? 'Socio'
      : user?.membership?.type === 'COLABORADOR'
      ? 'Colaborador'
      : user?.membership?.type === 'FAMILIAR'
      ? 'Familiar'
      : user?.membership?.type === 'EN_PRUEBAS'
      ? 'Colaborador en pruebas'
      : user?.membership?.type === 'BAJA'
      ? 'Baja'
      : 'Miembro';

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center p-6">
      <div className="w-full max-w-xs bg-[var(--color-cardBackground)] rounded-2xl border border-[var(--color-cardBorder)] shadow-lg p-8 flex flex-col items-center space-y-6 text-center">
        {user?.profile?.avatar ? (
          <img
            src={user.profile.avatar}
            alt={user.name}
            className="w-28 h-28 rounded-full object-cover border-2 border-[var(--color-cardBorder)]"
          />
        ) : (
          <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center border-2 border-[var(--color-cardBorder)]">
            <span className="text-4xl font-semibold text-primary">
              {displayName(user?.name || '', user?.profile?.nick).charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        <div className="space-y-1">
          <p
            className="text-xl font-semibold text-[var(--color-text)]"
            title={fullNameTooltip(user?.name || '', user?.profile?.nick)}
          >
            {displayName(user?.name || '', user?.profile?.nick)}
          </p>
          {user?.profile?.nick && (
            <p className="text-sm text-[var(--color-textSecondary)]">{user.name}</p>
          )}
          <p className="text-sm text-[var(--color-textSecondary)]">{membershipLabel}</p>
        </div>

        <div className="w-full border-t border-[var(--color-cardBorder)] pt-5">
          <p className="text-xs uppercase tracking-wide text-[var(--color-textSecondary)] mb-2">
            Hora en tiempo real
          </p>
          <p className="text-base font-semibold text-[var(--color-text)]">
            {now.toLocaleString('es-ES', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
        </div>
      </div>
    </div>
  );
}
