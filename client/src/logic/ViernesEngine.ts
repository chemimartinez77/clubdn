// client/src/logic/ViernesEngine.ts
// Motor de juego para "Viernes" (Friday/Freitag) de Friedemann Friese
// Lógica pura — sin efectos secundarios

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Difficulty = 1 | 2 | 3 | 4;

export type AgingEffect = 'MINUS_1' | 'STOP' | 'MINUS_2' | 'HIGHEST_ZERO';

// Paso actual de la partida (determina qué valor de peligro se usa)
export type GameStep = 'GREEN' | 'YELLOW' | 'RED';

export type RobinsonCardType =
  | 'MISFORTUNE'  // Normal — valor 0 (sin habilidad)
  | 'SATISFIED'   // Concentrado — valor 1 (sin habilidad)
  | 'GENIUS'      // Genial — valor 2
  | 'FOOD'        // Comiendo — valor 0, +2 vida
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
  name: string;          // Nombre del peligro (ej: "Animales Salvajes")
  skillName: string;     // Nombre de la habilidad ganada (ej: "Visión")
  hazardGreen: number;   // Valor de peligro en paso verde
  hazardYellow: number;  // Valor de peligro en paso amarillo
  hazardRed: number;     // Valor de peligro en paso rojo
  freeCards: number;     // Cartas gratis al enfrentarse a este peligro
  survivorValue: number; // Valor de lucha cuando se gana (cara habilidad)
  imageFile: string;     // Nombre del archivo PNG (ej: "carta_06_08.png")
}

export interface PirateCard {
  id: string;
  name: string;
  fightValue: number;
  freeCards: number;
  specialEffect?: string;
}

export interface FightState {
  hazardCard: HazardCard | null;
  pirateCard: PirateCard | null;
  hazardValue: number;       // El número a superar (ya calculado según paso)
  freeCards: number;         // Cartas que se pueden robar gratis
  freeCardsDrawn: number;
  isPirateFight: boolean;
  drawnCards: RobinsonCard[];
  extraCardsBought: number;
  stoppedByAging: boolean;
  lossDestructionPoints: number;
}

export type GamePhase =
  | 'HAZARD_CHOOSE'
  | 'HAZARD_FIGHT'
  | 'HAZARD_DEFEAT'
  | 'PIRATE_CHOOSE'
  | 'PIRATE_FIGHT'
  | 'FINISHED';

export interface ViernesGameState {
  difficulty: Difficulty;
  step: GameStep;
  lifePoints: number;
  maxLifePoints: number;

  robinsonDeck: RobinsonCard[];
  robinsonDiscard: RobinsonCard[];
  reshuffleCount: number;

  hazardDeck: HazardCard[];
  hazardDone: HazardCard[];
  hazardClearCount: number;  // 0→paso verde, 1→amarillo, 2→rojo, 3→piratas

  revealedHazards: [HazardCard, HazardCard] | null;

  agingDeck: RobinsonCard[];
  agingDiscard: RobinsonCard[];

  pirates: PirateCard[];
  pirateIndex: number;

  currentFight: FightState | null;
  destroyedCards: RobinsonCard[];

  phase: GamePhase;
  won: boolean | null;
}

export type ViernesAction =
  | { type: 'CHOOSE_HAZARD'; hazardIndex: 0 | 1 }
  | { type: 'SKIP_SINGLE_HAZARD' }
  | { type: 'BUY_CARD' }
  | { type: 'DESTROY_CARD'; cardId: string }
  | { type: 'RESOLVE_FIGHT' }
  | { type: 'CONFIRM_DEFEAT' }
  | { type: 'CHOOSE_PIRATE_ORDER'; firstPirateIndex: 0 | 1 };

export interface ActionResult {
  success: boolean;
  error?: string;
  newState?: ViernesGameState;
  gameOver?: boolean;
  won?: boolean;
}

// ─── Constantes del juego ─────────────────────────────────────────────────────

const MAX_LIFE_POINTS = 22;
const STARTING_LIFE_BY_DIFFICULTY: Record<Difficulty, number> = { 1: 20, 2: 20, 3: 20, 4: 18 };

