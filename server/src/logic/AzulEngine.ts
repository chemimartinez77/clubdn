/**
 * AzulEngine.ts
 * Lógica pura del juego Azul — sin dependencias de DB ni framework.
 * Implementa reglas oficiales: Fase de Oferta, Fase de Mosaico y puntuación por adyacencia.
 */

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type TileColor = 'BLUE' | 'YELLOW' | 'RED' | 'BLACK' | 'TEAL';
export type TileOrNull = TileColor | null;

export interface PlayerState {
  id: string;
  /** 5 líneas de patrón. patternLines[0] tiene capacidad 1, patternLines[4] tiene capacidad 5. */
  patternLines: TileOrNull[][];
  /** Pared 5x5. wall[row][col] = color si está colocado, null si vacío. */
  wall: TileOrNull[][];
  /** Línea de suelo (penalizaciones). Máximo 7 fichas. */
  floor: TileColor[];
  /** true si este jugador tiene el marcador de primer jugador en su suelo */
  hasFirstPlayerMarker: boolean;
  score: number;
}

export interface GameState {
  /** 5 fábricas, cada una con 4 azulejos al inicio de la ronda. */
  factories: TileColor[][];
  /** Centro de mesa. Empieza vacío cada ronda. */
  center: TileColor[];
  /** true mientras el marcador de primera persona esté en el centro */
  firstPlayerMarkerInCenter: boolean;
  players: PlayerState[];
  /** Bolsa de azulejos (96 totales: 20 de cada color). */
  bag: TileColor[];
  /** Caja de descarte (azulejos puntuados se regresan aquí al final). */
  discardBox: TileColor[];
  phase: 'OFFER' | 'WALL_TILING' | 'FINISHED';
  /** Índice del jugador activo (0 o 1) */
  turnIndex: number;
  /** Índice del jugador que comenzó esta ronda */
  roundStartPlayerIndex: number;
  round: number;
}

export interface MovePayload {
  /** 'factory' | 'center' */
  source: 'factory' | 'center';
  /** Índice de la fábrica (0-4). Ignorado si source === 'center'. */
  factoryIndex?: number;
  color: TileColor;
  /** Índice de línea de patrón destino (0-4) o -1 para ir directo al suelo. */
  patternLineIndex: number;
}

export interface MoveResult {
  success: boolean;
  error?: string;
  newState?: GameState;
  gameOver?: boolean;
  winnerIndex?: number;
}

export interface ScoringResult {
  pointsAwarded: number;
}

// ─── Disposición oficial de la pared ──────────────────────────────────────────
// wall[row] indica el color que ocupa cada columna en esa fila.
const WALL_PATTERN: TileColor[][] = [
  ['BLUE',   'YELLOW', 'RED',    'BLACK',  'TEAL'],
  ['TEAL',   'BLUE',   'YELLOW', 'RED',    'BLACK'],
  ['BLACK',  'TEAL',   'BLUE',   'YELLOW', 'RED'],
  ['RED',    'BLACK',  'TEAL',   'BLUE',   'YELLOW'],
  ['YELLOW', 'RED',    'BLACK',  'TEAL',   'BLUE'],
];

/** Devuelve la columna en la que un color dado debe ir en la fila indicada. */
export function wallColumnForColor(row: number, color: TileColor): number {
  const idx = WALL_PATTERN[row]?.indexOf(color);
  return idx !== undefined ? idx : -1;
}

/** Devuelve el color que debe ir en wall[row][col] según el patrón oficial. */
export function wallPatternColor(row: number, col: number): TileColor {
  return WALL_PATTERN[row]?.[col] ?? 'BLUE';
}

// ─── Penalizaciones del suelo ─────────────────────────────────────────────────
const FLOOR_PENALTIES = [-1, -1, -2, -2, -2, -3, -3];

// ─── Inicialización ───────────────────────────────────────────────────────────

function createFullBag(): TileColor[] {
  const colors: TileColor[] = ['BLUE', 'YELLOW', 'RED', 'BLACK', 'TEAL'];
  const bag: TileColor[] = [];
  for (const color of colors) {
    for (let i = 0; i < 20; i++) bag.push(color);
  }
  return shuffleArray(bag);
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j] as T;
    a[j] = tmp as T;
  }
  return a;
}

function emptyWall(): TileOrNull[][] {
  return Array.from({ length: 5 }, () => Array<TileOrNull>(5).fill(null));
}

function emptyPatternLines(): TileOrNull[][] {
  return Array.from({ length: 5 }, (_, i) => Array<TileOrNull>(i + 1).fill(null));
}

function createPlayerState(id: string): PlayerState {
  return {
    id,
    patternLines: emptyPatternLines(),
    wall: emptyWall(),
    floor: [],
    hasFirstPlayerMarker: false,
    score: 0,
  };
}

