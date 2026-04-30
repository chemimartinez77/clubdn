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
    const n = players.length;
    const FAST_INTERVAL = 80;
    const SLOW_INTERVALS = [160, 300, 500, 800];

    const sequence: { idx: number; interval: number }[] = [];
    let cur = 0;

    // 12 vueltas rápidas
    for (let i = 0; i < n * 12; i++) {
      cur = (cur + 1) % n;
      sequence.push({ idx: cur, interval: FAST_INTERVAL });
    }

    // 3 vueltas lentas completas
    for (let vuelta = 0; vuelta < 3; vuelta++) {
      for (let i = 0; i < n; i++) {
        cur = (cur + 1) % n;
        sequence.push({ idx: cur, interval: SLOW_INTERVALS[vuelta]! });
      }
    }

    // 4ª vuelta parcial: avanzar hasta el ganador
    const stepsToChosen = ((chosenIdx - cur) % n + n) % n || n;
    for (let i = 0; i < stepsToChosen; i++) {
      cur = (cur + 1) % n;
      sequence.push({ idx: cur, interval: SLOW_INTERVALS[3]! });
    }

    let stepIndex = 0;

    function tick() {
      const step = sequence[stepIndex]!;
      setActiveIdx(step.idx);
      stepIndex++;

      if (stepIndex < sequence.length) {
        timeoutRef.current = setTimeout(tick, step.interval);
      } else {
        // Llegamos al ganador
        timeoutRef.current = setTimeout(() => {
          setDone(true);
          onAnimationEnd();
        }, 300);
      }
    }

    timeoutRef.current = setTimeout(tick, FAST_INTERVAL);

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