// 30 cartas de peligro/habilidad reales del juego
// name = nombre del peligro (lado inferior), skillName = habilidad ganada (lado superior)
// hazardGreen/Yellow/Red = valores según paso
// freeCards = cartas gratis al enfrentarse
// survivorValue = valor de lucha de la habilidad ganada
const HAZARD_DEFS: Array<Omit<HazardCard, 'id'>> = [
  // ── Explorar Profundidades de la Isla (verde:2 / amarillo:5 / rojo:8, gratis:3) ──
  { name: 'Explorar Profundidades de la Isla', skillName: 'Repetición',   hazardGreen: 2, hazardYellow: 5, hazardRed: 8, freeCards: 3, survivorValue: 2, imageFile: 'carta_01_01.png' },
  { name: 'Explorar Profundidades de la Isla', skillName: 'Nutrición',    hazardGreen: 2, hazardYellow: 5, hazardRed: 8, freeCards: 3, survivorValue: 2, imageFile: 'carta_01_02.png' },
  { name: 'Explorar Profundidades de la Isla', skillName: 'Estrategia',   hazardGreen: 2, hazardYellow: 5, hazardRed: 8, freeCards: 3, survivorValue: 2, imageFile: 'carta_01_03.png' },
  { name: 'Explorar Profundidades de la Isla', skillName: 'Visión',       hazardGreen: 2, hazardYellow: 5, hazardRed: 8, freeCards: 3, survivorValue: 2, imageFile: 'carta_07_01.png' },
  { name: 'Explorar Profundidades de la Isla', skillName: 'Conocimiento', hazardGreen: 2, hazardYellow: 5, hazardRed: 8, freeCards: 3, survivorValue: 2, imageFile: 'carta_07_02.png' },
  { name: 'Explorar Profundidades de la Isla', skillName: 'Experiencia',  hazardGreen: 2, hazardYellow: 5, hazardRed: 8, freeCards: 3, survivorValue: 2, imageFile: 'carta_07_03.png' },
  // ── Explorar Isla (verde:1 / amarillo:3 / rojo:6, gratis:2) ──
  { name: 'Explorar Isla', skillName: 'Arma',          hazardGreen: 1, hazardYellow: 3, hazardRed: 6, freeCards: 2, survivorValue: 2, imageFile: 'carta_01_04.png' },
  { name: 'Explorar Isla', skillName: 'Arma',          hazardGreen: 1, hazardYellow: 3, hazardRed: 6, freeCards: 2, survivorValue: 2, imageFile: 'carta_01_05.png' },
  { name: 'Explorar Isla', skillName: 'Nutrición',     hazardGreen: 1, hazardYellow: 3, hazardRed: 6, freeCards: 2, survivorValue: 1, imageFile: 'carta_01_06.png' },
  { name: 'Explorar Isla', skillName: 'Conocimiento',  hazardGreen: 1, hazardYellow: 3, hazardRed: 6, freeCards: 2, survivorValue: 1, imageFile: 'carta_06_02.png' },
  { name: 'Explorar Isla', skillName: 'Mimetismo',     hazardGreen: 1, hazardYellow: 3, hazardRed: 6, freeCards: 2, survivorValue: 1, imageFile: 'carta_06_03.png' },
  { name: 'Explorar Isla', skillName: 'Nutrición',     hazardGreen: 1, hazardYellow: 3, hazardRed: 6, freeCards: 2, survivorValue: 1, imageFile: 'carta_07_04.png' },
  { name: 'Explorar Isla', skillName: 'Truco',         hazardGreen: 1, hazardYellow: 3, hazardRed: 6, freeCards: 2, survivorValue: 1, imageFile: 'carta_07_05.png' },
  { name: 'Explorar Isla', skillName: 'Repetición',    hazardGreen: 1, hazardYellow: 3, hazardRed: 6, freeCards: 2, survivorValue: 1, imageFile: 'carta_07_06.png' },
  // ── Con la balsa al naufragio (verde:0 / amarillo:0 / rojo:3, gratis:1) ──
  { name: 'Con la balsa al naufragio', skillName: 'Estrategia',   hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_01_07.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Equipamiento', hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_01_08.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Equipamiento', hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_01_09.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Conocimiento', hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_01_10.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Truco',        hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_02_01.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Lectura',      hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_02_02.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Estrategia',   hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_06_04.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Nutrición',    hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_06_05.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Nutrición',    hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_06_06.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Mimetismo',    hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_06_07.png' },
  // ── Animales Salvajes (verde:3 / amarillo:6 / rojo:11, gratis:4) ──
  { name: 'Animales Salvajes', skillName: 'Visión',       hazardGreen: 3, hazardYellow: 6, hazardRed: 11, freeCards: 4, survivorValue: 3, imageFile: 'carta_06_08.png' },
  { name: 'Animales Salvajes', skillName: 'Experiencia',  hazardGreen: 3, hazardYellow: 6, hazardRed: 11, freeCards: 4, survivorValue: 3, imageFile: 'carta_06_09.png' },
  { name: 'Animales Salvajes', skillName: 'Conocimiento', hazardGreen: 3, hazardYellow: 6, hazardRed: 11, freeCards: 4, survivorValue: 3, imageFile: 'carta_06_10.png' },
  { name: 'Animales Salvajes', skillName: 'Estrategia',   hazardGreen: 3, hazardYellow: 6, hazardRed: 11, freeCards: 4, survivorValue: 3, imageFile: 'carta_07_09.png' },
  // ── Caníbales (verde:4 / amarillo:6 / rojo:11, gratis:5) ──
  { name: 'Caníbales', skillName: 'Arma', hazardGreen: 4, hazardYellow: 6, hazardRed: 11, freeCards: 5, survivorValue: 4, imageFile: 'carta_07_07.png' },
  { name: 'Caníbales', skillName: 'Arma', hazardGreen: 4, hazardYellow: 6, hazardRed: 11, freeCards: 5, survivorValue: 4, imageFile: 'carta_07_08.png' },
];

