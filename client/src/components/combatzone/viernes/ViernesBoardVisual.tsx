// client/src/components/combatzone/viernes/ViernesBoardVisual.tsx
// Representación visual de los tres tableros del juego Viernes con cartas superpuestas

import type { ViernesGameState, RobinsonCard } from '../../../logic/ViernesEngine';
import {
  getAgingCardImage,
  getRobinsonCardImage,
  getSkillCardImage,
} from '../../../logic/ViernesImages';

// ── Helpers ────────────────────────────────────────────────────────────────────

function robinsonCardImage(card: RobinsonCard): string {
  if (card.type === 'AGING') return getAgingCardImage(card.name);
  if (card.type === 'HAZARD_WON') return getSkillCardImage(card.name);
  return getRobinsonCardImage(card.name);
}

function CardBack({ rotate = 0 }: { rotate?: number }) {
  return (
    <img
      src="/viernes/traseranormal.jpg"
      alt="Carta boca abajo"
      className="w-full h-full object-cover rounded-[6%] drop-shadow-md"
      style={{ transform: rotate ? `rotate(${rotate}deg)` : undefined }}
    />
  );
}

function CardFront({ src, alt }: { src: string; alt: string }) {
  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover rounded-[6%] drop-shadow-md"
    />
  );
}

function PileCount({ count, color = 'bg-black/70' }: { count: number; color?: string }) {
  return (
    <div
      className={`absolute -bottom-1 -right-1 ${color} text-white text-[9px] font-black rounded-full w-[18px] h-[18px] flex items-center justify-center z-10 leading-none border border-white/30`}
    >
      {count}
    </div>
  );
}

// ── Tablero Amarillo: Peligros + Robinson ──────────────────────────────────────
//
// En la imagen (400×400px, borde decorativo ~17% por lado):
//   Área activa interior: top 17%–83%, left 17%–83%
//
//   Mazo peligros (apilado inclinado, arriba-derecha del interior):
//     top ≈ 11%, left ≈ 42%, width ≈ 38%
//
//   Descarte Robinson (boca arriba, abajo-izquierda):
//     top ≈ 51%, left ≈ 18%, width ≈ 34%
//
//   Mazo Robinson (boca abajo, abajo-derecha):
//     top ≈ 51%, left ≈ 56%, width ≈ 28%

function TableroAmarillo({ gs }: { gs: ViernesGameState }) {
  // Total de cartas de peligro aún en juego (mazo + las dos reveladas)
  const revealedCount = gs.revealedHazards
    ? (gs.revealedHazards[0].id === gs.revealedHazards[1].id ? 1 : 2)
    : 0;
  const hazardTotal = gs.hazardDeck.length + revealedCount;

  const robinsonDeckCount  = gs.robinsonDeck.length;
  const robinsonDiscardCount = gs.robinsonDiscard.length;
  const topDiscard = robinsonDiscardCount > 0
    ? gs.robinsonDiscard[robinsonDiscardCount - 1]
    : null;

  return (
    <div className="relative w-full" style={{ paddingBottom: '100%' }}>
      <img
        src="/viernes/tableroamarillo.jpg"
        alt="Tablero robinson/peligros"
        className="absolute inset-0 w-full h-full object-cover rounded-xl select-none"
        draggable={false}
      />

      {/* Mazo de peligros — apilado inclinado */}
      {hazardTotal > 0 && (
        <div className="absolute" style={{ top: '11%', left: '42%', width: '38%', aspectRatio: '184/252' }}>
          {hazardTotal > 2 && (
            <div className="absolute inset-0" style={{ transform: 'rotate(-7deg) translate(-7%, -5%)' }}>
              <CardBack />
            </div>
          )}
          {hazardTotal > 1 && (
            <div className="absolute inset-0" style={{ transform: 'rotate(-3.5deg) translate(-3%, -2%)' }}>
              <CardBack />
            </div>
          )}
          <div className="absolute inset-0">
            <CardBack />
          </div>
          <PileCount count={hazardTotal} />
        </div>
      )}

      {/* Descarte Robinson — boca arriba (abajo-izquierda) */}
      <div className="absolute" style={{ top: '51%', left: '18%', width: '34%', aspectRatio: '184/252' }}>
        {topDiscard ? (
          <>
            <CardFront src={robinsonCardImage(topDiscard)} alt={topDiscard.name} />
            {robinsonDiscardCount > 1 && <PileCount count={robinsonDiscardCount} />}
          </>
        ) : (
          <div className="w-full h-full rounded-[6%] border-2 border-dashed border-white/25" />
        )}
      </div>

      {/* Mazo Robinson — boca abajo (abajo-derecha) */}
      <div className="absolute" style={{ top: '51%', left: '56%', width: '28%', aspectRatio: '184/252' }}>
        {robinsonDeckCount > 0 ? (
          <>
            <CardBack />
            <PileCount count={robinsonDeckCount} />
          </>
        ) : (
          <div className="w-full h-full rounded-[6%] border-2 border-dashed border-white/25" />
        )}
      </div>
    </div>
  );
}

