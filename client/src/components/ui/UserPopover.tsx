// client/src/components/ui/UserPopover.tsx
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const displayedName = displayName(name, nick);
  const hasNick = nick?.trim() && nick.trim() !== name;

  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX });
    }
    setOpen(v => !v);
  };

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={triggerRef} className="relative inline-block">
      <button
        type="button"
        onClick={handleToggle}
        className="text-left hover:underline cursor-pointer"
      >
        {children}
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999 }}
          className="w-56 rounded-xl shadow-xl border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-3 flex flex-col gap-2"
        >
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
                {name.charAt(0).toUpperCase()}
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
        </div>,
        document.body
      )}
    </div>
  );
}
