// client/src/logic/ViernesEngine.ts
// Motor de juego para "Viernes" (Friday/Freitag) de Friedemann Friese
// Lógica pura — sin efectos secundarios

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type Difficulty = 1 | 2 | 3 | 4;

export type AgingEffect = 'MINUS_1' | 'STOP' | 'MINUS_2' | 'HIGHEST_ZERO';

// Paso actual de la partida (determina qué valor de peligro se usa)
export type GameStep = 'GREEN' | 'YELLOW' | 'RED';

// Habilidades especiales de cartas HAZARD_WON y FOOD
export type SkillEffect =
  | 'FOOD_2'           // +2 vida al robar (Comiendo)
  | 'NUTRITION_1'      // +1 vida al robar (Nutrición)
  | 'EXTRA_CARD'       // Roba 1 carta gratis extra (Experiencia)
  | 'DESTROY_AGING'    // Destruye la carta superior del mazo de aging (Truco)
  | 'DESTROY_IN_FIGHT' // Destruye 1 carta de la mano durante el combate (Conocimiento)
  | 'COPY'             // Copia el valor de otra carta en la mano (Mimetismo)
  | 'SWAP_1'           // Intercambia 1 carta de la mano por una nueva (Estrategia)
  | 'SWAP_2'           // Intercambia hasta 2 cartas (Estrategia)
  | 'DOUBLE'           // Dobla el valor de una carta en la mano (Repetición)
  | 'SORT_3'           // Mira y reordena las 3 cartas siguientes del mazo (Visión)
  | 'STEP_BACK';       // Retrocede un paso de dificultad (Lectura)

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
  // Solo en HAZARD_WON / FOOD:
  skillEffect?: SkillEffect;
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
  skillEffect: SkillEffect | null; // Habilidad especial de la cara de habilidad
  hazardGreen: number;
  hazardYellow: number;
  hazardRed: number;
  freeCards: number;
  survivorValue: number;
  imageFile: string;
}

export interface PirateCard {
  id: string;
  name: string;
  fightValue: number;
  freeCards: number;
  specialEffect?: string;
}

// Habilidad interactiva pendiente de resolver por el jugador
export type PendingSkillType =
  | 'DESTROY_IN_FIGHT'  // Elige 1 carta de drawnCards para destruir
  | 'COPY'              // Elige 1 carta de drawnCards para copiar su valor
  | 'SWAP_1'            // Elige 1 carta de drawnCards para intercambiar
  | 'SWAP_2'            // Elige hasta 2 cartas de drawnCards para intercambiar
  | 'DOUBLE'            // Elige 1 carta de drawnCards para doblar su valor
  | 'SORT_3';           // Reordena las 3 cartas superiores del mazo

export interface PendingSkill {
  type: PendingSkillType;
  triggerCardId: string;  // ID de la carta que activó la habilidad
  // Para SORT_3: cartas visibles que el jugador debe reordenar
  sortCandidates?: RobinsonCard[];
  // Para SWAP: cuántos intercambios quedan
  swapsLeft?: number;
}

export interface FightState {
  hazardCard: HazardCard | null;
  pirateCard: PirateCard | null;
  hazardValue: number;
  freeCards: number;
  freeCardsDrawn: number;
  isPirateFight: boolean;
  drawnCards: RobinsonCard[];
  extraCardsBought: number;
  stoppedByAging: boolean;
  lossDestructionPoints: number;
  pendingSkill: PendingSkill | null;  // Habilidad interactiva esperando resolución
}

export type GamePhase =
  | 'HAZARD_CHOOSE'
  | 'HAZARD_FIGHT'
  | 'SKILL_PENDING'   // Habilidad interactiva esperando resolución del jugador
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
  hazardClearCount: number;

  revealedHazards: [HazardCard, HazardCard] | null;

  agingDeck: RobinsonCard[];
  agingDiscard: RobinsonCard[];

  pirates: PirateCard[];
  pirateIndex: number;

  currentFight: FightState | null;
  destroyedCards: RobinsonCard[];

  phase: GamePhase;
  won: boolean | null;

  // Fase de combate anterior a SKILL_PENDING (para volver a ella al resolver)
  phaseBeforeSkill: 'HAZARD_FIGHT' | 'PIRATE_FIGHT' | null;
}

