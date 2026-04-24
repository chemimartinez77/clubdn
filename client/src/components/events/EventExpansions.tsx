import type { KeyboardEvent, SyntheticEvent } from 'react';
import { GameImage } from './EventCard';

export interface EventExpansionSummary {
  id: string;
  gameId: string;
  name: string;
  image: string | null;
  thumbnail: string | null;
}

interface EventExpansionsProps {
  expansions?: EventExpansionSummary[] | null;
  onOpenGame?: (gameId: string) => void;
  maxVisible?: number;
  variant?: 'compact' | 'cards' | 'minimal';
  className?: string;
  stopPropagation?: boolean;
}

const handleActivation = (event: KeyboardEvent<HTMLDivElement>, onActivate: () => void) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onActivate();
  }
};

export default function EventExpansions({
  expansions,
  onOpenGame,
  maxVisible = 2,
  variant = 'compact',
  className = '',
  stopPropagation = false,
}: EventExpansionsProps) {
  if (!expansions?.length) return null;

  const visibleExpansions = expansions.slice(0, maxVisible);
  const remaining = expansions.length - visibleExpansions.length;

  const stopEventPropagation = (event: SyntheticEvent) => {
    if (stopPropagation) event.stopPropagation();
  };

  const openExpansion = (gameId: string) => {
    if (!onOpenGame) return;
    onOpenGame(gameId);
  };

  if (variant === 'minimal') {
    return (
      <div className={`mt-2 flex items-center gap-2 ${className}`} onClick={stopEventPropagation}>
        {visibleExpansions.slice(0, 1).map((expansion) => (
          <div
            key={expansion.id}
            role={onOpenGame ? 'button' : undefined}
            tabIndex={onOpenGame ? 0 : -1}
            onClick={(event) => {
              stopEventPropagation(event);
              if (onOpenGame) openExpansion(expansion.gameId);
            }}
            onKeyDown={(event) => handleActivation(event, () => openExpansion(expansion.gameId))}
            className={onOpenGame ? 'cursor-pointer rounded-md hover:opacity-85 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]' : ''}
            aria-label={`Ver detalles de la expansión ${expansion.name}`}
          >
            <GameImage src={expansion.image || expansion.thumbnail} alt={expansion.name} size="sm" className="w-8 h-8" />
          </div>
        ))}
        {remaining > 0 && (
          <span className="rounded-full border border-[var(--color-cardBorder)] px-2 py-1 text-[10px] font-medium text-[var(--color-textSecondary)]">
            +exp.
          </span>
        )}
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className={`flex flex-wrap gap-3 ${className}`} onClick={stopEventPropagation}>
        {expansions.map((expansion) => (
          <div
            key={expansion.id}
            role={onOpenGame ? 'button' : undefined}
            tabIndex={onOpenGame ? 0 : -1}
            onClick={(event) => {
              stopEventPropagation(event);
              if (onOpenGame) openExpansion(expansion.gameId);
            }}
            onKeyDown={(event) => handleActivation(event, () => openExpansion(expansion.gameId))}
            className={`flex min-w-0 items-center gap-3 rounded-lg border border-[var(--color-cardBorder)] bg-[var(--color-cardBackground)] p-3 text-left transition-colors ${
              onOpenGame ? 'cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-tableRowHover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]' : ''
            }`}
            aria-label={`Ver detalles de la expansión ${expansion.name}`}
          >
            <GameImage src={expansion.image || expansion.thumbnail} alt={expansion.name} size="sm" />
            <div className="min-w-0">
              <p className="truncate font-medium text-[var(--color-text)]">{expansion.name}</p>
              <p className="text-xs text-amber-600">Expansión</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`mt-3 flex flex-wrap items-center gap-2 ${className}`} onClick={stopEventPropagation}>
      {visibleExpansions.map((expansion) => (
        <div
          key={expansion.id}
          role={onOpenGame ? 'button' : undefined}
          tabIndex={onOpenGame ? 0 : -1}
          onClick={(event) => {
            stopEventPropagation(event);
            if (onOpenGame) openExpansion(expansion.gameId);
          }}
          onKeyDown={(event) => handleActivation(event, () => openExpansion(expansion.gameId))}
          className={`flex min-w-0 items-center gap-2 rounded-full border border-[var(--color-cardBorder)] px-2 py-1 transition-colors ${
            onOpenGame ? 'cursor-pointer hover:border-[var(--color-primary)] hover:bg-[var(--color-tableRowHover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]' : ''
          }`}
          aria-label={`Ver detalles de la expansión ${expansion.name}`}
        >
          <GameImage src={expansion.image || expansion.thumbnail} alt={expansion.name} size="sm" className="w-7 h-7" />
          <span className="max-w-36 truncate text-xs font-medium text-[var(--color-text)]">{expansion.name}</span>
        </div>
      ))}
      {remaining > 0 && (
        <span className="rounded-full border border-[var(--color-cardBorder)] px-2 py-1 text-xs font-medium text-[var(--color-textSecondary)]">
          +{remaining}
        </span>
      )}
    </div>
  );
}