const AGING_MILD_DEFS: Array<Omit<RobinsonCard, 'id'>> = [
  { type: 'AGING', name: 'Desconcentrado',   value: -1, agingEffect: 'MINUS_1' },
  { type: 'AGING', name: 'Desconcentrado',   value: -1, agingEffect: 'MINUS_1' },
  { type: 'AGING', name: 'Muy Estúpido',     value: -2, agingEffect: 'MINUS_2' },
  { type: 'AGING', name: 'Muy Estúpido',     value: -2, agingEffect: 'MINUS_2' },
  { type: 'AGING', name: 'Asustado',         value:  0, agingEffect: 'HIGHEST_ZERO' },
  { type: 'AGING', name: 'Asustado',         value:  0, agingEffect: 'HIGHEST_ZERO' },
  { type: 'AGING', name: 'Muy cansado',      value:  0, agingEffect: 'STOP', canDestroy: true },
];

const AGING_SEVERE_DEFS: Array<Omit<RobinsonCard, 'id'>> = [
  { type: 'AGING', name: 'Hambriento',       value: -1, agingEffect: 'MINUS_1' },
  { type: 'AGING', name: 'Muy hambriento',   value: -2, agingEffect: 'MINUS_2' },
  { type: 'AGING', name: 'Suicida',          value: -5, agingEffect: 'MINUS_1' },
];

