import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface InfoTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
  tooltipClassName?: string;
}

function getTooltipPosition(trigger: HTMLElement, width = 256) {
  const rect = trigger.getBoundingClientRect();
  const margin = 8;
  let left = rect.left + rect.width / 2 - width / 2;

  if (left < margin) left = margin;
  if (left + width > window.innerWidth - margin) {
    left = window.innerWidth - width - margin;
  }

  const spaceAbove = rect.top;
  const showAbove = spaceAbove >= 72;
  const top = showAbove ? rect.top - margin : rect.bottom + margin;

  return { left, top, showAbove };
}

export default function InfoTooltip({
  content,
  children,
  ariaLabel,
  className = '',
  tooltipClassName = ''
}: InfoTooltipProps) {
  const [isTouchMode, setIsTouchMode] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isTouchOpen, setIsTouchOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, showAbove: true });
  const tooltipId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const mediaQuery = window.matchMedia('(hover: none), (pointer: coarse)');
    const updateMode = () => setIsTouchMode(mediaQuery.matches);

    updateMode();
    mediaQuery.addEventListener('change', updateMode);
    return () => mediaQuery.removeEventListener('change', updateMode);
  }, []);

  useEffect(() => {
    if (!isTouchOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTouchOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isTouchOpen]);

  const openTouchTooltip = () => {
    if (!triggerRef.current) return;
    setPosition(getTooltipPosition(triggerRef.current));
    setIsTouchOpen(true);
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isTouchMode) return;

    if (isTouchOpen) {
      setIsTouchOpen(false);
      return;
    }

    openTouchTooltip();
  };

  const desktopOpen = !isTouchMode && (isHovered || isFocused);

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-describedby={desktopOpen ? tooltipId : undefined}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="inline-flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-cardBackground)] rounded-sm"
      >
        {children}
      </button>

      {desktopOpen && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs text-white text-center whitespace-pre-line shadow-lg ${tooltipClassName}`}
        >
          {content}
        </span>
      )}

      {isTouchOpen && createPortal(
        <>
          <button
            type="button"
            aria-label="Cerrar ayuda"
            className="fixed inset-0 z-[9998] bg-transparent"
            onClick={() => setIsTouchOpen(false)}
          />
          <span
            role="dialog"
            aria-modal="false"
            className="fixed z-[9999] max-w-[256px] rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-modalBackground)] px-3 py-2 text-xs text-[var(--color-text)] shadow-xl whitespace-pre-line"
            style={{
              left: position.left,
              top: position.top,
              transform: position.showAbove ? 'translateY(-100%)' : undefined
            }}
            onClick={(event) => {
              event.stopPropagation();
              setIsTouchOpen(false);
            }}
          >
            {content}
          </span>
        </>,
        document.body
      )}
    </span>
  );
}
