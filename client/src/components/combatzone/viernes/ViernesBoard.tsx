// client/src/components/combatzone/viernes/ViernesBoard.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useViernesGame } from '../../../hooks/useViernesGame';
import { calculateFightTotal } from '../../../logic/ViernesEngine';
import type {
  FightState,
  HazardCard,
  RobinsonCard,
  ViernesGameState,
} from '../../../logic/ViernesEngine';
import {
  getAgingCardImage,
  getHazardCardImage,
  getPirateCardImage,
  getRobinsonCardImage,
  getSkillCardImage,
} from '../../../logic/ViernesImages';

function revealedHazardCount(gs: ViernesGameState): number {
  if (!gs.revealedHazards) return 0;
  const [first, second] = gs.revealedHazards;
  return first.id === second.id ? 1 : 2;
}

function destroyCost(card: RobinsonCard): number {
  return card.type === 'AGING' ? 2 : 1;
}

function resolveRobinsonImage(card: RobinsonCard): string {
  if (card.type === 'AGING') return getAgingCardImage(card.name);
  if (card.type === 'HAZARD_WON') return getSkillCardImage(card.name);
  return getRobinsonCardImage(card.name);
}

function resolveActionError(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;

  const maybeAxios = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };

  return maybeAxios.response?.data?.message ?? maybeAxios.message ?? null;
}

function StatusBar({ gs, onAbandon, isAbandoning }: {
  gs: ViernesGameState;
  onAbandon: () => void;
  isAbandoning: boolean;
}) {
  const pct = (gs.lifePoints / gs.maxLifePoints) * 100;
  const barColor = pct > 50 ? 'bg-green-500' : pct > 25 ? 'bg-yellow-400' : 'bg-red-500';
  const stepLabel: Record<string, { label: string; color: string }> = {
    GREEN: { label: 'Paso Verde', color: 'text-green-400' },
    YELLOW: { label: 'Paso Amarillo', color: 'text-yellow-400' },
    RED: { label: 'Paso Rojo', color: 'text-red-400' },
  };
  const phaseLabel: Record<string, string> = {
    HAZARD_CHOOSE: 'Elige un peligro',
    HAZARD_FIGHT: 'En combate',
    HAZARD_DEFEAT: 'Despues de perder',
    PIRATE_CHOOSE: 'Orden de piratas',
    PIRATE_FIGHT: 'Combate pirata',
    FINISHED: gs.won ? 'Victoria' : 'Derrota',
  };
  const stepInfo = stepLabel[gs.step] ?? { label: gs.step, color: 'text-white' };

  return (
    <div className="flex items-center gap-3 p-3 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] flex-wrap">
      <div className="flex-1 min-w-[120px]">
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

      <div className="text-center px-2 py-1 rounded-lg bg-[var(--color-primary)]/10">
        <p className={`text-xs font-bold ${stepInfo.color}`}>{stepInfo.label}</p>
        <p className="text-[10px] text-[var(--color-text-muted)]">{phaseLabel[gs.phase] ?? gs.phase}</p>
      </div>

      <div className="text-center">
        <p className="text-xs text-[var(--color-text-muted)]">Peligros</p>
        <p className="text-sm font-bold text-[var(--color-text)]">
          {gs.hazardDeck.length + revealedHazardCount(gs)} restantes
        </p>
      </div>

      {gs.phase !== 'FINISHED' && (
        <button
          onClick={() => {
            if (window.confirm('Abandonar la partida?')) onAbandon();
          }}
          disabled={isAbandoning}
          className="text-xs text-red-400 hover:text-red-300 underline disabled:opacity-50"
        >
          Abandonar
        </button>
      )}
    </div>
  );
}

