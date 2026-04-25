import { useEffect, useRef, useState } from 'react';

interface Player {
  id: string;
  name: string;
  nick?: string | null;
  avatarUrl?: string | null;
}

interface SpinRuletaProps {
  players: Player[];
  onResult: (winner: Player) => void;
}

const CONSTANT_SPINS = 5;
const CONSTANT_DURATION = 2500; // ms
const BRAKING_SPINS_MIN = 3;
const BRAKING_SPINS_EXTRA = 2; // random 0..BRAKING_SPINS_EXTRA
const BRAKING_DURATION = 4500; // ms
const BLINK_DURATION = 2500;   // ms

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
  const label = parts.length > 1 ? `${parts[0]} ${parts[1]!.charAt(0)}.` : parts[0]!;
  return truncate(label, maxChars);
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

// Dado un ángulo de rotación CSS final, devuelve el índice del sector bajo la flecha.
// La flecha está fija en pantalla a 270° (arriba). Tras rotar R°, el punto de la rueda
// que queda bajo la flecha es el que estaba en (270 - R) mod 360.
// Los sectores se dibujan con startAngle = i*segAngle - 90, así que
// sector i ocupa [(i*segAngle - 90), (i+1)*segAngle - 90) en la rueda.
function getWinnerIdx(finalRotation: number, segAngle: number, n: number): number {
  const R = ((finalRotation % 360) + 360) % 360;
  const flechaEnRueda = ((270 - R) % 360 + 360) % 360;
  // Convertir a ángulo relativo al inicio del primer sector (que empieza en -90° = 270°)
  const relAngle = ((flechaEnRueda - 270) % 360 + 360) % 360;
  return Math.floor(relAngle / segAngle) % n;
}

export default function SpinRuleta({ players, onResult }: SpinRuletaProps) {
  const [rotation, setRotation] = useState(0);
  const [winnerIdx, setWinnerIdx] = useState<number | null>(null);
  const [blinking, setBlinking] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const animFrameRef = useRef<number>(0);

  const n = players.length;
  const segAngle = 360 / n;

  // Ángulo de parada totalmente aleatorio — calculado una sola vez al montar.
  const [degrees] = useState<{ total: number; braking: number }>(() => {
    const constantDeg = CONSTANT_SPINS * 360;
    const randomStop = Math.random() * 360; // ángulo aleatorio dentro de una vuelta
    const brakingSpins = BRAKING_SPINS_MIN + Math.floor(Math.random() * (BRAKING_SPINS_EXTRA + 1));
    const brakingDeg = brakingSpins * 360 + randomStop;
    return { total: constantDeg + brakingDeg, braking: brakingDeg };
  });

  useEffect(() => {
    const totalDeg = degrees.total;
    const brakingDeg = degrees.braking;
    const constantDeg = totalDeg - brakingDeg;
    const degreesPerMs = (CONSTANT_SPINS * 360) / CONSTANT_DURATION;

    let startTime: number | null = null;
    let phase: 'constant' | 'braking' = 'constant';
    let brakingStartTime: number | null = null;
    let brakingStartRotation = 0;

    function animate(now: number) {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;

      if (phase === 'constant') {
        setRotation(Math.min(elapsed * degreesPerMs, constantDeg));
        if (elapsed >= CONSTANT_DURATION) {
          phase = 'braking';
          brakingStartTime = now;
          brakingStartRotation = constantDeg;
        }
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        const brakingElapsed = now - brakingStartTime!;
        const t = Math.min(brakingElapsed / BRAKING_DURATION, 1);
        const currentRotation = brakingStartRotation + easeOutCubic(t) * brakingDeg;
        setRotation(currentRotation);

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          const finalRot = brakingStartRotation + brakingDeg;
          const idx = getWinnerIdx(finalRot, segAngle, n);
          setWinnerIdx(idx);
          setBlinking(true);
          setTimeout(() => {
            setBlinking(false);
            setShowClose(true);
          }, BLINK_DURATION);
        }
      }
    }

    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [degrees.total, degrees.braking, n, segAngle]);

  const cx = 150;
  const cy = 150;
  const r = 135;
  const maxChars = n <= 4 ? 12 : n <= 6 ? 9 : 7;
  const fontSize = n <= 4 ? 13 : n <= 6 ? 11 : 9;

  function handleClose() {
    if (winnerIdx !== null) {
      onResult(players[winnerIdx]!);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <div className="relative w-full" style={{ maxWidth: 300, aspectRatio: '1 / 1' }}>
        <div className="absolute left-1/2 -translate-x-1/2 z-10" style={{ top: -10 }}>
          <svg width="24" height="28" viewBox="0 0 24 28">
            <polygon points="12,28 0,0 24,0" fill="#f59e0b" />
          </svg>
        </div>

        <svg
          width="100%"
          height="100%"
          viewBox="0 0 300 300"
          style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '50% 50%' }}
        >
          {players.map((player, i) => {
            const startAngle = i * segAngle - 90;
            const endAngle = startAngle + segAngle;
            const path = buildWheelPath(cx, cy, r, startAngle, endAngle);
            const label = labelPosition(cx, cy, r, startAngle, endAngle);
            const color = COLORS[i % COLORS.length]!;
            const isWinner = i === winnerIdx;
            return (
              <g key={player.id}>
                <path
                  d={path}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                  style={isWinner && blinking
                    ? { animation: 'segBlink 0.4s ease-in-out infinite alternate' }
                    : undefined}
                />
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={fontSize}
                  fontWeight="bold"
                  transform={`rotate(180, ${label.x}, ${label.y})`}
                  style={{ userSelect: 'none', pointerEvents: 'none' }}
                >
                  {wheelLabel(player, maxChars)}
                </text>
              </g>
            );
          })}
          <circle cx={cx} cy={cy} r={18} fill="white" stroke="#e5e7eb" strokeWidth={2} />
          <style>{`@keyframes segBlink { from { opacity:1; } to { opacity:0.25; } }`}</style>
        </svg>
      </div>

      {showClose && (
        <button
          onClick={handleClose}
          className="w-full py-3 rounded-xl font-bold text-white text-base transition-all"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          Cerrar
        </button>
      )}
    </div>
  );
}