// ── Tablero Azul: Envejecimiento ───────────────────────────────────────────────
//
// En la imagen (400×400px):
//   Mazo aging (boca abajo, horizontal en la parte superior):
//     top ≈ 16%, left ≈ 26%, width ≈ 48%
//
//   Descarte aging izquierda (boca arriba):
//     top ≈ 55%, left ≈ 12%, width ≈ 33%
//
//   Descarte aging derecha (boca arriba, vacío en nuestro modelo):
//     top ≈ 55%, left ≈ 54%, width ≈ 33%

function TableroAzul({ gs }: { gs: ViernesGameState }) {
  const agingDeckCount    = gs.agingDeck.length;
  const agingDiscardCount = gs.agingDiscard.length;
  const topAgingDiscard   = agingDiscardCount > 0
    ? gs.agingDiscard[agingDiscardCount - 1]
    : null;

  return (
    <div className="relative w-full" style={{ paddingBottom: '100%' }}>
      <img
        src="/viernes/tableroazul.jpg"
        alt="Tablero envejecimiento"
        className="absolute inset-0 w-full h-full object-cover rounded-xl select-none"
        draggable={false}
      />

      {/* Mazo de envejecimiento — boca abajo */}
      <div className="absolute" style={{ top: '16%', left: '26%', width: '48%', aspectRatio: '184/252' }}>
        {agingDeckCount > 0 ? (
          <>
            {agingDeckCount > 1 && (
              <div className="absolute inset-0" style={{ transform: 'translateY(-4%)' }}>
                <CardBack />
              </div>
            )}
            <div className="absolute inset-0">
              <CardBack />
            </div>
            <PileCount count={agingDeckCount} color="bg-orange-700/80" />
          </>
        ) : (
          <div className="w-full h-full rounded-[6%] border-2 border-dashed border-white/25" />
        )}
      </div>

      {/* Descarte aging — boca arriba (izquierda) */}
      <div className="absolute" style={{ top: '55%', left: '12%', width: '33%', aspectRatio: '184/252' }}>
        {topAgingDiscard ? (
          <>
            <CardFront src={getAgingCardImage(topAgingDiscard.name)} alt={topAgingDiscard.name} />
            {agingDiscardCount > 1 && <PileCount count={agingDiscardCount} color="bg-orange-700/80" />}
          </>
        ) : (
          <div className="w-full h-full rounded-[6%] border-2 border-dashed border-white/25" />
        )}
      </div>

      {/* Pila derecha — vacía en nuestro modelo (en el juego físico: aging nivel 2) */}
      <div className="absolute" style={{ top: '55%', left: '54%', width: '33%', aspectRatio: '184/252' }}>
        <div className="w-full h-full rounded-[6%] border-2 border-dashed border-white/25" />
      </div>
    </div>
  );
}

// ── Tablero Niveles de Peligro ─────────────────────────────────────────────────
//
// En la imagen (400×400px), las tres franjas de peligro están en una columna central:
//   Franja verde:    top ≈ 13%, left ≈ 28%, width ≈ 44%, height ≈ 22%
//   Franja amarilla: top ≈ 36%, left ≈ 28%, width ≈ 44%, height ≈ 22%
//   Franja roja:     top ≈ 58%, left ≈ 28%, width ≈ 44%, height ≈ 22%
//
// El paso activo recibe un ring brillante; los ya superados se oscurecen.

function TableroNiveles({ step }: { step: 'GREEN' | 'YELLOW' | 'RED' }) {
  const bands = [
    { key: 'GREEN'  as const, top: '13%' },
    { key: 'YELLOW' as const, top: '36%' },
    { key: 'RED'    as const, top: '58%' },
  ];

  return (
    <div className="relative w-full" style={{ paddingBottom: '100%' }}>
      <img
        src="/viernes/tableronivelespeligros.jpg"
        alt="Tablero niveles de peligro"
        className="absolute inset-0 w-full h-full object-cover rounded-xl select-none"
        draggable={false}
      />

      {bands.map(({ key, top }) => {
        const isActive = step === key;
        const isDone = (
          (key === 'GREEN'  && (step === 'YELLOW' || step === 'RED')) ||
          (key === 'YELLOW' && step === 'RED')
        );

        return (
          <div
            key={key}
            className="absolute transition-all duration-500"
            style={{ top, left: '25%', width: '50%', height: '21%' }}
          >
            {!isActive && (
              <div
                className="absolute inset-0 rounded-md"
                style={{ background: isDone ? 'rgba(0,0,0,0.60)' : 'rgba(0,0,0,0.25)' }}
              />
            )}
            {isActive && (
              <div className="absolute inset-0 rounded-md ring-2 ring-white ring-offset-0 animate-pulse" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Export principal ───────────────────────────────────────────────────────────

interface ViernesBoardVisualProps {
  gs: ViernesGameState;
}

export default function ViernesBoardVisual({ gs }: ViernesBoardVisualProps) {
  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      <TableroAmarillo gs={gs} />
      <TableroAzul gs={gs} />
      <TableroNiveles step={gs.step} />
    </div>
  );
}
