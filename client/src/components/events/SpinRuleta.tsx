import { useEffect, useRef, useState } from 'react';

interface Player {
  id: string;
  name: string;
  nick?: string | null;
  avatarUrl?: string | null;
}

interface SpinRuletaProps {
  players: Player[];
  chosenId: string;
  onAnimationEnd: () => void;
}

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#0ea5e9', '#f97316', '#ec4899',
];

function buildWheelPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startAngle));
  const y1 = cy + r * Math.sin(toRad(startAngle));
  const x2 = cx + r * Math.cos(toRad(endAngle));
  const y2 = cy + r * Math.sin(toRad(endAngle));
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}

function labelPosition(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const mid = (startAngle + endAngle) / 2;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  return {
    x: cx + r * 0.65 * Math.cos(toRad(mid)),
    y: cy + r * 0.65 * Math.sin(toRad(mid)),
  };
}

function truncate(s: string, maxLen: number) {
  return s.length > maxLen ? s.slice(0, maxLen - 1) + '…' : s;
}

function wheelLabel(player: Player, maxChars: number): string {
  if (player.nick?.trim()) return truncate(player.nick.trim(), maxChars);
  const parts = player.name.trim().split(/\s+/);
  const label = parts.length > 1
    ? `${parts[0]} ${parts[1]!.charAt(0)}.`
    : parts[0]!;
  return truncate(label, maxChars);
}

export default function SpinRuleta({ players, chosenId, onAnimationEnd }: SpinRuletaProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [done, setDone] = useState(false);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  const n = players.length;
  const segAngle = 360 / n;
  const chosenIdx = players.findIndex(p => p.id === chosenId);

  // Los segmentos se dibujan con offset -90° (segmento 0 ya apunta arriba).
  // Centro del segmento i en reposo = -90 + (i+0.5)*segAngle.
  // Para que ese punto quede en la cima (-90°) necesitamos rotar: 90 - (chosenIdx+0.5)*segAngle
  const targetAngle = 90 - (chosenIdx + 0.5) * segAngle;
  // Normalizar a [0, 360) y añadir vueltas completas para que siempre gire hacia adelante
  const normalizedTarget = ((targetAngle % 360) + 360) % 360;
  const totalRotation = normalizedTarget + 1440 + 360 * Math.floor(Math.random() * 3);

  useEffect(() => {
    const DURATION = 4000;
    setSpinning(true);
    startTimeRef.current = performance.now();

    function easeOut(t: number) {
      return 1 - Math.pow(1 - t, 3);
    }

    function animate(now: number) {
      const elapsed = now - startTimeRef.current;
      const t = Math.min(elapsed / DURATION, 1);
      const eased = easeOut(t);
      setRotation(eased * totalRotation);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setSpinning(false);
        setDone(true);
        setTimeout(onAnimationEnd, 600);
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  const cx = 150;
  const cy = 150;
  const r = 135;

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative w-full" style={{ maxWidth: 300, aspectRatio: '1 / 1' }}>
        {/* Indicador (flecha arriba) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-10"
          style={{ top: -10 }}
        >
          <svg width="24" height="28" viewBox="0 0 24 28">
            <polygon points="12,28 0,0 24,0" fill="#f59e0b" />
          </svg>
        </div>

        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 300 300"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: '50% 50%',
            transition: spinning ? 'none' : undefined,
          }}
        >
          {players.map((player, i) => {
            const startAngle = i * segAngle - 90;
            const endAngle = startAngle + segAngle;
            const path = buildWheelPath(cx, cy, r, startAngle, endAngle);
            const label = labelPosition(cx, cy, r, startAngle, endAngle);
            const color = COLORS[i % COLORS.length];
            const maxChars = n <= 4 ? 12 : n <= 6 ? 9 : 7;
            return (
              <g key={player.id}>
                <path d={path} fill={color} stroke="white" strokeWidth={2} />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={n <= 4 ? 13 : n <= 6 ? 11 : 9}
                  fontWeight="bold"
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {wheelLabel(player, maxChars)}
                </text>
              </g>
            );
          })}
          {/* Centro */}
          <circle cx={cx} cy={cy} r={18} fill="white" stroke="#e5e7eb" strokeWidth={2} />
        </svg>
      </div>

      {done && (
        <p className="text-sm text-center text-zinc-400 animate-pulse">
          Calculando resultado...
        </p>
      )}
    </div>
  );
}