export type ViernesAction =
  | { type: 'CHOOSE_HAZARD'; hazardIndex: 0 | 1 }
  | { type: 'SKIP_SINGLE_HAZARD' }
  | { type: 'BUY_CARD' }
  | { type: 'DESTROY_CARD'; cardId: string }
  | { type: 'RESOLVE_FIGHT' }
  | { type: 'CONFIRM_DEFEAT' }
  | { type: 'CHOOSE_PIRATE_ORDER'; firstPirateIndex: 0 | 1 }
  // Habilidades interactivas:
  | { type: 'SKILL_DESTROY'; cardId: string }          // Elige carta a destruir
  | { type: 'SKILL_COPY'; cardId: string }             // Elige carta a copiar
  | { type: 'SKILL_SWAP'; cardId: string }             // Elige carta a intercambiar (repetible)
  | { type: 'SKILL_DOUBLE'; cardId: string }           // Elige carta a doblar
  | { type: 'SKILL_SORT'; orderedIds: string[] }       // Reordena las 3 cartas del mazo
  | { type: 'SKILL_SKIP' };                            // Salta la habilidad sin usarla

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

// skillEffect por skillName — mapeamos cada nombre canónico a su habilidad
const SKILL_EFFECT_BY_NAME: Record<string, SkillEffect> = {
  'Nutrición':  'NUTRITION_1',
  'Experiencia': 'EXTRA_CARD',
  'Truco':       'DESTROY_AGING',
  'Conocimiento': 'DESTROY_IN_FIGHT',
  'Mimetismo':   'COPY',
  'Estrategia':  'SWAP_2',
  'Repetición':  'DOUBLE',
  'Visión':      'SORT_3',
  'Lectura':     'STEP_BACK',
  // Arma, Equipamiento — sin habilidad especial
};

