// client/src/logic/AzulMCTS.ts
import {
  applyMove,
  scoreAdjacency,
  calculateFloorPenalty,
  wallColumnForColor,
  type GameState,
  type MovePayload,
  type TileColor,
} from './AzulEngine';

// ─── Movimientos legales ──────────────────────────────────────────────────────

const COLORS: TileColor[] = ['BLUE', 'YELLOW', 'RED', 'BLACK', 'TEAL'];

export function getLegalMoves(state: GameState, playerIndex: number): MovePayload[] {
  const player = state.players[playerIndex];
  if (!player) return [];

  const moves: MovePayload[] = [];

  const addMovesForColor = (
    source: 'factory' | 'center',
    color: TileColor,
    factoryIndex?: number,
  ) => {
    // Suelo: siempre válido
    moves.push({ source, factoryIndex, color, patternLineIndex: -1 });

    for (let row = 0; row < 5; row++) {
      const line = player.patternLines[row];
      if (!line) continue;
      const capacity = row + 1;
      const filled = line.filter(t => t !== null).length;
      if (filled === capacity) continue; // línea llena

      const existingColor = line.find(t => t !== null);
      if (existingColor && existingColor !== color) continue; // otro color

      // Color ya en la pared para esa fila
      const col = wallColumnForColor(row, color);
      if (col >= 0 && player.wall[row]?.[col] !== null) continue;

      moves.push({ source, factoryIndex, color, patternLineIndex: row });
    }
  };

  // Fábricas
  state.factories.forEach((factory, fi) => {
    if (factory.length === 0) return;
    const uniqueColors = new Set(factory);
    for (const color of uniqueColors) {
      addMovesForColor('factory', color, fi);
    }
  });

  // Centro
  if (state.center.length > 0) {
    const centerColors = new Set(state.center.filter(t => COLORS.includes(t)));
    for (const color of centerColors) {
      addMovesForColor('center', color);
    }
  }

  return moves;
}

// ─── Función de recompensa ────────────────────────────────────────────────────

function evaluate(state: GameState, aiPlayerIndex: number): number {
  const aiPlayer = state.players[aiPlayerIndex];
  if (!aiPlayer) return 0;

  const rivals = state.players.filter((_, i) => i !== aiPlayerIndex);
  const maxRivalScore = rivals.length > 0 ? Math.max(...rivals.map(p => p.score)) : 0;

  let reward = aiPlayer.score - maxRivalScore;

  // Bonus adyacencia: +1 por cada vecino que tenga cada tile de la IA en la pared
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (aiPlayer.wall[r]?.[c] === null) continue;
      const wall = aiPlayer.wall;
      const wallRow = wall[r];
      const hasH =
        (wallRow && c + 1 < 5 && wallRow[c + 1] !== null) ||
        (wallRow && c - 1 >= 0 && wallRow[c - 1] !== null);
      const hasV =
        (r + 1 < 5 && wall[r + 1]?.[c] !== null) ||
        (r - 1 >= 0 && wall[r - 1]?.[c] !== null);
      if (hasH || hasV) {
        const { pointsAwarded } = scoreAdjacency(wall, r, c);
        reward += pointsAwarded * 0.1;
      }
    }
  }

  // Penalización suelo
  reward += calculateFloorPenalty(aiPlayer.floor);

  // Potencial endgame: filas/columnas/colores al ≥80%
  for (let r = 0; r < 5; r++) {
    const wallRow = aiPlayer.wall[r];
    if (!wallRow) continue;
    const filled = wallRow.filter(c => c !== null).length;
    if (filled >= 4) reward += 3;
  }
  for (let c = 0; c < 5; c++) {
    const filled = aiPlayer.wall.filter(row => row[c] !== null).length;
    if (filled >= 4) reward += 3;
  }
  const colors: TileColor[] = ['BLUE', 'YELLOW', 'RED', 'BLACK', 'TEAL'];
  for (const color of colors) {
    let count = 0;
    for (let r = 0; r < 5; r++) {
      const col = wallColumnForColor(r, color);
      if (col >= 0 && aiPlayer.wall[r]?.[col] !== null) count++;
    }
    if (count >= 4) reward += 3;
  }

  // Ficha de primer jugador
  if (aiPlayer.hasFirstPlayerMarker) reward += 0.5;

  return reward;
}

