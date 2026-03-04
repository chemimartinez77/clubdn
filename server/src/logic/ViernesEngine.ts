// server/src/logic/ViernesEngine.ts
// Motor de juego para "Viernes" (Friday/Freitag) de Friedemann Friese
// Lógica pura — sin efectos secundarios

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Difficulty = 1 | 2 | 3 | 4;

export type AgingEffect = 'MINUS_1' | 'STOP' | 'DOUBLE_MINUS_1';

export type RobinsonCardType =
  | 'MISFORTUNE'  // Verhängnis — valor 0
  | 'SATISFIED'   // Satt — valor 1
  | 'GENIUS'      // Genie — valor 4
  | 'HAZARD_WON'  // Carta de peligro ganada; usa survivorValue
  | 'AGING';      // Carta de envejecimiento (efecto negativo)

export interface RobinsonCard {
  id: string;
  type: RobinsonCardType;
  name: string;
  value: number;
  // Solo en HAZARD_WON:
  survivorValue?: number;
  hazardName?: string;
  // Solo en AGING:
  agingEffect?: AgingEffect;
  canDestroy?: boolean;
}

export interface HazardCard {
  id: string;
  name: string;
  hazardValue: number;
  survivorValue: number;
}

export interface PirateCard {
  id: string;
  name: string;
  fightValue: number;
  specialEffect?: string;
}

export interface FightState {
  hazardCard: HazardCard | null;    // La carta de peligro actual (null si es pirata)
  pirateCard: PirateCard | null;    // El pirata actual (null si es peligro)
  hazardValue: number;              // El número a superar
  isPirateFight: boolean;
  drawnCards: RobinsonCard[];
  extraCardsBought: number;
  stoppedByAging: boolean;
}

export type GamePhase =
  | 'HAZARD_CHOOSE'  // Elegir entre 2 cartas de peligro reveladas
  | 'HAZARD_FIGHT'   // Combate activo contra un peligro
  | 'PIRATE_CHOOSE'  // Elegir el orden en que enfrentarse a los piratas
  | 'PIRATE_FIGHT'   // Combate activo contra un pirata
  | 'FINISHED';      // Partida terminada

export interface ViernesGameState {
  difficulty: Difficulty;
  lifePoints: number;
  maxLifePoints: number;

  robinsonDeck: RobinsonCard[];
  robinsonDiscard: RobinsonCard[];
  reshuffleCount: number;

  hazardDeck: HazardCard[];
  hazardDone: HazardCard[];
  hazardClearCount: number;     // 0, 1 → se baraja de nuevo; 2 → fase piratas

  revealedHazards: [HazardCard, HazardCard] | null;

  agingDeck: RobinsonCard[];
  agingDiscard: RobinsonCard[];

  pirates: PirateCard[];
  pirateIndex: number;          // -1 hasta que se elige orden; luego 0 o 1

  currentFight: FightState | null;
  destroyedCards: RobinsonCard[];

  phase: GamePhase;
  won: boolean | null;
}

export type ViernesAction =
  | { type: 'CHOOSE_HAZARD'; hazardIndex: 0 | 1 }
  | { type: 'BUY_CARD' }
  | { type: 'DESTROY_CARD'; cardId: string }
  | { type: 'RESOLVE_FIGHT' }
  | { type: 'CHOOSE_PIRATE_ORDER'; firstPirateIndex: 0 | 1 };

export interface ActionResult {
  success: boolean;
  error?: string;
  newState?: ViernesGameState;
  gameOver?: boolean;
  won?: boolean;
}

// ─── Constantes del juego ─────────────────────────────────────────────────────

const LIFE_BY_DIFFICULTY: Record<Difficulty, number> = { 1: 22, 2: 20, 3: 18, 4: 16 };

const HAZARD_DEFS: Array<{ name: string; hazardValue: number; survivorValue: number }> = [
  { name: 'Hambre',      hazardValue: 0,  survivorValue: 1 },
  { name: 'Lluvia',      hazardValue: 1,  survivorValue: 2 },
  { name: 'Fuego',       hazardValue: 2,  survivorValue: 2 },
  { name: 'Enfermedad',  hazardValue: 3,  survivorValue: 3 },
  { name: 'Debilidad',   hazardValue: 4,  survivorValue: 3 },
  { name: 'Araña',       hazardValue: 4,  survivorValue: 4 },
  { name: 'Serpiente',   hazardValue: 5,  survivorValue: 4 },
  { name: 'Humo',        hazardValue: 5,  survivorValue: 4 },
  { name: 'Oso',         hazardValue: 6,  survivorValue: 5 },
  { name: 'Jabalí',      hazardValue: 7,  survivorValue: 5 },
  { name: 'Gorila',      hazardValue: 7,  survivorValue: 6 },
  { name: 'Cocodrilo',   hazardValue: 8,  survivorValue: 6 },
  { name: 'Podrido',     hazardValue: 8,  survivorValue: 6 },
  { name: 'Caza',        hazardValue: 9,  survivorValue: 7 },
  { name: 'Tornado',     hazardValue: 9,  survivorValue: 7 },
  { name: 'Agotamiento', hazardValue: 10, survivorValue: 8 },
  { name: 'Traición',    hazardValue: 11, survivorValue: 8 },
  { name: 'Catástrofe',  hazardValue: 14, survivorValue: 9 },
];

