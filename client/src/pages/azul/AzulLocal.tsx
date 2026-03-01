// client/src/pages/azul/AzulLocal.tsx
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  createInitialState,
  applyMove,
  getWinnerIndex,
  scoreAdjacency,
  calculateFloorPenalty,
  type GameState,
  type PlayerState,
  type TileColor,
  type TileOrNull,
  type MovePayload,
} from '../../logic/AzulEngine';

// ─── Constantes ───────────────────────────────────────────────────────────────

const TILE_STYLES: Record<TileColor, { bg: string; border: string; label: string; img: string }> = {
  BLUE:   { bg: '#3b82f6', border: '#1d4ed8', label: 'Azul',     img: '/azulejo-azul.png' },
  YELLOW: { bg: '#eab308', border: '#a16207', label: 'Amarillo', img: '/azulejo-amarillo.png' },
  RED:    { bg: '#ef4444', border: '#991b1b', label: 'Rojo',     img: '/azulejo-rojo.png' },
  BLACK:  { bg: '#374151', border: '#111827', label: 'Negro',    img: '/azulejo-negro.png' },
  TEAL:   { bg: '#14b8a6', border: '#0f766e', label: 'Turquesa', img: '/azulejo-teal.png' },
};

const FLOOR_PENALTIES = [-1, -1, -2, -2, -2, -3, -3];

const WALL_PATTERN: TileColor[][] = [
  ['BLUE',   'YELLOW', 'RED',    'BLACK',  'TEAL'],
  ['TEAL',   'BLUE',   'YELLOW', 'RED',    'BLACK'],
  ['BLACK',  'TEAL',   'BLUE',   'YELLOW', 'RED'],
  ['RED',    'BLACK',  'TEAL',   'BLUE',   'YELLOW'],
  ['YELLOW', 'RED',    'BLACK',  'TEAL',   'BLUE'],
];

const PLAYER_NAMES = ['Ana', 'Beto', 'Carlos', 'Diana'];

// Duración de cada paso de animación (un tile + su cadena + badge)
const STEP_DURATION_MS = 2200;
// Pausa entre pasos consecutivos antes de mostrar el siguiente
const STEP_GAP_MS = 300;

// ─── Tipos de animación ───────────────────────────────────────────────────────

interface TileScoringEvent {
  playerIndex: number;
  /** Celda recién colocada */
  newTile: { row: number; col: number };
  /** Celdas adyacentes que forman cadena (incluyendo newTile) */
  chain: { row: number; col: number }[];
  points: number;
}

// ─── Helpers de animación ─────────────────────────────────────────────────────

/**
 * Compara la pared antes y después de la fase de mosaico para un jugador,
 * y calcula los TileScoringEvents: qué tile es nuevo y cuántas celdas encadena.
 */
function computeScoringEvents(
  before: PlayerState,
  after: PlayerState,
  playerIndex: number
): TileScoringEvent[] {
  const events: TileScoringEvent[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const wasEmpty = before.wall[r]?.[c] === null;
      const isNowFilled = after.wall[r]?.[c] !== null;
      if (wasEmpty && isNowFilled) {
        // Celda recién colocada: calcular cadenas H y V
        const wall = after.wall;
        const hLeft  = countDir(wall, r, c, 0, -1);
        const hRight = countDir(wall, r, c, 0,  1);
        const vUp    = countDir(wall, r, c, -1, 0);
        const vDown  = countDir(wall, r, c,  1, 0);

        const chain: { row: number; col: number }[] = [{ row: r, col: c }];

        // Cadena horizontal
        if (hLeft > 0 || hRight > 0) {
          for (let cc = c - hLeft; cc <= c + hRight; cc++) {
            if (cc !== c) chain.push({ row: r, col: cc });
          }
        }
        // Cadena vertical
        if (vUp > 0 || vDown > 0) {
          for (let rr = r - vUp; rr <= r + vDown; rr++) {
            if (rr !== r) chain.push({ row: rr, col: c });
          }
        }

        const { pointsAwarded } = scoreAdjacency(after.wall, r, c);
        events.push({ playerIndex, newTile: { row: r, col: c }, chain, points: pointsAwarded });
      }
    }
  }
  return events;
}

function countDir(wall: TileOrNull[][], row: number, col: number, dr: number, dc: number): number {
  let n = 0, r = row + dr, c = col + dc;
  while (r >= 0 && r < 5 && c >= 0 && c < 5 && wall[r]?.[c] !== null) { n++; r += dr; c += dc; }
  return n;
}