const HAZARD_DEFS: Array<Omit<HazardCard, 'id'>> = [
  // ── Explorar Profundidades de la Isla (verde:2 / amarillo:5 / rojo:8, gratis:3) ──
  { name: 'Explorar Profundidades de la Isla', skillName: 'Repetición',   skillEffect: 'DOUBLE',           hazardGreen: 2, hazardYellow: 5, hazardRed: 8,  freeCards: 3, survivorValue: 2, imageFile: 'carta_01_01.png' },
  { name: 'Explorar Profundidades de la Isla', skillName: 'Nutrición',    skillEffect: 'NUTRITION_1',      hazardGreen: 2, hazardYellow: 5, hazardRed: 8,  freeCards: 3, survivorValue: 2, imageFile: 'carta_01_02.png' },
  { name: 'Explorar Profundidades de la Isla', skillName: 'Estrategia',   skillEffect: 'SWAP_2',           hazardGreen: 2, hazardYellow: 5, hazardRed: 8,  freeCards: 3, survivorValue: 2, imageFile: 'carta_01_03.png' },
  { name: 'Explorar Profundidades de la Isla', skillName: 'Visión',       skillEffect: 'SORT_3',           hazardGreen: 2, hazardYellow: 5, hazardRed: 8,  freeCards: 3, survivorValue: 2, imageFile: 'carta_07_01.png' },
  { name: 'Explorar Profundidades de la Isla', skillName: 'Conocimiento', skillEffect: 'DESTROY_IN_FIGHT', hazardGreen: 2, hazardYellow: 5, hazardRed: 8,  freeCards: 3, survivorValue: 2, imageFile: 'carta_07_02.png' },
  { name: 'Explorar Profundidades de la Isla', skillName: 'Experiencia',  skillEffect: 'EXTRA_CARD',       hazardGreen: 2, hazardYellow: 5, hazardRed: 8,  freeCards: 3, survivorValue: 2, imageFile: 'carta_07_03.png' },
  // ── Explorar Isla (verde:1 / amarillo:3 / rojo:6, gratis:2) ──
  { name: 'Explorar Isla', skillName: 'Arma',          skillEffect: null,               hazardGreen: 1, hazardYellow: 3, hazardRed: 6,  freeCards: 2, survivorValue: 2, imageFile: 'carta_01_04.png' },
  { name: 'Explorar Isla', skillName: 'Arma',          skillEffect: null,               hazardGreen: 1, hazardYellow: 3, hazardRed: 6,  freeCards: 2, survivorValue: 2, imageFile: 'carta_01_05.png' },
  { name: 'Explorar Isla', skillName: 'Nutrición',     skillEffect: 'NUTRITION_1',      hazardGreen: 1, hazardYellow: 3, hazardRed: 6,  freeCards: 2, survivorValue: 1, imageFile: 'carta_01_06.png' },
  { name: 'Explorar Isla', skillName: 'Conocimiento',  skillEffect: 'DESTROY_IN_FIGHT', hazardGreen: 1, hazardYellow: 3, hazardRed: 6,  freeCards: 2, survivorValue: 1, imageFile: 'carta_06_02.png' },
  { name: 'Explorar Isla', skillName: 'Mimetismo',     skillEffect: 'COPY',             hazardGreen: 1, hazardYellow: 3, hazardRed: 6,  freeCards: 2, survivorValue: 1, imageFile: 'carta_06_03.png' },
  { name: 'Explorar Isla', skillName: 'Nutrición',     skillEffect: 'NUTRITION_1',      hazardGreen: 1, hazardYellow: 3, hazardRed: 6,  freeCards: 2, survivorValue: 1, imageFile: 'carta_07_04.png' },
  { name: 'Explorar Isla', skillName: 'Truco',         skillEffect: 'DESTROY_AGING',    hazardGreen: 1, hazardYellow: 3, hazardRed: 6,  freeCards: 2, survivorValue: 1, imageFile: 'carta_07_05.png' },
  { name: 'Explorar Isla', skillName: 'Repetición',    skillEffect: 'DOUBLE',           hazardGreen: 1, hazardYellow: 3, hazardRed: 6,  freeCards: 2, survivorValue: 1, imageFile: 'carta_07_06.png' },
  // ── Con la balsa al naufragio (verde:0 / amarillo:0 / rojo:3, gratis:1) ──
  { name: 'Con la balsa al naufragio', skillName: 'Estrategia',   skillEffect: 'SWAP_2',           hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_01_07.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Equipamiento', skillEffect: null,               hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_01_08.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Equipamiento', skillEffect: null,               hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_01_09.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Conocimiento', skillEffect: 'DESTROY_IN_FIGHT', hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_01_10.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Truco',        skillEffect: 'DESTROY_AGING',    hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_02_01.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Lectura',      skillEffect: 'STEP_BACK',        hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_02_02.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Estrategia',   skillEffect: 'SWAP_2',           hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_06_04.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Nutrición',    skillEffect: 'NUTRITION_1',      hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_06_05.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Nutrición',    skillEffect: 'NUTRITION_1',      hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_06_06.png' },
  { name: 'Con la balsa al naufragio', skillName: 'Mimetismo',    skillEffect: 'COPY',             hazardGreen: 0, hazardYellow: 0, hazardRed: 3, freeCards: 1, survivorValue: 0, imageFile: 'carta_06_07.png' },
  // ── Animales Salvajes (verde:3 / amarillo:6 / rojo:11, gratis:4) ──
  { name: 'Animales Salvajes', skillName: 'Visión',       skillEffect: 'SORT_3',           hazardGreen: 3, hazardYellow: 6, hazardRed: 11, freeCards: 4, survivorValue: 3, imageFile: 'carta_06_08.png' },
  { name: 'Animales Salvajes', skillName: 'Experiencia',  skillEffect: 'EXTRA_CARD',       hazardGreen: 3, hazardYellow: 6, hazardRed: 11, freeCards: 4, survivorValue: 3, imageFile: 'carta_06_09.png' },
  { name: 'Animales Salvajes', skillName: 'Conocimiento', skillEffect: 'DESTROY_IN_FIGHT', hazardGreen: 3, hazardYellow: 6, hazardRed: 11, freeCards: 4, survivorValue: 3, imageFile: 'carta_06_10.png' },
  { name: 'Animales Salvajes', skillName: 'Estrategia',   skillEffect: 'SWAP_2',           hazardGreen: 3, hazardYellow: 6, hazardRed: 11, freeCards: 4, survivorValue: 3, imageFile: 'carta_07_09.png' },
  // ── Caníbales (verde:4 / amarillo:6 / rojo:11, gratis:5) ──
  { name: 'Caníbales', skillName: 'Arma', skillEffect: null, hazardGreen: 4, hazardYellow: 6, hazardRed: 11, freeCards: 5, survivorValue: 4, imageFile: 'carta_07_07.png' },
  { name: 'Caníbales', skillName: 'Arma', skillEffect: null, hazardGreen: 4, hazardYellow: 6, hazardRed: 11, freeCards: 5, survivorValue: 4, imageFile: 'carta_07_08.png' },
];

const AGING_MILD_DEFS: Array<Omit<RobinsonCard, 'id'>> = [
  { type: 'AGING', name: 'Desconcentrado', value: -1, agingEffect: 'MINUS_1' },
  { type: 'AGING', name: 'Desconcentrado', value: -1, agingEffect: 'MINUS_1' },
  { type: 'AGING', name: 'Muy Estúpido',   value: -2, agingEffect: 'MINUS_2' },
  { type: 'AGING', name: 'Muy Estúpido',   value: -2, agingEffect: 'MINUS_2' },
  { type: 'AGING', name: 'Asustado',       value:  0, agingEffect: 'HIGHEST_ZERO' },
  { type: 'AGING', name: 'Asustado',       value:  0, agingEffect: 'HIGHEST_ZERO' },
  { type: 'AGING', name: 'Muy cansado',    value:  0, agingEffect: 'STOP', canDestroy: true },
];

const AGING_SEVERE_DEFS: Array<Omit<RobinsonCard, 'id'>> = [
  { type: 'AGING', name: 'Hambriento',     value: -1, agingEffect: 'MINUS_1' },
  { type: 'AGING', name: 'Muy hambriento', value: -2, agingEffect: 'MINUS_2' },
  { type: 'AGING', name: 'Suicida',        value: -5, agingEffect: 'MINUS_1' },
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

function clampLife(s: ViernesGameState): void {
  s.lifePoints = Math.min(Math.max(0, s.lifePoints), s.maxLifePoints);
}

// ─── Inicialización ───────────────────────────────────────────────────────────

export function createInitialState(difficulty: Difficulty): ViernesGameState {
  const startingLife = STARTING_LIFE_BY_DIFFICULTY[difficulty];

  const robinsonCards: RobinsonCard[] = [
    { id: makeId('rob', 0),  type: 'GENIUS'     as const, name: 'Genial',         value: 2 },
    ...Array.from({ length: 3  }, (_, i) => ({ id: makeId('rob', 1 + i),  type: 'SATISFIED'  as const, name: 'Concentrado',   value: 1 })),
    ...Array.from({ length: 8  }, (_, i) => ({ id: makeId('rob', 4 + i),  type: 'MISFORTUNE' as const, name: 'Normal',        value: 0 })),
    ...Array.from({ length: 5  }, (_, i) => ({ id: makeId('rob', 12 + i), type: 'MISFORTUNE' as const, name: 'Desconcentrado', value: -1 })),
    { id: makeId('rob', 17), type: 'FOOD' as const, name: 'Comiendo', value: 0, skillEffect: 'FOOD_2' },
  ];

  const hazardCards: HazardCard[] = HAZARD_DEFS.map((def, i) => ({ id: makeId('hz', i), ...def }));
  const hazardDeck = shuffleArray(hazardCards);

  const card1 = hazardDeck.shift()!;
  const card2 = hazardDeck.shift()!;

  const agingDeck: RobinsonCard[] = [
    ...shuffleArray(AGING_MILD_DEFS.map((def, i) => ({ id: makeId('age-mild', i), ...def }))),
    ...shuffleArray(AGING_SEVERE_DEFS.map((def, i) => ({ id: makeId('age-sev', i), ...def }))),
  ];

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
    phaseBeforeSkill: null,
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

// Devuelve el label de una habilidad para mostrar en UI
export function skillEffectLabel(effect: SkillEffect): string {
  switch (effect) {
    case 'FOOD_2':           return '+2 vida';
    case 'NUTRITION_1':      return '+1 vida';
    case 'EXTRA_CARD':       return '+1 carta gratis';
    case 'DESTROY_AGING':    return 'Destruye aging';
    case 'DESTROY_IN_FIGHT': return '1x Destruir carta';
    case 'COPY':             return '1x Copiar valor';
    case 'SWAP_1':           return '1x Cambiar carta';
    case 'SWAP_2':           return '2x Cambiar carta';
    case 'DOUBLE':           return '1x Doblar valor';
    case 'SORT_3':           return 'Ordenar 3 cartas';
    case 'STEP_BACK':        return '-1 Paso dificultad';
  }
}

// ─── Helpers internos ─────────────────────────────────────────────────────────

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

// Aplica habilidades automáticas al robar una carta. Devuelve true si se debe
// pausar para una habilidad interactiva (SKILL_PENDING).
function applyCardDrawEffect(
  s: ViernesGameState,
  card: RobinsonCard,
  isFreeDraw: boolean
): boolean {
  const effect = card.skillEffect;
  if (!effect) return false;

  switch (effect) {
    case 'FOOD_2':
      s.lifePoints += 2;
      clampLife(s);
      return false;

    case 'NUTRITION_1':
      s.lifePoints += 1;
      clampLife(s);
      return false;

    case 'EXTRA_CARD':
      // Robamos 1 carta extra inmediatamente (recursiva, 1 nivel)
      drawForFight(s, 1, isFreeDraw);
      return false;

    case 'DESTROY_AGING':
      // Destruye automáticamente la carta superior del mazo de aging
      if (s.agingDeck.length > 0) {
        const destroyed = s.agingDeck.shift()!;
        s.destroyedCards.push(destroyed);
      }
      return false;

    case 'STEP_BACK':
      // Retrocede un paso de dificultad si no estamos ya en GREEN
      if (s.step === 'RED') {
        s.step = 'YELLOW';
        s.hazardClearCount = Math.max(0, s.hazardClearCount - 1);
      } else if (s.step === 'YELLOW') {
        s.step = 'GREEN';
        s.hazardClearCount = Math.max(0, s.hazardClearCount - 1);
      }
      return false;

    // Habilidades interactivas — pausan el combate
    case 'DESTROY_IN_FIGHT':
    case 'COPY':
    case 'SWAP_1':
    case 'SWAP_2':
    case 'DOUBLE':
    case 'SORT_3': {
      const pendingType = effect as PendingSkillType;
      s.currentFight!.pendingSkill = {
        type: pendingType,
        triggerCardId: card.id,
        swapsLeft: effect === 'SWAP_2' ? 2 : effect === 'SWAP_1' ? 1 : undefined,
        sortCandidates: effect === 'SORT_3' ? s.robinsonDeck.slice(0, 3) : undefined,
      };
      s.phaseBeforeSkill = s.phase as 'HAZARD_FIGHT' | 'PIRATE_FIGHT';
      s.phase = 'SKILL_PENDING';
      return true;
    }
  }
}

function drawForFight(s: ViernesGameState, count: number, isFreeDraw: boolean): ViernesGameState {
  for (let i = 0; i < count; i++) {
    if (isFreeDraw && s.currentFight!.stoppedByAging) break;
    // Si una habilidad interactiva ha pausado el combate, paramos
    if (s.phase === 'SKILL_PENDING') break;

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

    // Envejecimiento STOP — siempre tiene prioridad
    if (isFreeDraw && card.type === 'AGING' && card.agingEffect === 'STOP') {
      s.currentFight!.stoppedByAging = true;
      break;
    }

    // Habilidades especiales
    const paused = applyCardDrawEffect(s, card, isFreeDraw);
    if (paused) break;
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
    case 'SKILL_DESTROY':       return handleSkillDestroy(s, action);
    case 'SKILL_COPY':          return handleSkillCopy(s, action);
    case 'SKILL_SWAP':          return handleSkillSwap(s, action);
    case 'SKILL_DOUBLE':        return handleSkillDouble(s, action);
    case 'SKILL_SORT':          return handleSkillSort(s, action);
    case 'SKILL_SKIP':          return handleSkillSkip(s);
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
    pendingSkill: null,
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
  if (s.phase === 'SKILL_PENDING') return { success: false, error: 'Hay una habilidad pendiente de resolver' };

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

// ─── DESTROY_CARD (en derrota) ────────────────────────────────────────────────

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
  if (s.phase === 'SKILL_PENDING') return { success: false, error: 'Hay una habilidad pendiente de resolver' };

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
      skillEffect: hazard.skillEffect ?? undefined,
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
    pendingSkill: null,
  };
  s.phase = 'PIRATE_FIGHT';
  return drawForFight(s, pirate.freeCards, true);
}

// ─── HABILIDADES INTERACTIVAS ─────────────────────────────────────────────────

function requireSkillPending(s: ViernesGameState, expectedType: PendingSkillType): string | null {
  if (s.phase !== 'SKILL_PENDING' || !s.currentFight?.pendingSkill) {
    return 'No hay habilidad pendiente';
  }
  if (s.currentFight.pendingSkill.type !== expectedType) {
    return `La habilidad activa no es ${expectedType}`;
  }
  return null;
}

function resumeFightPhase(s: ViernesGameState): void {
  s.phase = s.phaseBeforeSkill ?? 'HAZARD_FIGHT';
  s.phaseBeforeSkill = null;
  s.currentFight!.pendingSkill = null;
}

// SKILL_DESTROY — destruye 1 carta de drawnCards (igual que en derrota pero sin coste)
function handleSkillDestroy(
  s: ViernesGameState,
  action: Extract<ViernesAction, { type: 'SKILL_DESTROY' }>
): ActionResult {
  const err = requireSkillPending(s, 'DESTROY_IN_FIGHT');
  if (err) return { success: false, error: err };

  const idx = s.currentFight!.drawnCards.findIndex(c => c.id === action.cardId);
  if (idx === -1) return { success: false, error: 'Carta no encontrada' };

  const removed = s.currentFight!.drawnCards.splice(idx, 1);
  if (removed[0]) s.destroyedCards.push(removed[0]);

  resumeFightPhase(s);
  return { success: true, newState: maybeFinishPirateFightIfBlocked(s) };
}

// SKILL_COPY — copia el valor de una carta de drawnCards a la carta trigger
function handleSkillCopy(
  s: ViernesGameState,
  action: Extract<ViernesAction, { type: 'SKILL_COPY' }>
): ActionResult {
  const err = requireSkillPending(s, 'COPY');
  if (err) return { success: false, error: err };

  const fight = s.currentFight!;
  const triggerId = fight.pendingSkill!.triggerCardId;

  // No puede copiarse a sí misma
  if (action.cardId === triggerId) {
    return { success: false, error: 'No puedes copiar el valor de la propia carta' };
  }

  const source = fight.drawnCards.find(c => c.id === action.cardId);
  if (!source) return { success: false, error: 'Carta fuente no encontrada' };

  const trigger = fight.drawnCards.find(c => c.id === triggerId);
  if (!trigger) return { success: false, error: 'Carta Mimetismo no encontrada' };

  trigger.value = source.value;

  resumeFightPhase(s);
  return { success: true, newState: maybeFinishPirateFightIfBlocked(s) };
}

// SKILL_SWAP — devuelve una carta al mazo y roba otra
function handleSkillSwap(
  s: ViernesGameState,
  action: Extract<ViernesAction, { type: 'SKILL_SWAP' }>
): ActionResult {
  const skill = s.currentFight?.pendingSkill;
  if (s.phase !== 'SKILL_PENDING' || !skill) {
    return { success: false, error: 'No hay habilidad pendiente' };
  }
  if (skill.type !== 'SWAP_1' && skill.type !== 'SWAP_2') {
    return { success: false, error: 'La habilidad activa no es SWAP' };
  }

  const fight = s.currentFight!;
  const idx = fight.drawnCards.findIndex(c => c.id === action.cardId);
  if (idx === -1) return { success: false, error: 'Carta no encontrada' };

  // Devolver la carta elegida al descarte (no al mazo para no volver a robarla)
  const [returned] = fight.drawnCards.splice(idx, 1);
  if (returned) s.robinsonDiscard.push(returned);

  // Robar una nueva carta sin coste de vida
  const prevPhase = s.phaseBeforeSkill;
  s.phase = prevPhase ?? 'HAZARD_FIGHT'; // restaurar temporalmente para que drawForFight funcione
  s.phaseBeforeSkill = null;
  fight.pendingSkill = null;
  drawForFight(s, 1, true);

  // Si aún quedan swaps, reactivar la habilidad (SWAP_2 permite 2 intercambios)
  const swapsLeft = (skill.swapsLeft ?? 1) - 1;
  if (swapsLeft > 0 && (s.phase as GamePhase) !== 'SKILL_PENDING') {
    fight.pendingSkill = { ...skill, swapsLeft };
    s.phase = 'SKILL_PENDING';
    s.phaseBeforeSkill = prevPhase;
  }

  return { success: true, newState: maybeFinishPirateFightIfBlocked(s) };
}

// SKILL_DOUBLE — dobla el valor de una carta en drawnCards
function handleSkillDouble(
  s: ViernesGameState,
  action: Extract<ViernesAction, { type: 'SKILL_DOUBLE' }>
): ActionResult {
  const err = requireSkillPending(s, 'DOUBLE');
  if (err) return { success: false, error: err };

  const fight = s.currentFight!;
  const triggerId = fight.pendingSkill!.triggerCardId;

  if (action.cardId === triggerId) {
    return { success: false, error: 'No puedes doblar el valor de la propia carta' };
  }

  const target = fight.drawnCards.find(c => c.id === action.cardId);
  if (!target) return { success: false, error: 'Carta no encontrada' };

  target.value = target.value * 2;

  resumeFightPhase(s);
  return { success: true, newState: maybeFinishPirateFightIfBlocked(s) };
}

// SKILL_SORT — el jugador envía los IDs en el orden deseado
function handleSkillSort(
  s: ViernesGameState,
  action: Extract<ViernesAction, { type: 'SKILL_SORT' }>
): ActionResult {
  const err = requireSkillPending(s, 'SORT_3');
  if (err) return { success: false, error: err };

  const candidates = s.currentFight!.pendingSkill!.sortCandidates ?? [];
  if (action.orderedIds.length !== candidates.length) {
    return { success: false, error: 'Número de cartas incorrecto' };
  }

  // Validar que los IDs corresponden exactamente a los candidatos
  const candidateIds = new Set(candidates.map(c => c.id));
  if (!action.orderedIds.every(id => candidateIds.has(id))) {
    return { success: false, error: 'IDs de cartas inválidos' };
  }

  // Reconstruir el mazo con las 3 primeras en el orden elegido
  const reordered = action.orderedIds.map(id => candidates.find(c => c.id === id)!);
  s.robinsonDeck = [...reordered, ...s.robinsonDeck.slice(candidates.length)];

  resumeFightPhase(s);
  return { success: true, newState: maybeFinishPirateFightIfBlocked(s) };
}

// SKILL_SKIP — descarta la habilidad sin usarla
function handleSkillSkip(s: ViernesGameState): ActionResult {
  if (s.phase !== 'SKILL_PENDING' || !s.currentFight?.pendingSkill) {
    return { success: false, error: 'No hay habilidad pendiente' };
  }

  resumeFightPhase(s);
  return { success: true, newState: maybeFinishPirateFightIfBlocked(s) };
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

// ─── Export helpers para UI ───────────────────────────────────────────────────

export { SKILL_EFFECT_BY_NAME };
