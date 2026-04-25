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
  onRespin: () => void;
}

const BORDER_THRESHOLD = 3; // grados de margen a cada lado de un borde
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

/**
 * Calcula cuántos grados debe rotar la rueda (sentido horario, CSS rotate)
 * para que el centro del sector winnerIdx quede bajo la flecha (arriba = -90° SVG).
 *
 * Geometría:
 *   - CSS rotate(R) suma R° a todos los ángulos SVG en pantalla.
 *   - El centro del sector i está en centerSVG = (i + 0.5) * segAngle - 90°.
 *   - Tras rotar R, su posición en pantalla es centerSVG + R.
 *   - La flecha apunta arriba = -90° SVG = 270° normalizado.
 *   - Queremos: (centerSVG + R) ≡ 270° (mod 360)
 *     => R = (270 - centerSVG) mod 360
 *          = (270 - centerNorm + 360) % 360   [con centerNorm en [0,360)]
 */
function calcStopAngle(winnerIdx: number, segAngle: number): number {
  const centerSVG = (winnerIdx + 0.5) * segAngle - 90;
  const centerNorm = ((centerSVG % 360) + 360) % 360;
  const stopAngle = (270 - centerNorm + 360) % 360;
  // Si stopAngle == 0, el sector ya apunta arriba: añadir una vuelta completa
  return stopAngle === 0 ? 360 : stopAngle;
}

function isOnBorder(finalRotation: number, segAngle: number, n: number): boolean {
  // Posición de la flecha en el espacio de la rueda después de rotar
  const pos = ((finalRotation % 360) + 360) % 360;
  for (let i = 0; i < n; i++) {
    // Borde entre sector i-1 e i: está en i*segAngle - 90, normalizado
    const border = ((i * segAngle - 90) % 360 + 360) % 360;
    // La flecha en el espacio de la rueda está en (360 - pos) % 360
    const flecha = (360 - pos) % 360;
    const diff = Math.abs(flecha - border);
    const dist = Math.min(diff, 360 - diff);
    if (dist < BORDER_THRESHOLD) return true;
  }
  return false;
}

export default function SpinRuleta({ players, chosenId, onAnimationEnd, onRespin }: SpinRuletaProps) {
  const [rotation, setRotation] = useState(0);
  const [blinking, setBlinking] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showBorderWarning, setShowBorderWarning] = useState(false);
  const animFrameRef = useRef<number>(0);

  const n = players.length;
  const segAngle = 360 / n;

  // Fuente de verdad única: winnerIdx derivado de players + chosenId
  const winnerIdx = players.findIndex(p => p.id === chosenId);

  // useState con inicializador lazy: Math.random() se llama solo en el primer montaje.
  const [degrees] = useState<{ total: number; braking: number }>(() => {
    const stopAngle = calcStopAngle(winnerIdx, segAngle);
    const constantDeg = CONSTANT_SPINS * 360;
    let extraBraking = stopAngle - (constantDeg % 360);
    if (extraBraking <= 0) extraBraking += 360;
    const brakingSpins = BRAKING_SPINS_MIN + Math.floor(Math.random() * (BRAKING_SPINS_EXTRA + 1));
    const brakingDeg = brakingSpins * 360 + extraBraking;
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
        setRotation(brakingStartRotation + easeOutCubic(t) * brakingDeg);

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          const finalRot = brakingStartRotation + brakingDeg;
          if (isOnBorder(finalRot, segAngle, n)) {
            setShowBorderWarning(true);
          } else {
            setBlinking(true);
            setTimeout(() => {
              setBlinking(false);
              setShowClose(true);
            }, BLINK_DURATION);
          }
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
            // Color e isWinner derivados del mismo índice i y winnerIdx
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
          onClick={onAnimationEnd}
          className="w-full py-3 rounded-xl font-bold text-white text-base transition-all"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          Cerrar
        </button>
      )}

      {showBorderWarning && (
        <div className="w-full flex flex-col items-center gap-3 p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
          <p className="text-sm font-semibold text-amber-400 text-center">
            La flecha ha caído justo en el borde entre dos sectores.
          </p>
          <p className="text-xs text-amber-300/70 text-center">
            El resultado no es válido. Vuelve a girar la ruleta.
          </p>
          <button
            onClick={onRespin}
            className="w-full py-2 rounded-xl font-bold text-white text-sm transition-all"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            Relanzar ruleta
          </button>
        </div>
      )}
    </div>
  );
}