// ─── Tile ─────────────────────────────────────────────────────────────────────

function Tile({
  color, faded = false, selected = false, selectable = false,
  onClick, size = 'md', animClass, animDelay,
}: {
  color: TileColor; faded?: boolean; selected?: boolean; selectable?: boolean;
  onClick?: () => void; size?: 'xs' | 'sm' | 'md' | 'lg'; animClass?: string; animDelay?: string;
}) {
  const s = TILE_STYLES[color];
  const px = size === 'xs' ? 20 : size === 'sm' ? 24 : size === 'lg' ? 64 : 32;
  return (
    <div
      onClick={selectable ? onClick : undefined}
      title={s.label}
      style={{
        width: px, height: px,
        borderRadius: 3,
        border: `2px solid ${selected ? '#fbbf24' : (faded ? `${s.bg}55` : s.border)}`,
        boxShadow: selected ? `0 0 0 3px #fbbf2466` : undefined,
        animationDelay: animDelay,
        // Imagen individual cuando está colocado; color sólido semitransparente si está vacío (faded)
        ...(faded ? { backgroundColor: `${s.bg}28` } : {
          backgroundImage: `url(${s.img})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }),
      }}
      className={[
        'relative transition-all duration-100 select-none overflow-hidden',
        selectable ? 'cursor-pointer hover:scale-110 hover:brightness-110' : '',
        selected ? 'scale-110' : '',
        animClass ?? '',
      ].join(' ')}
    />
  );
}

function EmptySlot({ size = 'md' }: { size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const dim = size === 'xs' ? 'w-5 h-5' : size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-16 h-16' : 'w-8 h-8';
  return <div className={`${dim} rounded-sm border-2 border-dashed border-gray-300/50`} />;
}

// ─── Wall con animaciones ─────────────────────────────────────────────────────

function Wall({
  wall, scoringEvents, playerIndex, compact = false, large = false, mobile = false,
}: {
  wall: TileOrNull[][];
  scoringEvents: TileScoringEvent[];
  playerIndex: number;
  compact?: boolean;
  large?: boolean;
  mobile?: boolean;
}) {
  const myEvents = scoringEvents.filter(e => e.playerIndex === playerIndex);
  const gap = mobile ? 'gap-0.5' : compact ? 'gap-0.5' : large ? 'gap-1.5' : 'gap-1';
  const tileSize = mobile ? 'xs' : compact ? 'sm' : large ? 'lg' : 'md';

  return (
    <div className={`flex flex-col ${gap}`}>
      {wall.map((row, r) => (
        <div key={r} className={`flex ${gap}`}>
          {row.map((cell, c) => {
            const patternColor = WALL_PATTERN[r]![c]!;
            const isNew = myEvents.some(e => e.newTile.row === r && e.newTile.col === c);
            const isChain = !isNew && myEvents.some(
              e => e.chain.some(ch => ch.row === r && ch.col === c)
            );
            const event = myEvents.find(e => e.newTile.row === r && e.newTile.col === c);

            return (
              <div key={c} className="relative">
                {cell ? (
                  <Tile
                    color={cell} size={tileSize}
                    animClass={isNew ? 'azul-tile-new' : isChain ? 'azul-tile-chain' : undefined}
                    animDelay={isChain ? '0.65s' : undefined}
                  />
                ) : (
                  <Tile color={patternColor} faded size={tileSize} />
                )}
                {event && event.points > 0 && (
                  <div
                    className="azul-score-pop absolute -top-1 -right-1 z-10 flex items-center justify-center rounded-full text-[10px] font-black text-white shadow-lg"
                    style={{
                      width: event.points >= 10 ? '20px' : '16px',
                      height: event.points >= 10 ? '20px' : '16px',
                      background: event.points >= 5
                        ? 'linear-gradient(135deg, #f59e0b, #ef4444)'
                        : 'linear-gradient(135deg, #22c55e, #16a34a)',
                      animationDelay: `${isNew ? 0.6 : 0}s`,
                    }}
                  >
                    +{event.points}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── PatternLines ─────────────────────────────────────────────────────────────

function PatternLines({
  lines, wall, selectedColor, onSelectLine, active, compact = false, large = false, mobile = false,
}: {
  lines: TileOrNull[][]; wall: TileOrNull[][];
  selectedColor: TileColor | null;
  onSelectLine: (i: number) => void; active: boolean;
  compact?: boolean;
  large?: boolean;
  mobile?: boolean;
}) {
  const gap = mobile ? 'gap-0.5' : compact ? 'gap-0.5' : large ? 'gap-1.5' : 'gap-1';
  const tileSize = mobile ? 'xs' : compact ? 'sm' : large ? 'lg' : 'md';
  return (
    <div className={`flex flex-col ${gap}`}>
      {lines.map((line, row) => {
        const capacity = row + 1;
        const existingColor = line.find(t => t !== null) as TileColor | undefined;
        const isFull = line.every(t => t !== null);
        const wallCol = selectedColor ? WALL_PATTERN[row]!.indexOf(selectedColor) : -1;
        const alreadyOnWall = wallCol >= 0 && wall[row]?.[wallCol] !== null;
        const isValidTarget =
          active && selectedColor !== null && !isFull && !alreadyOnWall &&
          (!existingColor || existingColor === selectedColor);

        return (
          <div
            key={row}
            onClick={() => isValidTarget && onSelectLine(row)}
            className={[
              `flex ${gap} justify-end items-center rounded px-1 transition-all`,
              mobile ? 'py-1.5' : 'py-0.5',
              isValidTarget
                ? 'cursor-pointer bg-yellow-400/15 ring-1 ring-yellow-400/60 hover:bg-yellow-400/25'
                : '',
            ].join(' ')}
          >
            {Array.from({ length: capacity }).map((_, i) =>
              line[i]
                ? <Tile key={i} color={line[i]!} size={tileSize} />
                : <EmptySlot key={i} size={tileSize} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Floor ────────────────────────────────────────────────────────────────────

function Floor({
  floor, hasMarker, selectedColor, onSelectFloor, active,
}: {
  floor: TileColor[]; hasMarker: boolean; selectedColor: TileColor | null;
  onSelectFloor: () => void; active: boolean;
}) {
  const penalty = calculateFloorPenalty(floor);
  const isTarget = active && selectedColor !== null;
  return (
    <div
      onClick={() => isTarget && onSelectFloor()}
      className={[
        'flex gap-1 items-center flex-wrap rounded px-2 py-1.5 min-h-10 border-2 border-dashed transition-all',
        isTarget
          ? 'cursor-pointer border-red-400/70 bg-red-50/50 hover:bg-red-100/60'
          : 'border-gray-200',
      ].join(' ')}
    >
      {hasMarker && (
        <div className="w-8 h-8 rounded-full border-2 border-yellow-400 bg-yellow-50 flex items-center justify-center text-xs font-bold text-yellow-700 shrink-0">
          1
        </div>
      )}
      {floor.map((tile, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <Tile color={tile} size="sm" />
          <span className="text-[9px] text-red-500 font-mono leading-none">{FLOOR_PENALTIES[i]}</span>
        </div>
      ))}
      {Array.from({ length: Math.max(0, 7 - floor.length - (hasMarker ? 1 : 0)) }).map((_, i) => {
        const slotIdx = floor.length + (hasMarker ? 1 : 0) + i;
        return (
          <div key={`e${i}`} className="flex flex-col items-center gap-0.5 opacity-35">
            <EmptySlot size="sm" />
            <span className="text-[9px] text-red-400 font-mono leading-none">{FLOOR_PENALTIES[slotIdx]}</span>
          </div>
        );
      })}
      {penalty < 0 && (
        <span className="ml-auto text-xs text-red-600 font-mono font-semibold shrink-0">{penalty}pts</span>
      )}
    </div>
  );
}

// ─── Factory ──────────────────────────────────────────────────────────────────

function Factory({
  tiles, index, selected, onSelect, disabled,
}: {
  tiles: TileColor[]; index: number;
  selected: { factoryIndex?: number; source: string; color: TileColor } | null;
  onSelect: (color: TileColor) => void; disabled: boolean;
}) {
  const colors = [...new Set(tiles)];
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-gray-400 font-mono">F{index + 1}</span>
      <div className="w-20 h-20 rounded-full border-2 border-gray-200 bg-white flex flex-wrap items-center justify-center gap-1 p-2 shadow">
        {tiles.length === 0 ? (
          <span className="text-[10px] text-gray-300">—</span>
        ) : colors.map(color => {
          const count = tiles.filter(t => t === color).length;
          const isSel = selected?.source === 'factory' && selected.factoryIndex === index && selected.color === color;
          return Array.from({ length: count }).map((_, i) => (
            <Tile key={`${color}-${i}`} color={color} selected={isSel}
              selectable={!disabled} onClick={() => onSelect(color)} size="sm" />
          ));
        })}
      </div>
    </div>
  );
}

// ─── PlayerPanel ─────────────────────────────────────────────────────────────

function PlayerPanel({
  state, name, isActive, isTurn, selectedColor,
  onSelectLine, onSelectFloor, scoringEvents, playerIndex,
  compact = false, large = false, mobile = false,
}: {
  state: PlayerState; name: string; isActive: boolean; isTurn: boolean;
  selectedColor: TileColor | null;
  onSelectLine: (i: number) => void; onSelectFloor: () => void;
  scoringEvents: TileScoringEvent[]; playerIndex: number;
  compact?: boolean;
  large?: boolean;
  mobile?: boolean;
}) {
  return (
    <div className={[
      'rounded-2xl border-2 transition-all bg-white',
      mobile ? 'p-3' : compact ? 'p-2.5' : large ? 'p-5' : 'p-4',
      isTurn ? 'border-yellow-400 shadow-lg shadow-yellow-400/20' : 'border-gray-200',
    ].join(' ')}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {isTurn && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse shrink-0" />}
          <span className={`font-semibold text-gray-800 ${compact ? 'text-sm' : large ? 'text-lg' : ''}`}>{name}</span>
          {isTurn && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">turno</span>}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Pts:</span>
          <span className={`font-bold text-purple-600 ${compact ? 'text-xl' : large ? 'text-3xl' : 'text-2xl'}`}>{state.score}</span>
        </div>
      </div>
      <div className={`flex items-start ${mobile ? 'gap-2 justify-center' : compact ? 'gap-2' : large ? 'gap-6 justify-center' : 'gap-3'}`}>
        <PatternLines
          lines={state.patternLines} wall={state.wall}
          selectedColor={isActive ? selectedColor : null}
          onSelectLine={onSelectLine} active={isActive}
          compact={compact} large={large} mobile={mobile}
        />
        <Wall wall={state.wall} scoringEvents={scoringEvents} playerIndex={playerIndex}
          compact={compact} large={large} mobile={mobile} />
      </div>
      <div className="mt-2">
        <p className="text-[10px] text-gray-400 mb-1 font-mono uppercase tracking-wider">Suelo</p>
        <Floor
          floor={state.floor} hasMarker={state.hasFirstPlayerMarker}
          selectedColor={isActive ? selectedColor : null}
          onSelectFloor={onSelectFloor} active={isActive}
        />
      </div>
    </div>
  );
}

// ─── Log ──────────────────────────────────────────────────────────────────────

interface LogEntry {
  round: number; player: string; text: string;
  type: 'move' | 'score' | 'error' | 'round';
}

// ─── Página principal ─────────────────────────────────────────────────────────

function makeInitialState(n: number): GameState {
  return createInitialState(...Array.from({ length: n }, (_, i) => `player-${i}`));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 640
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

// ─── RivalMiniCard ────────────────────────────────────────────────────────────

function RivalMiniCard({
  state, name, isTurn, onClick,
}: {
  state: PlayerState; name: string; isTurn: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 bg-white transition-all active:scale-95 shrink-0',
        isTurn ? 'border-yellow-400 shadow-md shadow-yellow-400/20' : 'border-gray-200',
      ].join(' ')}
      style={{ minWidth: 88, touchAction: 'manipulation' }}
    >
      <div className="flex items-center justify-between w-full px-0.5">
        <span className="text-[10px] font-semibold text-gray-700 truncate max-w-[52px]">{name}</span>
        <span className="text-[11px] font-bold text-purple-600">{state.score}</span>
      </div>
      <div className="flex flex-col gap-px">
        {state.wall.map((row, r) => (
          <div key={r} className="flex gap-px">
            {row.map((cell, c) => {
              const patternColor = WALL_PATTERN[r]![c]!;
              const s = TILE_STYLES[cell ?? patternColor]!;
              return (
                <div key={c} style={{
                  width: 12, height: 12, borderRadius: 2,
                  border: `1px solid ${cell ? s.border : `${s.bg}55`}`,
                  backgroundColor: cell ? undefined : `${s.bg}18`,
                  backgroundImage: cell ? `url(${s.img})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }} />
              );
            })}
          </div>
        ))}
      </div>
      <span className="text-[9px] text-gray-300 leading-none">ver más</span>
    </button>
  );
}