function HazardCardView({ hazard, onChoose, disabled }: {
  hazard: HazardCard;
  onChoose?: () => void;
  disabled?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);
  const isClickable = !!onChoose && !disabled;
  const imgSrc = getHazardCardImage(hazard.imageFile);

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`
          relative rounded-2xl border-2 overflow-hidden select-none transition-all duration-200
          ${isClickable
            ? 'border-[var(--color-primary)] cursor-pointer hover:scale-105 hover:shadow-lg hover:shadow-[var(--color-primary)]/30'
            : 'border-[var(--color-border)]'}
          bg-[var(--color-surface)]
        `}
        style={{ width: 144 }}
      >
        <div
          className="relative w-full overflow-hidden"
          style={{ height: 180 }}
          onClick={isClickable && !flipped ? onChoose : undefined}
        >
          <img
            src={imgSrc}
            alt={flipped ? hazard.skillName : hazard.name}
            className="w-full object-cover transition-transform duration-300"
            style={{ height: '100%', transform: flipped ? 'none' : 'rotate(180deg)' }}
          />
          {!flipped && (
            <div className="absolute inset-0 bg-black/40 flex flex-col justify-between p-2 pointer-events-none">
              <div className="flex justify-between items-start">
                <span className="text-base font-black text-white drop-shadow">{hazard.freeCards}x</span>
                <div className="flex flex-col items-end gap-0.5">
                  <span className="text-xs font-bold text-green-400">{hazard.hazardGreen}</span>
                  <span className="text-xs font-bold text-yellow-400">{hazard.hazardYellow}</span>
                  <span className="text-xs font-bold text-red-400">{hazard.hazardRed}</span>
                </div>
              </div>
              <p className="text-xs font-bold text-white text-center drop-shadow leading-tight">
                {hazard.name}
              </p>
            </div>
          )}
          {flipped && (
            <div className="absolute bottom-0 inset-x-0 bg-black/50 py-1 px-2 pointer-events-none">
              <p className="text-[10px] font-bold text-white text-center">
                {hazard.skillName} (+{hazard.survivorValue})
              </p>
            </div>
          )}
        </div>

        {isClickable && (
          <button
            onClick={onChoose}
            className="w-full py-1.5 text-center text-xs font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 transition-opacity"
          >
            Elegir
          </button>
        )}
      </div>

      <button
        onClick={() => setFlipped((value) => !value)}
        className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline transition-colors"
      >
        {flipped ? 'Ver peligro' : 'Ver habilidad'}
      </button>
    </div>
  );
}

function RobinsonCardView({ card, onDestroy, destroyPoints }: {
  card: RobinsonCard;
  onDestroy?: (id: string) => void;
  destroyPoints?: number;
}) {
  const isAging = card.type === 'AGING';
  const isStop = isAging && card.agingEffect === 'STOP';
  const valueColor = card.value < 0 ? 'text-red-400' : card.value === 0 ? 'text-gray-300' : 'text-green-400';
  const ringColor = isStop ? 'ring-red-500' : isAging ? 'ring-orange-400' : 'ring-[var(--color-border)]';
  const cost = destroyCost(card);

  return (
    <div className={`relative flex flex-col items-center rounded-xl overflow-hidden ring-2 ${ringColor} w-20 bg-[var(--color-surface)]`}>
      <div className="relative w-full">
        <img src={resolveRobinsonImage(card)} alt={card.name} className="w-full object-cover" style={{ height: '96px' }} />
        <span className={`absolute top-1 left-1 text-sm font-black drop-shadow-md ${valueColor}`}>
          {card.value > 0 ? `+${card.value}` : card.value}
        </span>
        {isAging && (
          <span className="absolute top-1 right-1 text-[8px] bg-orange-600/80 text-white rounded px-0.5 font-bold">
            ENV
          </span>
        )}
      </div>
      <p className="text-[9px] text-center text-[var(--color-text-muted)] px-1 py-0.5 leading-tight line-clamp-2 w-full">
        {card.name}
      </p>
      {onDestroy && (destroyPoints ?? 0) >= cost && (
        <button
          onClick={() => onDestroy(card.id)}
          className="w-full py-0.5 text-[9px] text-red-400 hover:bg-red-500/20 font-semibold transition-colors"
          title={`Destruir (${cost})`}
        >
          {`-${cost} destruir`}
        </button>
      )}
    </div>
  );
}