const AGING_MILD_DEFS: Array<Omit<RobinsonCard, 'id'>> = [
  { type: 'AGING', name: 'Hambre leve',      value: -1, agingEffect: 'MINUS_1' },
  { type: 'AGING', name: 'Hambre leve',      value: -1, agingEffect: 'MINUS_1' },
  { type: 'AGING', name: 'Enfermedad leve',  value:  0, agingEffect: 'STOP', canDestroy: true },
  { type: 'AGING', name: 'Agotamiento leve', value: -2, agingEffect: 'DOUBLE_MINUS_1' },
];

const AGING_SEVERE_DEFS: Array<Omit<RobinsonCard, 'id'>> = [
  { type: 'AGING', name: 'Enfermedad grave',  value:  0, agingEffect: 'STOP' },
  { type: 'AGING', name: 'Hambre grave (-2)', value: -2, agingEffect: 'MINUS_1' },
  { type: 'AGING', name: 'Hambre grave (-3)', value: -3, agingEffect: 'MINUS_1' },
  { type: 'AGING', name: 'Agotamiento grave', value: -3, agingEffect: 'DOUBLE_MINUS_1' },
  { type: 'AGING', name: 'Muerte',            value: -5, agingEffect: 'MINUS_1' },
];

const PIRATE_DEFS: Array<Omit<PirateCard, 'id'>> = [
  { name: 'Pirata Viejo',   fightValue: 20 },
  { name: 'Capitán Pirata', fightValue: 25 },
];

// ─── Utilidades ───────────────────────────────────────────────────────────────

function makeId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ─── Inicialización ───────────────────────────────────────────────────────────

export function createInitialState(difficulty: Difficulty): ViernesGameState {
  const maxLife = LIFE_BY_DIFFICULTY[difficulty];

  // Mazo de Robinson inicial
  const robinsonCards: RobinsonCard[] = [
    ...Array.from({ length: 8 }, (_, i) => ({ id: makeId('rob', i),     type: 'MISFORTUNE' as const, name: 'Normal',      value: 0 })),
    ...Array.from({ length: 3 }, (_, i) => ({ id: makeId('rob', 8 + i), type: 'SATISFIED'  as const, name: 'Concentrado', value: 1 })),
    { id: makeId('rob', 11), type: 'GENIUS' as const, name: 'Genial', value: 4 },
  ];
  const robinsonDeck = shuffleArray(robinsonCards);

  // Mazo de peligros
  const hazardCards: HazardCard[] = HAZARD_DEFS.map((def, i) => ({ id: makeId('hz', i), ...def }));
  const hazardDeck = shuffleArray(hazardCards);

  // Revelar dos cartas de peligro iniciales
  const card1 = hazardDeck.shift()!;
  const card2 = hazardDeck.shift()!;

  // Cartas de envejecimiento: suaves primero (arriba), severas en el fondo
  const agingDeck: RobinsonCard[] = [
    ...shuffleArray(AGING_MILD_DEFS.map((def, i) => ({ id: makeId('age-mild', i),   ...def }))),
    ...shuffleArray(AGING_SEVERE_DEFS.map((def, i) => ({ id: makeId('age-sev', i),  ...def }))),
  ];

  const pirates: PirateCard[] = PIRATE_DEFS.map((def, i) => ({ id: makeId('pir', i), ...def }));

  return {
    difficulty,
    lifePoints: maxLife,
    maxLifePoints: maxLife,
    robinsonDeck,
    robinsonDiscard: [],
    reshuffleCount: 0,
    hazardDeck,
    hazardDone: [],
    hazardClearCount: 0,
    revealedHazards: [card1, card2],
    agingDeck,
    agingDiscard: [],
    pirates,
    pirateIndex: -1,
    currentFight: null,
    destroyedCards: [],
    phase: 'HAZARD_CHOOSE',
    won: null,
  };
}

// ─── Total de combate ─────────────────────────────────────────────────────────

export function calculateFightTotal(cards: RobinsonCard[]): number {
  return cards.reduce((sum, c) => sum + c.value, 0);
}

export function fightIsWinning(fight: FightState): boolean {
  return calculateFightTotal(fight.drawnCards) >= fight.hazardValue;
}

