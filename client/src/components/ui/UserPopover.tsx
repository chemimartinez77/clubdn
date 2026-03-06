// client/src/components/ui/UserPopover.tsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { displayName } from '../../utils/displayName';

interface UserPopoverProps {
  userId: string;
  name: string;
  nick?: string | null;
  avatar?: string | null;
  membershipType?: string | null;
  children: React.ReactNode;
}

const membershipLabels: Record<string, string> = {
  SOCIO: 'Socio',
  COLABORADOR: 'Colaborador',
  FAMILIAR: 'Familiar',
  EN_PRUEBAS: 'En pruebas',
};

export default function UserPopover({ userId, name, nick, avatar, membershipType, children }: UserPopoverProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const displayedName = displayName(name, nick);
  const hasNick = nick?.trim() && nick.trim() !== name;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="text-left hover:underline cursor-pointer"
      >
        {children}
      </button>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-2 w-56 rounded-xl shadow-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-3 flex flex-col gap-2">
          {/* Arrow */}
          <div className="absolute -top-1.5 left-4 w-3 h-3 rotate-45 border-l border-t border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)]" />

          {/* Header */}
          <div className="flex items-center gap-2">
            {avatar ? (
              <img src={avatar} alt={name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                style={{ background: 'linear-gradient(to bottom right, var(--color-primary), var(--color-primaryDark))' }}
              >
                {displayedName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-sm text-[var(--color-text)] truncate">{displayedName}</p>
              {hasNick && (
                <p className="text-xs text-[var(--color-textSecondary)] truncate">{name}</p>
              )}
              {membershipType && membershipLabels[membershipType] && (
                <span className="mt-0.5 inline-block text-xs text-[var(--color-textSecondary)] bg-[var(--color-tableRowHover)] px-1.5 py-0.5 rounded-full">
                  {membershipLabels[membershipType]}
                </span>
              )}
            </div>
          </div>

          {/* Ver perfil */}
          <button
            type="button"
            onClick={() => { setOpen(false); navigate(`/users/${userId}`); }}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline pt-1 border-t border-[var(--color-cardBorder)]"
          >
            <span>Ver perfil</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
