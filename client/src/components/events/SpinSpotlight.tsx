import { useEffect, useRef, useState } from 'react';

interface Player {
  id: string;
  name: string;
  nick?: string | null;
  avatarUrl?: string | null;
}

interface SpinSpotlightProps {
  players: Player[];
  chosenId: string;
  onAnimationEnd: () => void;
}

export default function SpinSpotlight({ players, chosenId, onAnimationEnd }: SpinSpotlightProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [done, setDone] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const chosenIdx = players.findIndex(p => p.id === chosenId);

  useEffect(() => {
    // Fase 1: barrido rápido aleatorio durante ~2.5s, luego frenado
    const FAST_INTERVAL = 80;
    const SLOW_INTERVAL = 200;
    const TOTAL_FAST_MS = 2500;
    const SLOW_STEPS = 8;

    let elapsed = 0;
    let currentIdx = 0;

    function fastStep() {
      currentIdx = (currentIdx + 1) % players.length;
      setActiveIdx(currentIdx);
      elapsed += FAST_INTERVAL;

      if (elapsed < TOTAL_FAST_MS) {
        timeoutRef.current = setTimeout(fastStep, FAST_INTERVAL);
      } else {
        // Fase 2: frenado hacia el elegido
        slowStep(0, currentIdx);
      }
    }

    function slowStep(step: number, idx: number) {
      const nextIdx = (idx + 1) % players.length;
      const interval = SLOW_INTERVAL + step * 60;
      setActiveIdx(nextIdx);

      const distToChosen = ((chosenIdx - nextIdx) % players.length + players.length) % players.length;

      if (step < SLOW_STEPS - 1 && distToChosen > 0) {
        timeoutRef.current = setTimeout(() => slowStep(step + 1, nextIdx), interval);
      } else {
        // Ir directo al elegido
        timeoutRef.current = setTimeout(() => {
          setActiveIdx(chosenIdx);
          setDone(true);
          setTimeout(onAnimationEnd, 800);
        }, interval + 100);
      }
    }

    timeoutRef.current = setTimeout(fastStep, FAST_INTERVAL);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 w-full px-2">
      <div className="flex flex-wrap justify-center gap-2 w-full max-w-sm">
        {players.map((player, i) => {
          const isActive = i === activeIdx;
          const isChosen = done && player.id === chosenId;
          return (
            <div
              key={player.id}
              className="relative px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-75 select-none"
              style={{
                background: isChosen
                  ? 'linear-gradient(135deg, #f59e0b, #f97316)'
                  : isActive
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : '#27272a',
                color: isActive || isChosen ? 'white' : '#71717a',
                boxShadow: isChosen
                  ? '0 0 20px 4px rgba(245,158,11,0.6)'
                  : isActive
                  ? '0 0 14px 2px rgba(99,102,241,0.5)'
                  : 'none',
                transform: isActive || isChosen ? 'scale(1.08)' : 'scale(1)',
              }}
            >
              {player.nick?.trim() || (() => {
                const parts = player.name.trim().split(/\s+/);
                return parts.length > 1 ? `${parts[0]} ${parts[1]!.charAt(0)}.` : parts[0]!;
              })()}
              {isChosen && (
                <span className="absolute -top-2 -right-2 text-lg">🏆</span>
              )}
            </div>
          );
        })}
      </div>

      {!done && (
        <p className="text-xs text-zinc-500 animate-pulse mt-2">El destino decide...</p>
      )}
    </div>
  );
}