// ─── Robar cartas de Robinson ─────────────────────────────────────────────────

/**
 * Roba `count` cartas del mazo de Robinson para el combate activo.
 * Si el mazo se agota, baraja el descarte y añade una carta de envejecimiento.
 * Para si se saca una carta STOP.
 */
function drawForFight(s: ViernesGameState, count: number): ViernesGameState {
  for (let i = 0; i < count; i++) {
    if (s.currentFight!.stoppedByAging) break;

    // Barajar si el mazo está vacío
    if (s.robinsonDeck.length === 0) {
      if (s.robinsonDiscard.length === 0) break;
      s.reshuffleCount += 1;
      s.robinsonDeck = shuffleArray(s.robinsonDiscard);
      s.robinsonDiscard = [];
      // Insertar carta de envejecimiento aleatoriamente en el nuevo mazo
      if (s.agingDeck.length > 0) {
        const aging = s.agingDeck.shift()!;
        s.agingDiscard.push({ ...aging }); // registro de las añadidas
        const pos = Math.floor(Math.random() * (s.robinsonDeck.length + 1));
        s.robinsonDeck.splice(pos, 0, aging);
      }
    }

    const card = s.robinsonDeck.shift()!;
    s.currentFight!.drawnCards.push(card);

    if (card.type === 'AGING' && card.agingEffect === 'STOP') {
      s.currentFight!.stoppedByAging = true;
      break;
    }
  }
  return s;
}

// ─── Dispatcher principal ─────────────────────────────────────────────────────

export function applyAction(state: ViernesGameState, action: ViernesAction): ActionResult {
  const s = deepClone(state);
  switch (action.type) {
    case 'CHOOSE_HAZARD':      return handleChooseHazard(s, action);
    case 'BUY_CARD':           return handleBuyCard(s);
    case 'DESTROY_CARD':       return handleDestroyCard(s, action);
    case 'RESOLVE_FIGHT':      return handleResolveFight(s);
    case 'CHOOSE_PIRATE_ORDER': return handleChoosePirateOrder(s, action);
    default:
      return { success: false, error: 'Acción desconocida' };
  }
}

// ─── CHOOSE_HAZARD ────────────────────────────────────────────────────────────

function handleChooseHazard(
  s: ViernesGameState,
  action: Extract<ViernesAction, { type: 'CHOOSE_HAZARD' }>
): ActionResult {
  if (s.phase !== 'HAZARD_CHOOSE' || !s.revealedHazards) {
    return { success: false, error: 'No es el momento de elegir peligro' };
  }
  if (action.hazardIndex !== 0 && action.hazardIndex !== 1) {
    return { success: false, error: 'Índice de hazard inválido' };
  }

  const chosen = s.revealedHazards[action.hazardIndex];
  const other  = s.revealedHazards[action.hazardIndex === 0 ? 1 : 0];

  // La no elegida va al fondo del mazo de peligros
  // Si era la misma (caso borde con 1 sola carta) no la duplicamos
  if (chosen.id !== other.id) {
    s.hazardDeck.push(other);
  }
  s.revealedHazards = null;

  s.currentFight = {
    hazardCard: chosen,
    pirateCard: null,
    hazardValue: chosen.hazardValue,
    isPirateFight: false,
    drawnCards: [],
    extraCardsBought: 0,
    stoppedByAging: false,
  };
  s.phase = 'HAZARD_FIGHT';

  return { success: true, newState: drawForFight(s, 2) };
}

// ─── BUY_CARD ─────────────────────────────────────────────────────────────────

function handleBuyCard(s: ViernesGameState): ActionResult {
  if (!s.currentFight) return { success: false, error: 'No hay combate activo' };
  if (s.currentFight.stoppedByAging) return { success: false, error: 'El envejecimiento ha detenido el robo' };
  if (s.lifePoints < 1) return { success: false, error: 'Sin puntos de vida suficientes' };

  s.lifePoints -= 1;
  s.currentFight.extraCardsBought += 1;
  return { success: true, newState: drawForFight(s, 1) };
}

// ─── DESTROY_CARD ─────────────────────────────────────────────────────────────

function handleDestroyCard(
  s: ViernesGameState,
  action: Extract<ViernesAction, { type: 'DESTROY_CARD' }>
): ActionResult {
  if (!s.currentFight) return { success: false, error: 'No hay combate activo' };
  if (s.lifePoints < 2) return { success: false, error: 'Necesitas 2 puntos de vida para destruir' };

  const idx = s.currentFight.drawnCards.findIndex(c => c.id === action.cardId);
  if (idx === -1) return { success: false, error: 'Carta no encontrada' };

  const removed = s.currentFight.drawnCards.splice(idx, 1);
  if (removed[0]) s.destroyedCards.push(removed[0]);
  s.lifePoints -= 2;

  return { success: true, newState: s };
}