// ─── RivalDetailSheet ─────────────────────────────────────────────────────────

function RivalDetailSheet({
  state, name, playerIndex, scoringEvents, onClose,
}: {
  state: PlayerState | null; name: string; playerIndex: number;
  scoringEvents: TileScoringEvent[]; onClose: () => void;
}) {
  useEffect(() => {
    if (!state) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [state]);

  if (!state) return null;
  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="azul-sheet-enter absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white shadow-2xl p-4 pb-10 max-h-[80vh] overflow-y-auto">
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800 text-lg">{name}</h3>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 text-lg font-bold">
            ×
          </button>
        </div>
        <div className="flex items-start gap-2 justify-center">
          <PatternLines
            lines={state.patternLines} wall={state.wall}
            selectedColor={null} onSelectLine={() => {}} active={false} compact />
          <Wall wall={state.wall} scoringEvents={scoringEvents}
            playerIndex={playerIndex} compact />
        </div>
        <div className="mt-3">
          <p className="text-[10px] text-gray-400 mb-1 font-mono uppercase tracking-wider">Suelo</p>
          <Floor floor={state.floor} hasMarker={state.hasFirstPlayerMarker}
            selectedColor={null} onSelectFloor={() => {}} active={false} />
        </div>
        <div className="mt-4 text-center">
          <span className="text-2xl font-bold text-purple-600">{state.score}</span>
          <span className="text-sm text-gray-400 ml-1">puntos</span>
        </div>
      </div>
    </div>
  );
}