function FightHeader({ fight, total }: { fight: FightState; total: number }) {
  const winning = total >= fight.hazardValue;
  const diff = total - fight.hazardValue;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      <div className="relative flex-shrink-0 rounded-xl overflow-hidden ring-2 ring-red-500/50" style={{ width: 64, height: 80 }}>
        {fight.isPirateFight ? (
          <img
            src={getPirateCardImage(fight.pirateCard?.name ?? '')}
            alt={fight.pirateCard?.name ?? ''}
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={getHazardCardImage(fight.hazardCard?.imageFile ?? '')}
            alt={fight.hazardCard?.name ?? ''}
            className="w-full h-full object-cover"
            style={{ transform: 'rotate(180deg)' }}
          />
        )}
        <span className="absolute bottom-0 inset-x-0 text-center text-xs font-black text-white bg-black/60 py-0.5">
          {fight.isPirateFight ? 'P' : 'H'}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-[var(--color-text)] truncate">
          {fight.isPirateFight ? fight.pirateCard?.name : fight.hazardCard?.name}
        </p>
        {!fight.isPirateFight && fight.hazardCard && (
          <p className="text-[10px] text-[var(--color-text-muted)]">
            Habilidad: {fight.hazardCard.skillName}
          </p>
        )}
        <p className="text-3xl font-black text-red-400 mt-1">
          {fight.hazardValue}
          <span className="text-sm font-normal text-[var(--color-text-muted)] ml-2">a superar</span>
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          {fight.freeCards} cartas gratis
        </p>
      </div>

      <div className={`flex flex-col items-center px-3 py-2 rounded-xl ${winning ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
        <span className={`text-2xl font-black ${winning ? 'text-green-400' : 'text-red-400'}`}>
          {total}
        </span>
        <span className={`text-xs font-semibold ${winning ? 'text-green-300' : 'text-red-300'}`}>
          {winning ? `+${diff}` : `${diff}`}
        </span>
      </div>
    </div>
  );
}

function FightPanel({ gs, fight, onBuy, onResolve, isSending }: {
  gs: ViernesGameState;
  fight: FightState;
  onBuy: () => void;
  onResolve: () => void;
  isSending: boolean;
}) {
  const total = calculateFightTotal(fight.drawnCards);
  const winning = total >= fight.hazardValue;

  return (
    <div className="flex flex-col gap-4">
      <FightHeader fight={fight} total={total} />

      <div>
        <p className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">
          Cartas sacadas ({fight.drawnCards.length}):
        </p>
        {fight.drawnCards.length === 0 ? (
          <p className="text-sm italic text-[var(--color-text-muted)]">Sin cartas aun</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {fight.drawnCards.map((card) => (
              <RobinsonCardView key={card.id} card={card} />
            ))}
          </div>
        )}
        {fight.stoppedByAging && !fight.isPirateFight && (
          <p className="mt-2 text-xs text-orange-400">
            El envejecimiento ha detenido el robo gratis.
          </p>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={onBuy}
          disabled={isSending || gs.lifePoints < 1 || (!fight.isPirateFight && fight.stoppedByAging)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/40 text-yellow-300 font-semibold text-sm
                     hover:bg-yellow-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Sacar carta (-1 vida)
        </button>

        <button
          onClick={onResolve}
          disabled={isSending || (fight.isPirateFight && !winning)}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--color-primary)] text-white font-bold text-sm
                     hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {winning ? 'Resolver' : 'Perder el peligro'}
        </button>
      </div>

      {fight.isPirateFight && !winning && (
        <p className="text-xs text-orange-400">
          Contra los piratas no puedes resolver perdiendo: debes seguir robando hasta ganar o quedarte sin vida.
        </p>
      )}
    </div>
  );
}

function DefeatPanel({ fight, onDestroy, onConfirm, isSending }: {
  fight: FightState;
  onDestroy: (id: string) => void;
  onConfirm: () => void;
  isSending: boolean;
}) {
  const total = calculateFightTotal(fight.drawnCards);
  const missing = fight.hazardValue - total;

  return (
    <div className="flex flex-col gap-4">
      <FightHeader fight={fight} total={total} />

      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4">
        <p className="text-sm font-bold text-red-300">Has perdido este peligro.</p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Te faltaron {missing} puntos y puedes destruir cartas usadas por ese mismo valor.
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Destruir envejecimiento cuesta 2; cualquier otra carta cuesta 1.
        </p>
        <p className="text-xs text-[var(--color-text-muted)] mt-1">
          Puntos disponibles: {fight.lossDestructionPoints}
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold text-[var(--color-text-muted)] mb-2">
          Cartas usadas ({fight.drawnCards.length}):
        </p>
        <div className="flex flex-wrap gap-2">
          {fight.drawnCards.map((card) => (
            <RobinsonCardView
              key={card.id}
              card={card}
              onDestroy={onDestroy}
              destroyPoints={fight.lossDestructionPoints}
            />
          ))}
        </div>
      </div>

      <button
        onClick={onConfirm}
        disabled={isSending}
        className="self-start px-5 py-2 rounded-lg bg-[var(--color-primary)] text-white font-bold text-sm
                   hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
      >
        Continuar
      </button>
    </div>
  );
}

function PirateChoosePanel({ gs, onChoose, isSending }: {
  gs: ViernesGameState;
  onChoose: (idx: 0 | 1) => void;
  isSending: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-lg font-bold text-[var(--color-text)]">
        Fase de piratas: elige a quien enfrentarte primero.
      </p>
      <div className="flex gap-6 flex-wrap justify-center">
        {gs.pirates.map((pirate, index) => (
          <div
            key={pirate.id}
            onClick={() => !isSending && onChoose(index as 0 | 1)}
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
              <p className="text-xs text-[var(--color-text-muted)] mb-2">{pirate.freeCards} cartas gratis</p>
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

function HazardChoosePanel({ gs, onChoose, onSkip, isSending }: {
  gs: ViernesGameState;
  onChoose: (idx: 0 | 1) => void;
  onSkip: () => void;
  isSending: boolean;
}) {
  if (!gs.revealedHazards) return null;

  const [h0, h1] = gs.revealedHazards;
  const isSame = h0.id === h1.id;
  const stepValueLabel: Record<string, string> = { GREEN: 'verde', YELLOW: 'amarillo', RED: 'rojo' };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-base font-semibold text-[var(--color-text-muted)]">
        {isSame ? 'Solo queda un peligro:' : 'Elige a que peligro enfrentarte:'}
      </p>
      <p className="text-xs text-[var(--color-text-muted)]">
        Paso {stepValueLabel[gs.step]} - valor activo del peligro resaltado
      </p>
      <div className="flex gap-6 flex-wrap justify-center">
        <HazardCardView hazard={h0} onChoose={() => !isSending && onChoose(0)} disabled={isSending} />
        {!isSame && (
          <HazardCardView hazard={h1} onChoose={() => !isSending && onChoose(1)} disabled={isSending} />
        )}
      </div>
      {!isSame && (
        <p className="text-xs text-[var(--color-text-muted)]">
          La carta no elegida ira al descarte de peligros.
        </p>
      )}
      {isSame && (
        <button
          onClick={onSkip}
          disabled={isSending}
          className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text)]
                     hover:bg-[var(--color-border)]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Descartar y pasar al siguiente paso
        </button>
      )}
    </div>
  );
}

function RobinsonStatus({ gs }: { gs: ViernesGameState }) {
  const wonCards = gs.robinsonDeck.concat(gs.robinsonDiscard).filter((card) => card.type === 'HAZARD_WON').length;
  const agingCards = gs.robinsonDeck.concat(gs.robinsonDiscard).filter((card) => card.type === 'AGING').length;

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

function GameOverBanner({ gs }: { gs: ViernesGameState }) {
  const navigate = useNavigate();

  return (
    <div
      className={`flex flex-col items-center gap-4 p-8 rounded-2xl border-2 text-center ${
        gs.won ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'
      }`}
    >
      <h2 className={`text-2xl font-black ${gs.won ? 'text-green-400' : 'text-red-400'}`}>
        {gs.won ? 'Robinson sobrevive' : 'Robinson fue derrotado'}
      </h2>
      <p className="text-[var(--color-text-muted)]">
        {gs.won
          ? `Le quedan ${gs.lifePoints} puntos de vida.`
          : 'La partida ha terminado antes de derrotar a los piratas.'}
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

interface ViernesBoardProps {
  gameId: string;
}

export default function ViernesBoard({ gameId }: ViernesBoardProps) {
  const {
    game,
    gs,
    isLoading,
    error,
    sendAction,
    isSending,
    actionError,
    abandonGame,
    isAbandoning,
  } = useViernesGame(gameId);

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
        Error al cargar la partida. Intenta refrescar la pagina.
      </div>
    );
  }

  const displayGs = game.status === 'FINISHED' && gs.phase !== 'FINISHED'
    ? {
        ...gs,
        currentFight: null,
        revealedHazards: null,
        phase: 'FINISHED' as const,
        won: game.won ?? false,
      }
    : gs;
  const errorMessage = resolveActionError(actionError);

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-4 pb-8">
      <StatusBar gs={displayGs} onAbandon={abandonGame} isAbandoning={isAbandoning} />
      <RobinsonStatus gs={displayGs} />

      <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        {displayGs.phase === 'HAZARD_CHOOSE' && (
          <HazardChoosePanel
            gs={displayGs}
            onChoose={(idx) => sendAction({ type: 'CHOOSE_HAZARD', hazardIndex: idx })}
            onSkip={() => sendAction({ type: 'SKIP_SINGLE_HAZARD' })}
            isSending={isSending}
          />
        )}

        {(displayGs.phase === 'HAZARD_FIGHT' || displayGs.phase === 'PIRATE_FIGHT') && displayGs.currentFight && (
          <FightPanel
            gs={displayGs}
            fight={displayGs.currentFight}
            onBuy={() => sendAction({ type: 'BUY_CARD' })}
            onResolve={() => sendAction({ type: 'RESOLVE_FIGHT' })}
            isSending={isSending}
          />
        )}

        {displayGs.phase === 'HAZARD_DEFEAT' && displayGs.currentFight && (
          <DefeatPanel
            fight={displayGs.currentFight}
            onDestroy={(cardId) => sendAction({ type: 'DESTROY_CARD', cardId })}
            onConfirm={() => sendAction({ type: 'CONFIRM_DEFEAT' })}
            isSending={isSending}
          />
        )}

        {displayGs.phase === 'PIRATE_CHOOSE' && (
          <PirateChoosePanel
            gs={displayGs}
            onChoose={(idx) => sendAction({ type: 'CHOOSE_PIRATE_ORDER', firstPirateIndex: idx })}
            isSending={isSending}
          />
        )}

        {displayGs.phase === 'FINISHED' && <GameOverBanner gs={displayGs} />}
      </div>

      {errorMessage && (
        <p className="text-center text-xs text-red-400">{errorMessage}</p>
      )}

      {displayGs.phase !== 'FINISHED' && (
        <div className="text-xs text-[var(--color-text-muted)] text-center">
          Peligros en mazo: {displayGs.hazardDeck.length}
          {' · '}
          Dificultad: {['', 'Verde', 'Amarilla', 'Naranja', 'Roja'][displayGs.difficulty]}
          {' · '}
          Barajados: {displayGs.reshuffleCount}x
          {' · '}
          Envejecimiento restante: {displayGs.agingDeck.length}
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