const PIRATE_DEFS: Array<Omit<PirateCard, 'id'>> = [
  { name: 'Pirata Viejo',   fightValue: 20, freeCards: 2 },
  { name: 'Capitán Pirata', fightValue: 25, freeCards: 2 },
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

function hazardValueForStep(card: HazardCard, step: GameStep): number {
  if (step === 'GREEN')  return card.hazardGreen;
  if (step === 'YELLOW') return card.hazardYellow;
  return card.hazardRed;
}

// ─── Inicialización ───────────────────────────────────────────────────────────

export function createInitialState(difficulty: Difficulty): ViernesGameState {
  const startingLife = STARTING_LIFE_BY_DIFFICULTY[difficulty];

  // 18 cartas iniciales Robinson: 1×Genial(2), 3×Concentrado(1), 8×Normal(0), 5×Desconcentrado(-1), 1×Comiendo(0,+2vida)
  const robinsonCards: RobinsonCard[] = [
    { id: makeId('rob', 0),  type: 'GENIUS'     as const, name: 'Genial',       value: 2 },
    ...Array.from({ length: 3  }, (_, i) => ({ id: makeId('rob', 1 + i),  type: 'SATISFIED'  as const, name: 'Concentrado', value: 1 })),
    ...Array.from({ length: 8  }, (_, i) => ({ id: makeId('rob', 4 + i),  type: 'MISFORTUNE' as const, name: 'Normal',      value: 0 })),
    ...Array.from({ length: 5  }, (_, i) => ({ id: makeId('rob', 12 + i), type: 'MISFORTUNE' as const, name: 'Desconcentrado', value: -1 })),
    { id: makeId('rob', 17), type: 'FOOD'       as const, name: 'Comiendo',     value: 0 },
  ];

  // 30 cartas de peligro
  const hazardCards: HazardCard[] = HAZARD_DEFS.map((def, i) => ({ id: makeId('hz', i), ...def }));
  const hazardDeck = shuffleArray(hazardCards);

  // Revelar dos cartas iniciales
  const card1 = hazardDeck.shift()!;
  const card2 = hazardDeck.shift()!;

  // Cartas de envejecimiento: suaves primero, severas al fondo
  const agingDeck: RobinsonCard[] = [
    ...shuffleArray(AGING_MILD_DEFS.map((def, i) => ({ id: makeId('age-mild', i), ...def }))),
    ...shuffleArray(AGING_SEVERE_DEFS.map((def, i) => ({ id: makeId('age-sev', i), ...def }))),
  ];

  // Nivel 1-2: retirar "Muy Estúpido" del juego; niveles 2-4 mezclan 1 envejecimiento inicial.
  const filteredAgingDeck = difficulty <= 2
    ? agingDeck.filter(c => c.name !== 'Muy Estúpido')
    : agingDeck;

  if (difficulty >= 2 && filteredAgingDeck.length > 0) {
    robinsonCards.push(filteredAgingDeck.shift() as RobinsonCard);
  }

  const robinsonDeck = shuffleArray(robinsonCards);
  const pirates: PirateCard[] = shuffleArray(PIRATE_DEFS.map((def, i) => ({ id: makeId('pir', i), ...def }))).slice(0, 2);

  return {
    difficulty,
    step: 'GREEN',
    lifePoints: startingLife,
    maxLifePoints: MAX_LIFE_POINTS,
    robinsonDeck,
    robinsonDiscard: [],
    reshuffleCount: 0,
    hazardDeck,
    hazardDone: [],
    hazardClearCount: 0,
    revealedHazards: [card1, card2],
    agingDeck: filteredAgingDeck,
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
  const values = cards.map((card) => card.value).sort((a, b) => b - a);
  const highestZeroCount = cards.filter(
    (card) => card.type === 'AGING' && card.agingEffect === 'HIGHEST_ZERO'
  ).length;

  let total = values.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < highestZeroCount && i < values.length; i++) {
    total -= values[i] as number;
  }

  return total;
}

export function fightIsWinning(fight: FightState): boolean {
  return calculateFightTotal(fight.drawnCards) >= fight.hazardValue;
}

// ─── Robar cartas de Robinson ─────────────────────────────────────────────────

function extraDrawCost(fight: FightState): number {
  return fight.isPirateFight && fight.pirateCard?.specialEffect === 'EXTRA_DRAW_COST_2' ? 2 : 1;
}

function destroyCost(card: RobinsonCard): number {
  return card.type === 'AGING' ? 2 : 1;
}

function calculateAgingLifePenalty(cards: RobinsonCard[]): number {
  return cards.reduce((sum, card) => {
    if (card.type !== 'AGING') return sum;
    if (card.agingEffect === 'MINUS_1') return sum + 1;
    if (card.agingEffect === 'MINUS_2') return sum + 2;
    return sum;
  }, 0);
}

function maybeFinishPirateFightIfBlocked(s: ViernesGameState): ViernesGameState {
  if (!s.currentFight?.isPirateFight) return s;
  if (fightIsWinning(s.currentFight)) return s;
  if (s.lifePoints >= extraDrawCost(s.currentFight)) return s;

  s.currentFight = null;
  s.phase = 'FINISHED';
  s.won = false;

  return s;
}

function drawForFight(s: ViernesGameState, count: number, isFreeDraw: boolean): ViernesGameState {
  for (let i = 0; i < count; i++) {
    if (isFreeDraw && s.currentFight!.stoppedByAging) break;

    if (s.robinsonDeck.length === 0) {
      if (s.robinsonDiscard.length === 0) break;
      s.reshuffleCount += 1;
      s.robinsonDeck = shuffleArray(s.robinsonDiscard);
      s.robinsonDiscard = [];
      if (s.agingDeck.length > 0) {
        const aging = s.agingDeck.shift()!;
        s.agingDiscard.push({ ...aging });
        const pos = Math.floor(Math.random() * (s.robinsonDeck.length + 1));
        s.robinsonDeck.splice(pos, 0, aging);
      }
    }

    const card = s.robinsonDeck.shift()!;
    s.currentFight!.drawnCards.push(card);
    if (isFreeDraw) {
      s.currentFight!.freeCardsDrawn += 1;
    }

    if (isFreeDraw && card.type === 'AGING' && card.agingEffect === 'STOP') {
      s.currentFight!.stoppedByAging = true;
      break;
    }
  }
  return maybeFinishPirateFightIfBlocked(s);
}

// ─── Dispatcher principal ─────────────────────────────────────────────────────

export function applyAction(state: ViernesGameState, action: ViernesAction): ActionResult {
  const s = deepClone(state);
  switch (action.type) {
    case 'CHOOSE_HAZARD':       return handleChooseHazard(s, action);
    case 'SKIP_SINGLE_HAZARD':  return handleSkipSingleHazard(s);
    case 'BUY_CARD':            return handleBuyCard(s);
    case 'DESTROY_CARD':        return handleDestroyCard(s, action);
    case 'RESOLVE_FIGHT':       return handleResolveFight(s);
    case 'CONFIRM_DEFEAT':      return handleConfirmDefeat(s);
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

  const chosen = s.revealedHazards[action.hazardIndex];
  const other  = s.revealedHazards[action.hazardIndex === 0 ? 1 : 0];
  if (!chosen || !other) {
    return { success: false, error: 'Peligro inválido' };
  }

  if (chosen.id !== other.id) {
    s.hazardDone.push(other);
  }
  s.revealedHazards = null;

  const hazardValue = hazardValueForStep(chosen, s.step);

  s.currentFight = {
    hazardCard: chosen,
    pirateCard: null,
    hazardValue,
    freeCards: chosen.freeCards,
    freeCardsDrawn: 0,
    isPirateFight: false,
    drawnCards: [],
    extraCardsBought: 0,
    stoppedByAging: false,
    lossDestructionPoints: 0,
  };
  s.phase = 'HAZARD_FIGHT';

  return { success: true, newState: drawForFight(s, chosen.freeCards, true) };
}

function handleSkipSingleHazard(s: ViernesGameState): ActionResult {
  if (s.phase !== 'HAZARD_CHOOSE' || !s.revealedHazards) {
    return { success: false, error: 'No hay un peligro único para descartar' };
  }

  const [solo, mirror] = s.revealedHazards;
  if (solo.id !== mirror.id) {
    return { success: false, error: 'Solo puedes descartar el último peligro del paso' };
  }

  s.hazardDone.push(solo);
  s.revealedHazards = null;

  return { success: true, newState: advanceHazardPhase(s) };
}

// ─── BUY_CARD ─────────────────────────────────────────────────────────────────

function handleBuyCard(s: ViernesGameState): ActionResult {
  if (!s.currentFight) return { success: false, error: 'No hay combate activo' };
  if (s.phase === 'HAZARD_DEFEAT') return { success: false, error: 'La lucha ya se ha resuelto' };

  const cost = extraDrawCost(s.currentFight);
  if (!s.currentFight.isPirateFight && s.currentFight.stoppedByAging) {
    return { success: false, error: 'El envejecimiento ha detenido el robo gratis' };
  }
  if (s.lifePoints < cost) {
    if (s.currentFight.isPirateFight) {
      s.currentFight = null;
      s.phase = 'FINISHED';
      s.won = false;
      return { success: true, newState: s, gameOver: true, won: false };
    }
    return { success: false, error: 'Sin puntos de vida suficientes' };
  }

  s.lifePoints -= cost;
  s.currentFight.extraCardsBought += 1;
  return { success: true, newState: drawForFight(s, 1, false) };
}

// ─── DESTROY_CARD ─────────────────────────────────────────────────────────────

function handleDestroyCard(
  s: ViernesGameState,
  action: Extract<ViernesAction, { type: 'DESTROY_CARD' }>
): ActionResult {
  if (s.phase !== 'HAZARD_DEFEAT' || !s.currentFight) {
    return { success: false, error: 'Solo puedes destruir cartas tras perder un peligro' };
  }

  const idx = s.currentFight.drawnCards.findIndex(c => c.id === action.cardId);
  if (idx === -1) return { success: false, error: 'Carta no encontrada' };

  const target = s.currentFight.drawnCards[idx] as RobinsonCard;
  const cost = destroyCost(target);
  if (s.currentFight.lossDestructionPoints < cost) {
    return { success: false, error: 'No quedan puntos suficientes para destruir esa carta' };
  }

  const removed = s.currentFight.drawnCards.splice(idx, 1);
  if (removed[0]) s.destroyedCards.push(removed[0]);
  s.currentFight.lossDestructionPoints -= cost;

  return { success: true, newState: s };
}

// ─── RESOLVE_FIGHT ────────────────────────────────────────────────────────────

function handleResolveFight(s: ViernesGameState): ActionResult {
  if (!s.currentFight) return { success: false, error: 'No hay combate activo' };

  const fight = s.currentFight;
  const total = calculateFightTotal(fight.drawnCards);
  const win   = total >= fight.hazardValue;
  const agingLifePenalty = calculateAgingLifePenalty(fight.drawnCards);

  if (fight.isPirateFight) {
    if (!win) {
      return { success: false, error: 'Contra los piratas debes seguir robando hasta poder ganar' };
    }

    s.robinsonDiscard.push(...fight.drawnCards);
    s.currentFight = null;

    if (s.lifePoints < agingLifePenalty) {
      s.phase = 'FINISHED';
      s.won = false;
      return { success: true, newState: s, gameOver: true, won: false };
    }
    s.lifePoints -= agingLifePenalty;

    if (s.pirateIndex < s.pirates.length - 1) {
      s.pirateIndex += 1;
      return { success: true, newState: startPirateFight(s) };
    }

    s.phase = 'FINISHED';
    s.won = true;
    return { success: true, newState: s, gameOver: true, won: true };
  }

  // Combate de peligro
  const hazard = fight.hazardCard!;

  if (win) {
    s.robinsonDiscard.push(...fight.drawnCards);
    s.currentFight = null;

    if (s.lifePoints < agingLifePenalty) {
      s.phase = 'FINISHED';
      s.won = false;
      return { success: true, newState: s, gameOver: true, won: false };
    }
    s.lifePoints -= agingLifePenalty;

    const wonCard: RobinsonCard = {
      id: `won-${hazard.id}`,
      type: 'HAZARD_WON',
      name: hazard.skillName,
      value: hazard.survivorValue,
      survivorValue: hazard.survivorValue,
      hazardName: hazard.name,
    };
    s.robinsonDiscard.push(wonCard);
  } else {
    const lifeLost = fight.hazardValue - total;
    if (s.lifePoints < lifeLost + agingLifePenalty) {
      s.currentFight = null;
      s.phase = 'FINISHED';
      s.won = false;
      return { success: true, newState: s, gameOver: true, won: false };
    }

    s.lifePoints -= lifeLost + agingLifePenalty;
    s.currentFight.lossDestructionPoints = lifeLost;
    s.phase = 'HAZARD_DEFEAT';
    return { success: true, newState: s };
  }

  return { success: true, newState: advanceHazardPhase(s) };
}

function handleConfirmDefeat(s: ViernesGameState): ActionResult {
  if (s.phase !== 'HAZARD_DEFEAT' || !s.currentFight?.hazardCard) {
    return { success: false, error: 'No hay una derrota pendiente de confirmar' };
  }

  s.robinsonDiscard.push(...s.currentFight.drawnCards);
  s.hazardDone.push(s.currentFight.hazardCard);
  s.currentFight = null;

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
    freeCards: pirate.freeCards,
    freeCardsDrawn: 0,
    isPirateFight: true,
    drawnCards: [],
    extraCardsBought: 0,
    stoppedByAging: false,
    lossDestructionPoints: 0,
  };
  s.phase = 'PIRATE_FIGHT';
  return drawForFight(s, pirate.freeCards, true);
}

// ─── Avance de fase de peligros ───────────────────────────────────────────────

function advanceHazardPhase(s: ViernesGameState): ViernesGameState {
  if (s.hazardDeck.length >= 2) {
    s.revealedHazards = [s.hazardDeck.shift()!, s.hazardDeck.shift()!];
    s.phase = 'HAZARD_CHOOSE';
    return s;
  }

  if (s.hazardDeck.length === 1) {
    const solo = s.hazardDeck.shift()!;
    s.revealedHazards = [solo, solo];
    s.phase = 'HAZARD_CHOOSE';
    return s;
  }

  // Mazo vacío: avanzar paso
  s.hazardClearCount += 1;

  if (s.hazardClearCount === 1) {
    s.step = 'YELLOW';
  } else if (s.hazardClearCount === 2) {
    s.step = 'RED';
  }

  if (s.hazardClearCount < 3) {
    s.hazardDeck = shuffleArray([...s.hazardDone]);
    s.hazardDone = [];

    if (s.hazardDeck.length >= 2) {
      s.revealedHazards = [s.hazardDeck.shift()!, s.hazardDeck.shift()!];
    } else if (s.hazardDeck.length === 1) {
      const solo = s.hazardDeck.shift()!;
      s.revealedHazards = [solo, solo];
    }
    s.phase = 'HAZARD_CHOOSE';
  } else {
    s.phase = 'PIRATE_CHOOSE';
    s.pirateIndex = -1;
  }

  return s;
}