export default function AzulLocal() {
  const [numPlayers, setNumPlayers] = useState(2);
  const [gs, setGs] = useState<GameState>(() => makeInitialState(2));
  const [selected, setSelected] = useState<{
    source: 'factory' | 'center'; factoryIndex?: number; color: TileColor;
  } | null>(null);
  const [log, setLog] = useState<LogEntry[]>([
    { round: 1, player: '', text: '¡Partida iniciada! Turno de Ana.', type: 'round' },
  ]);
  const [winner, setWinner] = useState<string | null>(null);
  const [rivalModal, setRivalModal] = useState<number | null>(null);
  const isMobile = useIsMobile();

  // Cola completa de eventos calculados al final de la fase de mosaico
  const [eventQueue, setEventQueue] = useState<TileScoringEvent[]>([]);
  // Índice del evento que se está mostrando ahora (-1 = sin animación)
  const [currentEventIdx, setCurrentEventIdx] = useState(-1);
  // Estado derivado para saber si hay animación activa
  const isAnimating = currentEventIdx >= 0;
  // El evento visible en este momento (o ninguno)
  const activeEvents = currentEventIdx >= 0 ? [eventQueue[currentEventIdx]!].filter(Boolean) : [];
  // Referencia al timer para poder cancelarlo en un reset
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Estado del juego que se aplicará cuando acabe la cola de animación
  const pendingPostAnimState = useRef<{ newState: GameState; result: ReturnType<typeof applyMove> } | null>(null);

  const activePlayerIndex = gs.turnIndex;
  const activeName = PLAYER_NAMES[activePlayerIndex] ?? `J${activePlayerIndex + 1}`;

  // Cerrar modal de rival al cambiar de turno
  useEffect(() => { setRivalModal(null); }, [activePlayerIndex]);

  // Avanza al siguiente evento de la cola, o termina la secuencia
  const advanceQueue = useCallback((queue: TileScoringEvent[], nextIdx: number) => {
    if (nextIdx < queue.length) {
      setCurrentEventIdx(nextIdx);
      animTimerRef.current = setTimeout(() => advanceQueue(queue, nextIdx + 1), STEP_DURATION_MS);
    } else {
      // Cola terminada: limpiar y desbloquear
      setCurrentEventIdx(-1);
      setEventQueue([]);
      const pending = pendingPostAnimState.current;
      pendingPostAnimState.current = null;
      if (pending) {
        const { newState, result } = pending;
        if (result.gameOver) {
          const winIdx = result.winnerIndex ?? getWinnerIndex(newState);
          const winName = winIdx >= 0 ? (PLAYER_NAMES[winIdx] ?? `J${winIdx + 1}`) : null;
          setWinner(winName ?? 'Empate');
        }
      }
    }
  }, []);

  const addLog = useCallback((entry: LogEntry) => {
    setLog(prev => [entry, ...prev].slice(0, 40));
  }, []);

  const handleSelectTile = useCallback((
    src: { source: 'factory' | 'center'; factoryIndex?: number; color: TileColor }
  ) => {
    if (winner || isAnimating) return;
    setSelected(prev =>
      prev?.source === src.source && prev?.factoryIndex === src.factoryIndex && prev?.color === src.color
        ? null : src
    );
  }, [winner, isAnimating]);

  const dispatchMove = useCallback((move: MovePayload) => {
    if (winner || isAnimating) return;

    const result = applyMove(gs, activePlayerIndex, move);

    if (!result.success || !result.newState) {
      addLog({ round: gs.round, player: activeName, text: `Error: ${result.error}`, type: 'error' });
      return;
    }

    const newState = result.newState;
    const dest = move.patternLineIndex === -1 ? 'el suelo' : `línea ${move.patternLineIndex + 1}`;
    const src = move.source === 'factory' ? `fábrica ${(move.factoryIndex ?? 0) + 1}` : 'el centro';
    addLog({
      round: gs.round, player: activeName,
      text: `tomó ${TILE_STYLES[move.color]?.label} de ${src} → ${dest}`,
      type: 'move',
    });

    // ── Calcular eventos de puntuación ───────────────────────────────────────
    // Solo ocurren cuando el engine pasó por la fase de mosaico (tiles nuevos en la pared)
    const events: TileScoringEvent[] = [];
    for (let pi = 0; pi < gs.players.length; pi++) {
      const before = gs.players[pi];
      const after = newState.players[pi];
      if (before && after) {
        events.push(...computeScoringEvents(before, after, pi));
      }
    }

    if (events.length > 0) {
      // Hay puntuación que animar: actualizamos el estado YA y arrancamos la cola
      setGs(newState);
      setSelected(null);

      // Loguear puntuaciones
      for (const ev of events) {
        const pName = PLAYER_NAMES[ev.playerIndex] ?? `J${ev.playerIndex + 1}`;
        addLog({
          round: gs.round, player: pName,
          text: `puntúa +${ev.points} por (${ev.newTile.row + 1},${ev.newTile.col + 1})`,
          type: 'score',
        });
      }
      if (newState.round !== gs.round) {
        addLog({
          round: newState.round, player: '',
          text: `── Ronda ${newState.round} iniciada. Turno de ${PLAYER_NAMES[newState.turnIndex] ?? '?'} ──`,
          type: 'round',
        });
      }

      // Guardar estado post-animación para procesarlo al terminar la cola
      pendingPostAnimState.current = { newState, result };

      // Cancelar timer previo y arrancar la cola desde el primer evento
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      setEventQueue(events);
      setCurrentEventIdx(0);
      animTimerRef.current = setTimeout(
        () => advanceQueue(events, 1),
        STEP_DURATION_MS + STEP_GAP_MS
      );

    } else {
      // Sin puntuación: transición inmediata
      setGs(newState);
      setSelected(null);

      if (result.gameOver) {
        const winIdx = result.winnerIndex ?? getWinnerIndex(newState);
        const winName = winIdx >= 0 ? (PLAYER_NAMES[winIdx] ?? `J${winIdx + 1}`) : null;
        setWinner(winName ?? 'Empate');
        addLog({
          round: gs.round, player: '',
          text: winName ? `🏆 ¡${winName} gana!` : '🤝 ¡Empate!', type: 'round',
        });
      } else if (newState.round !== gs.round) {
        addLog({
          round: newState.round, player: '',
          text: `── Ronda ${newState.round} iniciada. Turno de ${PLAYER_NAMES[newState.turnIndex] ?? '?'} ──`,
          type: 'round',
        });
      }
    }
  }, [gs, activePlayerIndex, activeName, addLog, winner, isAnimating, advanceQueue]);

  const handleSelectLine = useCallback((lineIdx: number) => {
    if (!selected) return;
    dispatchMove({ ...selected, patternLineIndex: lineIdx });
  }, [selected, dispatchMove]);

  const handleSelectFloor = useCallback(() => {
    if (!selected) return;
    dispatchMove({ ...selected, patternLineIndex: -1 });
  }, [selected, dispatchMove]);

  const handleReset = (n = numPlayers) => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    pendingPostAnimState.current = null;
    setGs(makeInitialState(n));
    setSelected(null);
    setWinner(null);
    setEventQueue([]);
    setCurrentEventIdx(-1);
    setLog([{ round: 1, player: '', text: `¡Partida nueva iniciada (${n}J)! Turno de ${PLAYER_NAMES[0]}.`, type: 'round' }]);
  };

  const handleSetPlayers = (n: number) => {
    setNumPlayers(n);
    handleReset(n);
  };

  // Limpieza al desmontar
  useEffect(() => () => { if (animTimerRef.current) clearTimeout(animTimerRef.current); }, []);

  const disabled = !!winner || isAnimating;

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:gap-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Azul — Sandbox local</h1>
            <p className="text-sm text-gray-500">Motor en el cliente · Sin API ni login</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Selector de jugadores */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
              {[2, 3, 4].map(n => (
                <button
                  key={n}
                  onClick={() => handleSetPlayers(n)}
                  className={[
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                    numPlayers === n
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-500 hover:bg-gray-100',
                  ].join(' ')}
                >
                  {n}J
                </button>
              ))}
            </div>
            <button
              onClick={() => handleReset()}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              Nueva partida
            </button>
          </div>
        </div>

        {/* Banner de ganador */}
        {winner && (
          <div className="rounded-xl bg-gradient-to-r from-yellow-400 to-orange-400 p-4 text-center shadow-lg">
            <p className="text-2xl font-bold text-white">
              {winner === 'Empate' ? '🤝 ¡Empate!' : `🏆 ¡${winner} gana!`}
            </p>
            <p className="text-white/80 text-sm mt-1">
              {gs.players.map((p, i) => `${PLAYER_NAMES[i]}: ${p.score} pts`).join(' · ')}
            </p>
            <button
              onClick={handleReset}
              className="mt-3 rounded-lg bg-white/20 hover:bg-white/30 px-4 py-1.5 text-white text-sm font-medium transition-colors"
            >
              Jugar de nuevo
            </button>
          </div>
        )}

        {/* Barra de estado */}
        {!winner && (
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm">
            <span className="text-gray-500">Ronda <strong className="text-gray-700">{gs.round}</strong></span>
            <div className="flex items-center gap-2">
              {isAnimating ? (
                <span className="font-semibold text-purple-600 animate-pulse">Puntuando…</span>
              ) : (
                <>
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <span className="font-semibold text-yellow-700">Turno de {activeName}</span>
                </>
              )}
            </div>
            <span className="text-gray-400 text-xs">
              Fase: {gs.phase === 'OFFER' ? 'Selección' : 'Mosaico'}
            </span>
          </div>
        )}

        {/* Instrucción contextual */}
        {!winner && !isAnimating && (
          <div className="text-center text-sm text-gray-500 min-h-5">
            {!selected
              ? `${activeName}: selecciona un color de una fábrica o del centro`
              : (
                <span>
                  <span
                    className="inline-block px-2 py-0.5 rounded font-semibold text-white text-xs"
                    style={{ backgroundColor: TILE_STYLES[selected.color]?.bg }}
                  >
                    {TILE_STYLES[selected.color]?.label}
                  </span>
                  {' '}seleccionado · elige una línea o el suelo
                  <button onClick={() => setSelected(null)}
                    className="ml-3 text-xs text-gray-400 underline hover:text-gray-600">
                    cancelar
                  </button>
                </span>
              )
            }
          </div>
        )}

        {/* Zona de oferta */}
        <div className={[
          'flex flex-col items-center gap-4 bg-white rounded-2xl border border-gray-200 p-5 shadow-sm transition-opacity',
          isAnimating ? 'opacity-40 pointer-events-none' : '',
        ].join(' ')}>
          <p className="text-xs font-mono uppercase tracking-wide text-gray-400">Fábricas</p>

          {/* Arco en pantallas medianas+; grid en móvil */}
          <div className="hidden sm:block" style={{
            position: 'relative',
            width: numPlayers === 2 ? '320px' : numPlayers === 3 ? '480px' : '560px',
            height: numPlayers === 2 ? '144px' : '176px',
          }}>
            {gs.factories.map((tiles, i) => {
              const total = gs.factories.length;
              const angle = (i / (total - 1)) * Math.PI;
              const cx = 50 + 46 * Math.cos(Math.PI - angle);
              const cy = 96 - 84 * Math.sin(angle);
              return (
                <div key={i} className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${cx}%`, top: `${cy}%` }}>
                  <Factory
                    tiles={tiles} index={i} selected={selected}
                    onSelect={color => handleSelectTile({ source: 'factory', factoryIndex: i, color })}
                    disabled={disabled}
                  />
                </div>
              );
            })}
          </div>

          {/* Fábricas para móvil — scroll horizontal */}
          <div className="sm:hidden flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
               style={{ scrollbarWidth: 'none' }}>
            {gs.factories.map((tiles, i) => (
              <div key={i} className="shrink-0">
                <Factory
                  tiles={tiles} index={i} selected={selected}
                  onSelect={color => handleSelectTile({ source: 'factory', factoryIndex: i, color })}
                  disabled={disabled}
                />
              </div>
            ))}
          </div>

          {/* Centro */}
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-xs font-mono uppercase tracking-widest text-gray-400">Centro</p>
            <div className="min-w-32 min-h-14 rounded-xl border-2 border-dashed border-gray-200 bg-white flex flex-wrap items-center justify-center gap-1.5 p-2.5">
              {gs.firstPlayerMarkerInCenter && (
                <div className="w-8 h-8 rounded-full border-2 border-yellow-400 bg-yellow-50 flex items-center justify-center text-xs font-bold text-yellow-700 shrink-0">1</div>
              )}
              {[...new Set(gs.center)].map(color => {
                const count = gs.center.filter(t => t === color).length;
                const isSel = selected?.source === 'center' && selected.color === color;
                return Array.from({ length: count }).map((_, i) => (
                  <Tile key={`${color}-${i}`} color={color} selected={isSel}
                    selectable={!disabled}
                    onClick={() => handleSelectTile({ source: 'center', color })}
                    size="sm" />
                ));
              })}
              {gs.center.length === 0 && !gs.firstPlayerMarkerInCenter && (
                <span className="text-xs text-gray-300">vacío</span>
              )}
            </div>
          </div>
        </div>

        {/* Tableros */}
        {isMobile ? (
          <>
            {/* Mini-tableros de rivales */}
            {gs.players.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
                   style={{ scrollbarWidth: 'none' }}>
                {gs.players
                  .filter((_, idx) => idx !== activePlayerIndex)
                  .map(playerState => {
                    const idx = gs.players.indexOf(playerState);
                    return (
                      <RivalMiniCard
                        key={playerState.id}
                        state={playerState}
                        name={PLAYER_NAMES[idx] ?? `J${idx + 1}`}
                        isTurn={false}
                        onClick={() => setRivalModal(idx)}
                      />
                    );
                  })}
              </div>
            )}
            {/* Tablero del jugador activo */}
            <PlayerPanel
              state={gs.players[activePlayerIndex]!}
              name={activeName}
              isActive={!disabled}
              isTurn={true}
              selectedColor={selected?.color ?? null}
              onSelectLine={handleSelectLine}
              onSelectFloor={handleSelectFloor}
              scoringEvents={activeEvents}
              playerIndex={activePlayerIndex}
              mobile={true}
            />
          </>
        ) : (
          <div className={[
            'grid grid-cols-1 gap-3 sm:gap-4',
            numPlayers === 3 ? 'md:grid-cols-3' :
            numPlayers === 4 ? 'sm:grid-cols-2' : '',
          ].join(' ')}>
            {gs.players.map((playerState, idx) => (
              <PlayerPanel
                key={playerState.id}
                state={playerState}
                name={PLAYER_NAMES[idx] ?? `J${idx + 1}`}
                isActive={idx === activePlayerIndex && !disabled}
                isTurn={idx === activePlayerIndex}
                selectedColor={idx === activePlayerIndex ? (selected?.color ?? null) : null}
                onSelectLine={handleSelectLine}
                onSelectFloor={handleSelectFloor}
                scoringEvents={activeEvents}
                playerIndex={idx}
                compact={numPlayers >= 3}
                large={numPlayers === 2}
              />
            ))}
          </div>
        )}

        {/* Modal de rival (solo móvil) */}
        {rivalModal !== null && (
          <RivalDetailSheet
            state={gs.players[rivalModal] ?? null}
            name={PLAYER_NAMES[rivalModal] ?? `J${rivalModal + 1}`}
            playerIndex={rivalModal}
            scoringEvents={activeEvents}
            onClose={() => setRivalModal(null)}
          />
        )}

        {/* Log */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-mono uppercase tracking-widest text-gray-400 mb-3">Log de partida</p>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto text-sm font-mono">
            {log.map((entry, i) => (
              <div key={i} className={[
                'flex gap-2 px-2 py-0.5 rounded',
                entry.type === 'error' ? 'bg-red-50 text-red-700' :
                entry.type === 'round' ? 'bg-purple-50 text-purple-700 font-semibold' :
                entry.type === 'score' ? 'bg-green-50 text-green-700' :
                'text-gray-600',
              ].join(' ')}>
                {entry.type !== 'round' && <span className="text-gray-400 shrink-0">R{entry.round}</span>}
                {entry.player && <span className="font-semibold shrink-0">{entry.player}:</span>}
                <span>{entry.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-3 justify-center text-xs text-gray-400 pb-4">
          {(Object.entries(TILE_STYLES) as [TileColor, typeof TILE_STYLES[TileColor]][]).map(([color, s]) => (
            <div key={color} className="flex items-center gap-1.5">
              <Tile color={color as TileColor} size="sm" />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