// ─── Playout hasta fin de ronda ───────────────────────────────────────────────

function simulate(state: GameState, aiPlayerIndex: number): number {
  let s = structuredClone(state) as GameState;
  const startRound = s.round;

  while (s.phase === 'OFFER' && s.round === startRound) {
    const moves = getLegalMoves(s, s.turnIndex);
    if (moves.length === 0) break;
    const move = moves[Math.floor(Math.random() * moves.length)]!;
    const result = applyMove(s, s.turnIndex, move);
    if (!result.success || !result.newState) break;
    s = result.newState;
  }

  return evaluate(s, aiPlayerIndex);
}

// ─── Árbol MCTS ───────────────────────────────────────────────────────────────

const EXPLORATION = Math.SQRT2;

class MCTSNode {
  state: GameState;
  move: MovePayload | null;
  parent: MCTSNode | null;
  children: MCTSNode[] = [];
  wins = 0;
  visits = 0;
  untriedMoves: MovePayload[];
  playerIndex: number; // jugador que mueve en este nodo

  constructor(state: GameState, playerIndex: number, move: MovePayload | null, parent: MCTSNode | null) {
    this.state = state;
    this.playerIndex = playerIndex;
    this.move = move;
    this.parent = parent;
    this.untriedMoves = getLegalMoves(state, state.turnIndex);
  }

  uct(): number {
    if (this.visits === 0) return Infinity;
    return this.wins / this.visits + EXPLORATION * Math.sqrt(Math.log(this.parent!.visits) / this.visits);
  }

  bestChild(): MCTSNode {
    return this.children.reduce((best, c) => (c.uct() > best.uct() ? c : best), this.children[0]!);
  }

  expand(aiPlayerIndex: number): MCTSNode {
    const move = this.untriedMoves.splice(Math.floor(Math.random() * this.untriedMoves.length), 1)[0]!;
    const result = applyMove(this.state, this.state.turnIndex, move);
    const newState = result.newState ?? this.state;
    const child = new MCTSNode(newState, aiPlayerIndex, move, this);
    this.children.push(child);
    return child;
  }
}

export function runMCTS(state: GameState, aiPlayerIndex: number, timeLimitMs = 1000): MovePayload {
  const root = new MCTSNode(structuredClone(state) as GameState, aiPlayerIndex, null, null);
  // Necesita un nodo padre ficticio para el cálculo UCT del nivel 1
  root.visits = 1;

  const deadline = Date.now() + timeLimitMs;

  while (Date.now() < deadline) {
    // 1. Select
    let node = root;
    while (node.untriedMoves.length === 0 && node.children.length > 0) {
      node = node.bestChild();
    }

    // 2. Expand
    if (node.untriedMoves.length > 0 && node.state.phase === 'OFFER') {
      node = node.expand(aiPlayerIndex);
    }

    // 3. Simulate
    const reward = simulate(node.state, aiPlayerIndex);

    // 4. Backpropagate
    let current: MCTSNode | null = node;
    while (current !== null) {
      current.visits++;
      current.wins += reward;
      current = current.parent;
    }
  }

  // Devolver el movimiento del hijo con más visitas
  if (root.children.length === 0) {
    // Fallback: primer movimiento legal
    return getLegalMoves(state, state.turnIndex)[0] ?? { source: 'center', color: 'BLUE', patternLineIndex: -1 };
  }

  const best = root.children.reduce((b, c) => (c.visits > b.visits ? c : b), root.children[0]!);
  return best.move!;
}
