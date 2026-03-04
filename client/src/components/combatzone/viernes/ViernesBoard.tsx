// client/src/components/combatzone/viernes/ViernesBoard.tsx
import { useNavigate } from 'react-router-dom';
import { useViernesGame } from '../../../hooks/useViernesGame';
import { calculateFightTotal } from '../../../logic/ViernesEngine';
import type { HazardCard, RobinsonCard, FightState, ViernesGameState } from '../../../logic/ViernesEngine';
import {
  getRobinsonCardImage,
  getAgingCardImage,
  getPirateCardImage,
  getHazardWonCardImage,
  HAZARD_BACK_IMAGE,
} from '../../../logic/ViernesImages';

// ─── StatusBar ─────────────────────────────────────────────────────────────────

function StatusBar({ gs, onAbandon, isAbandoning }: {
  gs: ViernesGameState;
  onAbandon: () => void;
  isAbandoning: boolean;
}) {
  const pct = (gs.lifePoints / gs.maxLifePoints) * 100;
  const barColor = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-400' : 'bg-red-500';

  const phaseLabel: Record<string, string> = {
    HAZARD_CHOOSE: 'Elige un peligro',
    HAZARD_FIGHT:  'En combate',
    PIRATE_CHOOSE: 'Elige el orden de piratas',
    PIRATE_FIGHT:  'Combate pirata',
    FINISHED:      gs.won ? '¡Victoria!' : 'Derrota',
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
      {/* Vida */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-[var(--color-text-muted)]">Vida</span>
          <span className="text-sm font-bold text-[var(--color-text)]">
            {gs.lifePoints} / {gs.maxLifePoints}
          </span>
        </div>
        <div className="w-full h-2 bg-[var(--color-border)] rounded-full">
          <div
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${Math.max(0, pct)}%` }}
          />
        </div>
      </div>

      {/* Fase */}
      <div className="text-center px-3 py-1 rounded-lg bg-[var(--color-primary)]/10">
        <p className="text-xs font-semibold text-[var(--color-primary)]">
          {phaseLabel[gs.phase] ?? gs.phase}
        </p>
      </div>

      {/* Progreso peligros */}
      <div className="text-center">
        <p className="text-xs text-[var(--color-text-muted)]">Peligros</p>
        <p className="text-sm font-bold text-[var(--color-text)]">
          {gs.hazardClearCount} / 2
        </p>
      </div>

      {/* Abandonar */}
      {gs.phase !== 'FINISHED' && (
        <button
          onClick={() => {
            if (window.confirm('¿Abandonar la partida?')) onAbandon();
          }}
          disabled={isAbandoning}
          className="text-xs text-red-400 hover:text-red-300 underline"
        >
          Abandonar
        </button>
      )}
    </div>
  );
}

// ─── HazardCardView ────────────────────────────────────────────────────────────

function HazardCardView({ hazard, onChoose, disabled }: {
  hazard: HazardCard;
  onChoose?: () => void;
  disabled?: boolean;
}) {
  const isClickable = !!onChoose && !disabled;
  return (
    <div
      onClick={isClickable ? onChoose : undefined}
      className={`
        relative flex flex-col rounded-2xl border-2 overflow-hidden w-36 transition-all select-none
        ${isClickable
          ? 'border-[var(--color-primary)] cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-primary)]/30'
          : 'border-[var(--color-border)]'}
        bg-[var(--color-surface)]
      `}
    >
      {/* Imagen de la carta (reverso genérico con overlay de stats) */}
      <div className="relative">
        <img
          src={HAZARD_BACK_IMAGE}
          alt={hazard.name}
          className="w-full object-cover"
          style={{ height: '160px' }}
        />
        {/* Overlay con stats */}
        <div className="absolute inset-0 bg-black/50 flex flex-col justify-between p-2">
          <span className="text-xl font-black text-red-400 drop-shadow">{hazard.hazardValue}</span>
          <p className="text-sm font-bold text-white text-center drop-shadow leading-tight">
            {hazard.name}
          </p>
          <div className="text-right">
            <span className="text-base font-bold text-green-400 drop-shadow">+{hazard.survivorValue}</span>
          </div>
        </div>
      </div>

      {isClickable && (
        <div className="py-1.5 text-center text-xs font-semibold text-white bg-[var(--color-primary)]">
          Elegir
        </div>
      )}
    </div>
  );
}

// ─── Resolución de imagen de carta Robinson ────────────────────────────────────

function resolveRobinsonImage(card: RobinsonCard): string {
  if (card.type === 'AGING')      return getAgingCardImage(card.name);
  if (card.type === 'HAZARD_WON') return getHazardWonCardImage(card.hazardName ?? card.name);
  return getRobinsonCardImage(card.name);
}

// ─── RobinsonCardView ──────────────────────────────────────────────────────────

function RobinsonCardView({ card, onDestroy, canDestroyThis, lifePoints }: {
  card: RobinsonCard;
  onDestroy?: (id: string) => void;
  canDestroyThis: boolean;
  lifePoints: number;
}) {
  const isAging    = card.type === 'AGING';
  const isStop     = isAging && card.agingEffect === 'STOP';
  const valueColor = card.value < 0 ? 'text-red-400' : card.value === 0 ? 'text-gray-300' : 'text-green-400';
  const ringColor  = isStop ? 'ring-red-500' : isAging ? 'ring-orange-400' : 'ring-[var(--color-border)]';
  const imgSrc     = resolveRobinsonImage(card);

  return (
    <div className={`relative flex flex-col items-center rounded-xl overflow-hidden ring-2 ${ringColor} w-20 bg-[var(--color-surface)]`}>
      {/* Imagen */}
      <div className="relative w-full">
        <img src={imgSrc} alt={card.name} className="w-full object-cover" style={{ height: '96px' }} />
        {/* Badge de valor */}
        <span className={`absolute top-1 left-1 text-sm font-black drop-shadow-md ${valueColor}`}>
          {card.value > 0 ? `+${card.value}` : card.value}
        </span>
        {isAging && (
          <span className="absolute top-1 right-1 text-[8px] bg-orange-600/80 text-white rounded px-0.5 font-bold">
            ENV
          </span>
        )}
      </div>
      {/* Nombre */}
      <p className="text-[9px] text-center text-[var(--color-text-muted)] px-1 py-0.5 leading-tight line-clamp-2 w-full">
        {card.name}
      </p>
      {/* Botón destruir */}
      {canDestroyThis && onDestroy && lifePoints >= 2 && (
        <button
          onClick={() => onDestroy(card.id)}
          className="w-full py-0.5 text-[9px] text-red-400 hover:bg-red-500/20 font-semibold transition-colors"
          title="Destruir (−2 vida)"
        >
          −2♥ Destruir
        </button>
      )}
    </div>
  );
}

// ─── FightPanel ────────────────────────────────────────────────────────────────

function FightPanel({ gs, fight, onBuy, onResolve, onDestroy, isSending }: {
  gs: ViernesGameState;
  fight: FightState;
  onBuy: () => void;
  onResolve: () => void;
  onDestroy: (id: string) => void;
  isSending: boolean;
}) {
  const total   = calculateFightTotal(fight.drawnCards);
  const winning = total >= fight.hazardValue;
  const diff    = total - fight.hazardValue;

  const targetCard = fight.isPirateFight ? fight.pirateCard! : fight.hazardCard!;

  return (
    <div className="flex flex-col gap-4">
      {/* Objetivo del combate */}
      <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        {/* Imagen de la carta objetivo */}
        <div className="relative flex-shrink-0 rounded-xl overflow-hidden ring-2 ring-red-500/50" style={{ width: 64, height: 80 }}>
          <img
            src={fight.isPirateFight
              ? getPirateCardImage(('name' in targetCard ? (targetCard as any).name : ''))
              : HAZARD_BACK_IMAGE}
            alt={'name' in targetCard ? (targetCard as any).name : ''}
            className="w-full h-full object-cover"
          />
          <span className="absolute bottom-0 inset-x-0 text-center text-xs font-black text-white bg-black/60 py-0.5">
            {fight.isPirateFight ? '☠' : '⚠'}
          </span>
        </div>

        <div className="flex-1">
          <p className="text-lg font-bold text-[var(--color-text)]">
            {'name' in targetCard ? (targetCard as any).name : ''}
          </p>
          <p className="text-3xl font-black text-red-400 mt-1">
            {fight.hazardValue}
            <span className="text-sm font-normal text-[var(--color-text-muted)] ml-2">a superar</span>
          </p>
        </div>

        {/* Total actual */}
        <div className={`flex flex-col items-center px-4 py-2 rounded-xl ${winning ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
          <span className={`text-2xl font-black ${winning ? 'text-green-400' : 'text-red-400'}`}>
            {total}
          </span>
          <span className={`text-xs font-semibold ${winning ? 'text-green-300' : 'text-red-300'}`}>
            {winning ? `+${diff} de margen` : `${diff} (perdes ${Math.max(1, -diff)} vida)`}
          </span>
        </div>
      </div>

      {/* Cartas sacadas */}
      <div>
        <p className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">
          Cartas sacadas ({fight.drawnCards.length}):
        </p>
        {fight.drawnCards.length === 0 ? (
          <p className="text-sm italic text-[var(--color-text-muted)]">Sin cartas aún</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {fight.drawnCards.map(card => (
              <RobinsonCardView
                key={card.id}
                card={card}
                onDestroy={onDestroy}
                canDestroyThis={true}
                lifePoints={gs.lifePoints}
              />
            ))}
          </div>
        )}
        {fight.stoppedByAging && (
          <p className="mt-2 text-xs text-orange-400">
            ⛔ El envejecimiento ha detenido el robo de cartas.
          </p>
        )}
      </div>

      {/* Acciones */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={onBuy}
          disabled={isSending || gs.lifePoints < 1 || fight.stoppedByAging}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 font-semibold text-sm
                     hover:bg-yellow-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          <span>🃏</span> Sacar carta (−1 vida)
        </button>

        <button
          onClick={onResolve}
          disabled={isSending}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--color-primary)] text-white font-bold text-sm
                     hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {winning ? '✅ Resolver (ganar)' : '❌ Resolver (perder)'}
        </button>
      </div>

      {gs.lifePoints < 1 && !fight.stoppedByAging && (
        <p className="text-xs text-red-400">Sin vida para comprar más cartas.</p>
      )}
    </div>
  );
}

// ─── PirateChoosePanel ─────────────────────────────────────────────────────────

function PirateChoosePanel({ gs, onChoose, isSending }: {
  gs: ViernesGameState;
  onChoose: (idx: 0 | 1) => void;
  isSending: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-lg font-bold text-[var(--color-text)]">
        ¡Fase de piratas! Elige a quién enfrentarte primero:
      </p>
      <div className="flex gap-6">
        {gs.pirates.map((pirate, i) => (
          <div
            key={pirate.id}
            onClick={() => !isSending && onChoose(i as 0 | 1)}
            className="flex flex-col items-center rounded-2xl border-2 border-[var(--color-primary)] overflow-hidden w-40
                       cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-primary)]/30 transition-all
                       bg-[var(--color-surface)] select-none"
          >
            <div className="relative w-full">
              <img
                src={getPirateCardImage(pirate.name)}
                alt={pirate.name}
                className="w-full object-cover"
                style={{ height: '140px' }}
              />
              <span className="absolute top-2 left-2 text-2xl font-black text-red-400 drop-shadow-md">
                {pirate.fightValue}
              </span>
            </div>
            <div className="p-3 w-full text-center">
              <p className="text-sm font-bold text-[var(--color-text)]">{pirate.name}</p>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">puntos a superar</p>
              <div className="w-full py-1 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold text-center">
                Enfrentar primero
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── HazardChoosePanel ─────────────────────────────────────────────────────────

function HazardChoosePanel({ gs, onChoose, isSending }: {
  gs: ViernesGameState;
  onChoose: (idx: 0 | 1) => void;
  isSending: boolean;
}) {
  if (!gs.revealedHazards) return null;
  const [h0, h1] = gs.revealedHazards;
  const isSame = h0.id === h1.id;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-base font-semibold text-[var(--color-text-muted)]">
        {isSame
          ? 'Solo queda un peligro:'
          : 'Elige a qué peligro enfrentarte:'}
      </p>
      <div className="flex gap-6">
        <HazardCardView hazard={h0} onChoose={() => !isSending && onChoose(0)} disabled={isSending} />
        {!isSame && (
          <HazardCardView hazard={h1} onChoose={() => !isSending && onChoose(1)} disabled={isSending} />
        )}
      </div>
      {!isSame && (
        <p className="text-xs text-[var(--color-text-muted)]">
          La carta no elegida irá al fondo del mazo de peligros.
        </p>
      )}
    </div>
  );
}

// ─── RobinsonStatus ────────────────────────────────────────────────────────────

function RobinsonStatus({ gs }: { gs: ViernesGameState }) {
  const wonCards = gs.robinsonDeck.concat(gs.robinsonDiscard).filter(c => c.type === 'HAZARD_WON').length;
  const agingCards = gs.robinsonDeck.concat(gs.robinsonDiscard).filter(c => c.type === 'AGING').length;

  return (
    <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
      <div>
        <p className="text-lg font-black text-[var(--color-text)]">{gs.robinsonDeck.length}</p>
        <p className="text-[10px] text-[var(--color-text-muted)]">Mazo</p>
      </div>
      <div>
        <p className="text-lg font-black text-[var(--color-text)]">{gs.robinsonDiscard.length}</p>
        <p className="text-[10px] text-[var(--color-text-muted)]">Descarte</p>
      </div>
      <div>
        <p className="text-lg font-black text-green-400">{wonCards}</p>
        <p className="text-[10px] text-[var(--color-text-muted)]">Ganadas</p>
      </div>
      <div>
        <p className="text-lg font-black text-orange-400">{agingCards}</p>
        <p className="text-[10px] text-[var(--color-text-muted)]">Envejec.</p>
      </div>
    </div>
  );
}

// ─── GameOverBanner ────────────────────────────────────────────────────────────

function GameOverBanner({ gs }: { gs: ViernesGameState }) {
  const navigate = useNavigate();
  return (
    <div className={`flex flex-col items-center gap-4 p-8 rounded-2xl border-2 text-center
      ${gs.won
        ? 'border-green-500 bg-green-500/10'
        : 'border-red-500 bg-red-500/10'}`}
    >
      <span className="text-6xl">{gs.won ? '🏝️' : '⚓'}</span>
      <h2 className={`text-2xl font-black ${gs.won ? 'text-green-400' : 'text-red-400'}`}>
        {gs.won ? '¡Robinson sobrevive!' : 'Robinson fue derrotado'}
      </h2>
      <p className="text-[var(--color-text-muted)]">
        {gs.won
          ? `Le quedan ${gs.lifePoints} puntos de vida.`
          : `Se quedó sin vida antes de derrotar a los piratas.`}
      </p>
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => navigate('/viernes')}
          className="px-5 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)] transition-all"
        >
          Volver al hub
        </button>
        <button
          onClick={() => navigate('/viernes')}
          className="px-5 py-2 rounded-lg bg-[var(--color-primary)] text-white font-bold hover:opacity-90 transition-all"
        >
          Nueva partida
        </button>
      </div>
    </div>
  );
}

// ─── ViernesBoard (componente principal) ──────────────────────────────────────

interface ViernesBoardProps {
  gameId: string;
}

export default function ViernesBoard({ gameId }: ViernesBoardProps) {
  const { game, gs, isLoading, error, sendAction, isSending, abandonGame, isAbandoning } =
    useViernesGame(gameId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  if (error || !game || !gs) {
    return (
      <div className="text-center text-red-400 py-10">
        Error al cargar la partida. Intenta refrescar la página.
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4 pb-8">
      {/* Barra de estado */}
      <StatusBar gs={gs} onAbandon={abandonGame} isAbandoning={isAbandoning} />

      {/* Estado de Robinson */}
      <RobinsonStatus gs={gs} />

      {/* Contenido principal según fase */}
      <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        {gs.phase === 'HAZARD_CHOOSE' && (
          <HazardChoosePanel
            gs={gs}
            onChoose={(idx) => sendAction({ type: 'CHOOSE_HAZARD', hazardIndex: idx })}
            isSending={isSending}
          />
        )}

        {(gs.phase === 'HAZARD_FIGHT' || gs.phase === 'PIRATE_FIGHT') && gs.currentFight && (
          <FightPanel
            gs={gs}
            fight={gs.currentFight}
            onBuy={() => sendAction({ type: 'BUY_CARD' })}
            onResolve={() => sendAction({ type: 'RESOLVE_FIGHT' })}
            onDestroy={(cardId) => sendAction({ type: 'DESTROY_CARD', cardId })}
            isSending={isSending}
          />
        )}

        {gs.phase === 'PIRATE_CHOOSE' && (
          <PirateChoosePanel
            gs={gs}
            onChoose={(idx) => sendAction({ type: 'CHOOSE_PIRATE_ORDER', firstPirateIndex: idx })}
            isSending={isSending}
          />
        )}

        {gs.phase === 'FINISHED' && (
          <GameOverBanner gs={gs} />
        )}
      </div>

      {/* Info adicional: peligros restantes */}
      {gs.phase !== 'FINISHED' && (
        <div className="text-xs text-[var(--color-text-muted)] text-center">
          Peligros restantes en el mazo: {gs.hazardDeck.length}
          {gs.revealedHazards && gs.revealedHazards[0].id !== gs.revealedHazards[1].id && ' · 2 reveladas'}
          {' · '}
          Dificultad: {['', 'Verde', 'Amarilla', 'Naranja', 'Roja'][gs.difficulty]}
          {' · '}
          Barajados: {gs.reshuffleCount}×
        </div>
      )}

      {isSending && (
        <p className="text-center text-xs text-[var(--color-text-muted)] animate-pulse">
          Procesando...
        </p>
      )}
    </div>
  );
}
