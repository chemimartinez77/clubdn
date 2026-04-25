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

// Grados de margen a cada lado de un borde para considerarlo "divisor"
const BORDER_THRESHOLD = 3;

const COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#0ea5e9', '#f97316', '#ec4899',
];

const CONSTANT_DURATION = 2500; // ms girando a velocidad constante
const BRAKING_DURATION = 4500;  // ms frenando
const BLINK_DURATION = 2500;    // ms parpadeando antes de mostrar botón

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

// Easing: desaceleración cúbica (empieza rápido, acaba lento)
function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function isOnBorder(finalRotation: number, segAngle: number): boolean {
  const pos = ((finalRotation % 360) + 360) % 360;
  // Los bordes están en i*segAngle - 90 (mod 360) para cada i
  const n = Math.round(360 / segAngle);
  for (let i = 0; i < n; i++) {
    const border = ((i * segAngle - 90) % 360 + 360) % 360;
    const diff = Math.abs(pos - border);
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
  const chosenIdx = players.findIndex(p => p.id === chosenId);

  // Velocidad constante: N vueltas durante CONSTANT_DURATION
  // El número de vueltas constantes determina la velocidad angular.
  const CONSTANT_SPINS = 5;
  const degreesPerMs = (CONSTANT_SPINS * 360) / CONSTANT_DURATION;

  // Ángulo final donde debe quedar el centro del segmento ganador (bajo la flecha = 0° de rotación acumulada mod 360)
  const centerAngle = (chosenIdx + 0.5) * segAngle - 90;
  const normalizedCenter = ((centerAngle % 360) + 360) % 360;

  // Total de grados que recorre en la fase constante
  const constantDegrees = CONSTANT_SPINS * 360;

  // En la fase de frenado necesitamos llegar a un múltiplo de 360 + normalizedCenter
  // tomando como punto de partida constantDegrees.
  // Calculamos cuántos grados más hacen falta para llegar a la parada correcta.
  const startOfBraking = constantDegrees % 360; // posición angular al inicio del frenado
  let extraBraking = normalizedCenter - startOfBraking;
  if (extraBraking <= 0) extraBraking += 360; // al menos una vuelta parcial hacia adelante
  // Añadimos vueltas completas para que el frenado dure lo suficiente (mínimo 3 vueltas durante el frenado)
  const brakingSpins = 3 + Math.floor(Math.random() * 2);
  const brakingDegrees = brakingSpins * 360 + extraBraking;

  const totalDegrees = constantDegrees + brakingDegrees;

  // Guardamos en ref para que Math.random() no cambie entre renders
  const totalDegreesRef = useRef<number | null>(null);
  const brakingDegreesRef = useRef<number | null>(null);
  if (totalDegreesRef.current === null) {
    totalDegreesRef.current = totalDegrees;
    brakingDegreesRef.current = brakingDegrees;
  }

  useEffect(() => {
    const totalDeg = totalDegreesRef.current!;
    const brakingDeg = brakingDegreesRef.current!;
    const constantDeg = totalDeg - brakingDeg;

    let startTime: number | null = null;
    let phase: 'constant' | 'braking' = 'constant';
    let brakingStartTime: number | null = null;
    let brakingStartRotation = 0;

    function animate(now: number) {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;

      if (phase === 'constant') {
        const deg = Math.min(elapsed * degreesPerMs, constantDeg);
        setRotation(deg);

        if (elapsed >= CONSTANT_DURATION) {
          phase = 'braking';
          brakingStartTime = now;
          brakingStartRotation = constantDeg;
        }
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Fase de frenado
        const brakingElapsed = now - brakingStartTime!;
        const t = Math.min(brakingElapsed / BRAKING_DURATION, 1);
        const eased = easeOutCubic(t);
        setRotation(brakingStartRotation + eased * brakingDeg);

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          const finalRot = brakingStartRotation + brakingDeg;
          if (isOnBorder(finalRot, segAngle)) {
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
          width="100%"
          height="100%"
          viewBox="0 0 300 300"
          style={{
            transform: `rotate(${rotation}deg)`,
            transformOrigin: '50% 50%',
          }}
        >
          {players.map((player, i) => {
            const startAngle = i * segAngle - 90;
            const endAngle = startAngle + segAngle;
            const path = buildWheelPath(cx, cy, r, startAngle, endAngle);
            const label = labelPosition(cx, cy, r, startAngle, endAngle);
            const color = COLORS[i % COLORS.length];
            const maxChars = n <= 4 ? 12 : n <= 6 ? 9 : 7;
            const isChosen = i === chosenIdx;
            return (
              <g key={player.id}>
                <path
                  d={path}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                  style={
                    isChosen && blinking
                      ? { animation: 'segBlink 0.4s ease-in-out infinite alternate' }
                      : undefined
                  }
                />
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

          <style>{`
            @keyframes segBlink {
              from { opacity: 1; }
              to   { opacity: 0.25; }
            }
          `}</style>
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