/**
 * Crea el estado inicial de una partida nueva para 2-4 jugadores.
 * El número de fábricas sigue la regla oficial: 2N+1 (5, 7 ó 9).
 */
export function createInitialState(...playerIds: string[]): GameState {
  const n = playerIds.length;
  if (n < 2 || n > 4) throw new Error('Azul requiere entre 2 y 4 jugadores.');
  const numFactories = 2 * n + 1;
  const bag = createFullBag();
  const state: GameState = {
    factories: Array.from({ length: numFactories }, () => [] as TileColor[]),
    center: [],
    firstPlayerMarkerInCenter: true,
    players: playerIds.map(id => createPlayerState(id)),
    bag,
    discardBox: [],
    phase: 'OFFER',
    turnIndex: 0,
    roundStartPlayerIndex: 0,
    round: 1,
  };
  return fillFactories(state);
}

/** Rellena las 5 fábricas tomando 4 azulejos de la bolsa cada una. */
function fillFactories(state: GameState): GameState {
  const s = deepClone(state);
  for (let f = 0; f < 5; f++) {
    s.factories[f] = [];
    for (let t = 0; t < 4; t++) {
      if (s.bag.length === 0) {
        // Reutilizar la caja de descarte como bolsa
        s.bag = shuffleArray(s.discardBox);
        s.discardBox = [];
      }
      const tile = s.bag.pop();
      if (tile !== undefined) {
        s.factories[f]!.push(tile);
      }
    }
  }
  return s;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

/** Comprueba si todas las fábricas y el centro están vacíos (fin de ronda de oferta). */
function isOfferPhaseOver(state: GameState): boolean {
  const allFactoriesEmpty = state.factories.every(f => f.length === 0);
  const centerEmpty = state.center.length === 0 && !state.firstPlayerMarkerInCenter;
  return allFactoriesEmpty && centerEmpty;
}

/** Devuelve true si el jugador ya tiene ese color en la fila correspondiente de la pared. */
function colorAlreadyOnWall(player: PlayerState, row: number, color: TileColor): boolean {
  const col = wallColumnForColor(row, color);
  if (col === -1) return false;
  return player.wall[row]?.[col] !== null;
}

// ─── Aplicar Movimiento ───────────────────────────────────────────────────────

/**
 * Valida y aplica un movimiento de selección de azulejos.
 * Devuelve el nuevo estado o un error descriptivo.
 */
export function applyMove(state: GameState, playerIndex: number, move: MovePayload): MoveResult {
  if (state.phase !== 'OFFER') {
    return { success: false, error: 'No es la fase de oferta.' };
  }
  if (state.turnIndex !== playerIndex) {
    return { success: false, error: 'No es tu turno.' };
  }

  let s = deepClone(state);
  const player = s.players[playerIndex];
  if (!player) return { success: false, error: 'Jugador no encontrado.' };

  // ── 1. Extraer azulejos del origen ────────────────────────────────────────
  let takenTiles: TileColor[] = [];

  if (move.source === 'factory') {
    const fi = move.factoryIndex ?? -1;
    const factory = s.factories[fi];
    if (fi < 0 || fi >= s.factories.length || !factory || factory.length === 0) {
      return { success: false, error: 'Fábrica inválida o vacía.' };
    }
    const colorCount = factory.filter(t => t === move.color).length;
    if (colorCount === 0) {
      return { success: false, error: `No hay azulejos de color ${move.color} en esa fábrica.` };
    }
    takenTiles = factory.filter(t => t === move.color);
    const leftoverTiles = factory.filter(t => t !== move.color);
    s.factories[fi] = [];
    s.center.push(...leftoverTiles);
  } else {
    // source === 'center'
    const colorCount = s.center.filter(t => t === move.color).length;
    if (colorCount === 0) {
      return { success: false, error: `No hay azulejos de color ${move.color} en el centro.` };
    }
    takenTiles = s.center.filter(t => t === move.color);
    s.center = s.center.filter(t => t !== move.color);
    if (s.firstPlayerMarkerInCenter) {
      s.firstPlayerMarkerInCenter = false;
      player.hasFirstPlayerMarker = true;
    }
  }

  if (takenTiles.length === 0) {
    return { success: false, error: 'No se encontraron azulejos para tomar.' };
  }

  // ── 2. Colocar azulejos en la línea de patrón ─────────────────────────────
  const lineIdx = move.patternLineIndex;

  if (lineIdx === -1) {
    // Destino: directo al suelo
    addToFloor(player, takenTiles);
  } else {
    if (lineIdx < 0 || lineIdx > 4) {
      return { success: false, error: 'Índice de línea de patrón inválido.' };
    }

    const line = player.patternLines[lineIdx];
    if (!line) return { success: false, error: 'Línea de patrón no encontrada.' };

    const capacity = lineIdx + 1;

    // Validación: ¿la línea ya tiene otro color?
    const existingColor = line.find(t => t !== null);
    if (existingColor && existingColor !== move.color) {
      return { success: false, error: 'Esa línea ya contiene otro color.' };
    }

    // Validación: ¿ese color ya está en la fila de la pared?
    if (colorAlreadyOnWall(player, lineIdx, move.color)) {
      return { success: false, error: 'Ese color ya está colocado en la pared para esa fila.' };
    }

    const filled = line.filter(t => t !== null).length;
    const free = capacity - filled;

    if (takenTiles.length <= free) {
      for (let i = filled; i < filled + takenTiles.length; i++) {
        line[i] = move.color;
      }
    } else {
      for (let i = filled; i < capacity; i++) {
        line[i] = move.color;
      }
      const overflowTiles = takenTiles.slice(free);
      addToFloor(player, overflowTiles);
    }
  }

  // ── 3. Avanzar turno ──────────────────────────────────────────────────────
  if (isOfferPhaseOver(s)) {
    s.phase = 'WALL_TILING';
    const result = applyWallTilingPhase(s);
    const gameOver = result.phase === 'FINISHED';
    return {
      success: true,
      newState: result,
      gameOver,
      winnerIndex: gameOver ? getWinnerIndex(result) : undefined,
    };
  } else {
    s.turnIndex = (s.turnIndex + 1) % s.players.length;
  }

  return { success: true, newState: s };
}

/** Añade tiles al suelo del jugador (máx 7), el exceso se descarta silenciosamente. */
function addToFloor(player: PlayerState, tiles: TileColor[]): void {
  for (const tile of tiles) {
    if (player.floor.length < 7) {
      player.floor.push(tile);
    }
    // El exceso va a la caja de descarte (manejado en la fase de mosaico)
  }
}

// ─── Fase de Mosaico ──────────────────────────────────────────────────────────

/**
 * Aplica la fase de colocación en la pared para todos los jugadores.
 * Calcula puntos, limpia líneas completas, penaliza el suelo y prepara la siguiente ronda.
 */
function applyWallTilingPhase(state: GameState): GameState {
  const s = deepClone(state);

  for (const player of s.players) {
    // Colocar azulejos de líneas completas en la pared
    for (let row = 0; row < 5; row++) {
      const line = player.patternLines[row];
      if (!line) continue;
      const capacity = row + 1;
      const isFull = line.every(t => t !== null);

      if (isFull) {
        const color = line[0] as TileColor;
        const col = wallColumnForColor(row, color);
        if (col === -1) continue;

        // Colocar en la pared
        const wallRow = player.wall[row];
        if (wallRow) wallRow[col] = color;

        // Calcular puntos por adyacencia
        const { pointsAwarded } = scoreAdjacency(player.wall, row, col);
        player.score = Math.max(0, player.score + pointsAwarded);

        // Los azulejos restantes de la línea (excepto el que va a la pared) van a la caja
        const discardCount = capacity - 1;
        for (let i = 0; i < discardCount; i++) {
          s.discardBox.push(color);
        }

        // Limpiar la línea de patrón
        player.patternLines[row] = Array<TileOrNull>(capacity).fill(null);
      }
    }

    // Penalización por suelo
    const floorPenalty = calculateFloorPenalty(player.floor);
    player.score = Math.max(0, player.score + floorPenalty);

    // Los azulejos del suelo van a la caja de descarte
    for (const tile of player.floor) {
      s.discardBox.push(tile);
    }
    player.floor = [];
    player.hasFirstPlayerMarker = false;
  }

  // ── Determinar si el juego termina ────────────────────────────────────────
  const gameOver = s.players.some(p => hasCompleteRow(p.wall));

  if (gameOver) {
    for (const player of s.players) {
      player.score += calculateEndGameBonus(player.wall);
    }
    s.phase = 'FINISHED';
    return s;
  }

  // ── Preparar siguiente ronda ──────────────────────────────────────────────
  // El jugador que tomó el marcador inicia la siguiente ronda
  const nextStartIdx = s.players.findIndex(p => p.hasFirstPlayerMarker);
  const nextStart = nextStartIdx >= 0 ? nextStartIdx : (s.roundStartPlayerIndex + 1) % s.players.length;
  s.roundStartPlayerIndex = nextStart;
  s.turnIndex = nextStart;
  s.round++;
  s.phase = 'OFFER';
  s.firstPlayerMarkerInCenter = true;

  return fillFactories(s);
}

// ─── Puntuación por Adyacencia ────────────────────────────────────────────────

/**
 * Calcula los puntos que se ganan al colocar un azulejo en wall[row][col].
 *
 * Reglas oficiales:
 * - Si el azulejo no tiene adyacentes (ni H ni V), vale 1 punto.
 * - Si tiene adyacentes horizontales: cuenta la cadena horizontal completa (incluido él).
 * - Si tiene adyacentes verticales: cuenta la cadena vertical completa (incluido él).
 * - Si tiene ambos, suma ambas cadenas (el azulejo propio se cuenta en cada eje).
 */
export function scoreAdjacency(
  wall: TileOrNull[][],
  row: number,
  col: number
): ScoringResult {
  const hChain = countChain(wall, row, col, 0, 1) + countChain(wall, row, col, 0, -1) + 1;
  const vChain = countChain(wall, row, col, 1, 0) + countChain(wall, row, col, -1, 0) + 1;

  const wallRow = wall[row];
  const hasHorizontalNeighbor =
    (wallRow && col + 1 < 5 && wallRow[col + 1] !== null) ||
    (wallRow && col - 1 >= 0 && wallRow[col - 1] !== null);
  const hasVerticalNeighbor =
    (row + 1 < 5 && wall[row + 1]?.[col] !== null) ||
    (row - 1 >= 0 && wall[row - 1]?.[col] !== null);

  let points = 0;
  if (!hasHorizontalNeighbor && !hasVerticalNeighbor) {
    points = 1;
  } else {
    if (hasHorizontalNeighbor) points += hChain;
    if (hasVerticalNeighbor) points += vChain;
  }

  return { pointsAwarded: points };
}

/**
 * Cuenta azulejos contiguos en una dirección (dRow, dCol) desde (row, col).
 * No incluye la celda de origen.
 */
function countChain(
  wall: TileOrNull[][],
  row: number,
  col: number,
  dRow: number,
  dCol: number
): number {
  let count = 0;
  let r = row + dRow;
  let c = col + dCol;
  while (r >= 0 && r < 5 && c >= 0 && c < 5 && wall[r]?.[c] !== null) {
    count++;
    r += dRow;
    c += dCol;
  }
  return count;
}

// ─── Penalización del Suelo ───────────────────────────────────────────────────

export function calculateFloorPenalty(floor: TileColor[]): number {
  let total = 0;
  for (let i = 0; i < Math.min(floor.length, FLOOR_PENALTIES.length); i++) {
    total += FLOOR_PENALTIES[i] ?? 0;
  }
  return total;
}

// ─── Bonificaciones Finales ───────────────────────────────────────────────────

function hasCompleteRow(wall: TileOrNull[][]): boolean {
  return wall.some(row => row.every(cell => cell !== null));
}

/**
 * Calcula las bonificaciones de fin de partida:
 * +2 por cada fila completa
 * +7 por cada columna completa
 * +10 por cada color con las 5 instancias en la pared
 */
export function calculateEndGameBonus(wall: TileOrNull[][]): number {
  let bonus = 0;

  // Filas completas (+2 cada una)
  for (let row = 0; row < 5; row++) {
    const wallRow = wall[row];
    if (wallRow && wallRow.every(cell => cell !== null)) bonus += 2;
  }

  // Columnas completas (+7 cada una)
  for (let col = 0; col < 5; col++) {
    if (wall.every(row => row[col] !== null)) bonus += 7;
  }

  // 5 colores completos: las 5 casillas de cada color en la pared (+10 por color)
  const colors: TileColor[] = ['BLUE', 'YELLOW', 'RED', 'BLACK', 'TEAL'];
  for (const color of colors) {
    let count = 0;
    for (let row = 0; row < 5; row++) {
      const col = wallColumnForColor(row, color);
      if (col >= 0 && wall[row]?.[col] !== null) count++;
    }
    if (count === 5) bonus += 10;
  }

  return bonus;
}

// ─── Comprobación de fin de juego ─────────────────────────────────────────────

/** Devuelve true si algún jugador tiene al menos una fila de la pared completada. */
export function isGameOver(state: GameState): boolean {
  return state.phase === 'FINISHED';
}

/** Devuelve el índice del jugador ganador (el de mayor puntuación), o -1 en empate. Soporta 2-4 jugadores. */
export function getWinnerIndex(state: GameState): number {
  const scores = state.players.map(p => p.score);
  const maxScore = Math.max(...scores);
  const leaders = scores.reduce<number[]>((acc, s, i) => (s === maxScore ? [...acc, i] : acc), []);

  if (leaders.length === 1) return leaders[0]!;

  // Desempate: más filas completas
  const rows = state.players.map(p => p.wall.filter(r => r.every(c => c !== null)).length);
  const maxRows = Math.max(...leaders.map(i => rows[i]!));
  const rowLeaders = leaders.filter(i => rows[i] === maxRows);

  if (rowLeaders.length === 1) return rowLeaders[0]!;
  return -1; // Empate perfecto
}