// ─── RESOLVE_FIGHT ────────────────────────────────────────────────────────────

function handleResolveFight(s: ViernesGameState): ActionResult {
  if (!s.currentFight) return { success: false, error: 'No hay combate activo' };

  const fight = s.currentFight;
  const total = calculateFightTotal(fight.drawnCards);
  const win   = total >= fight.hazardValue;

  // Las cartas sacadas van al descarte de Robinson
  s.robinsonDiscard.push(...fight.drawnCards);
  s.currentFight = null;

  if (fight.isPirateFight) {
    if (!win) {
      s.phase = 'FINISHED';
      s.won = false;
      return { success: true, newState: s, gameOver: true, won: false };
    }
    // Pirata derrotado
    if (s.pirateIndex < s.pirates.length - 1) {
      s.pirateIndex += 1;
      return { success: true, newState: startPirateFight(s) };
    } else {
      s.phase = 'FINISHED';
      s.won = true;
      return { success: true, newState: s, gameOver: true, won: true };
    }
  }

  // Combate de peligro
  const hazard = fight.hazardCard!;

  if (win) {
    // Añadir la carta ganada al descarte de Robinson
    const wonCard: RobinsonCard = {
      id: `won-${hazard.id}`,
      type: 'HAZARD_WON',
      name: hazard.name,
      value: hazard.survivorValue,
      survivorValue: hazard.survivorValue,
      hazardName: hazard.name,
    };
    s.robinsonDiscard.push(wonCard);
    s.hazardDone.push(hazard);
  } else {
    const lifeLost = Math.max(1, hazard.hazardValue - total);
    s.lifePoints = Math.max(0, s.lifePoints - lifeLost);
    s.hazardDone.push(hazard);

    if (s.lifePoints <= 0) {
      s.phase = 'FINISHED';
      s.won = false;
      return { success: true, newState: s, gameOver: true, won: false };
    }
  }

  return { success: true, newState: advanceHazardPhase(s) };
}

// ─── CHOOSE_PIRATE_ORDER ──────────────────────────────────────────────────────

function handleChoosePirateOrder(
  s: ViernesGameState,
  action: Extract<ViernesAction, { type: 'CHOOSE_PIRATE_ORDER' }>
): ActionResult {
  if (s.phase !== 'PIRATE_CHOOSE') {
    return { success: false, error: 'No es el momento de elegir el orden de piratas' };
  }

  if (action.firstPirateIndex === 1) {
    const p0 = s.pirates[0] as PirateCard;
    const p1 = s.pirates[1] as PirateCard;
    s.pirates = [p1, p0];
  }
  s.pirateIndex = 0;
  s.phase = 'PIRATE_FIGHT';

  return { success: true, newState: startPirateFight(s) };
}

function startPirateFight(s: ViernesGameState): ViernesGameState {
  const pirate = s.pirates[s.pirateIndex] as PirateCard;
  s.currentFight = {
    hazardCard: null,
    pirateCard: pirate,
    hazardValue: pirate.fightValue,
    isPirateFight: true,
    drawnCards: [],
    extraCardsBought: 0,
    stoppedByAging: false,
  };
  s.phase = 'PIRATE_FIGHT';
  return drawForFight(s, 2);
}

// ─── Avance de fase de peligros ───────────────────────────────────────────────

function advanceHazardPhase(s: ViernesGameState): ViernesGameState {
  // Intentar revelar dos nuevas cartas de peligro
  if (s.hazardDeck.length >= 2) {
    s.revealedHazards = [s.hazardDeck.shift()!, s.hazardDeck.shift()!];
    s.phase = 'HAZARD_CHOOSE';
    return s;
  }

  if (s.hazardDeck.length === 1) {
    // Solo queda una carta: se enfrenta directamente (sin elección)
    const solo = s.hazardDeck.shift()!;
    s.revealedHazards = [solo, solo]; // índice 0 = la única carta
    s.phase = 'HAZARD_CHOOSE';
    return s;
  }

  // Mazo de peligros vacío
  s.hazardClearCount += 1;

  if (s.hazardClearCount < 2) {
    // Primera limpieza: barajar peligros descartados
    s.hazardDeck = shuffleArray(s.hazardDone);
    s.hazardDone = [];

    if (s.hazardDeck.length >= 2) {
      s.revealedHazards = [s.hazardDeck.shift()!, s.hazardDeck.shift()!];
    } else if (s.hazardDeck.length === 1) {
      const solo = s.hazardDeck.shift()!;
      s.revealedHazards = [solo, solo];
    }
    s.phase = 'HAZARD_CHOOSE';
  } else {
    // Segunda limpieza: fase de piratas
    s.phase = 'PIRATE_CHOOSE';
    s.pirateIndex = -1;
  }

  return s;
}
