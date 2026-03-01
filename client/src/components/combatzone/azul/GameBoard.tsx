// client/src/components/combatzone/azul/GameBoard.tsx
import { useState, useEffect, useRef } from 'react';
import { useGame, type TileColor, type TileOrNull, type PlayerState } from '../../../hooks/useGame';
import { useAuth } from '../../../contexts/AuthContext';

// ─── Tipos para el highlight del último movimiento ────────────────────────────

interface LastMoveHighlight {
  patternTiles: Array<{ row: number; col: number }>;
  floorTiles: number[];
  wallTiles: Array<{ row: number; col: number }>;
}

function computeDiff(prev: PlayerState, next: PlayerState): LastMoveHighlight | null {
  const patternTiles: Array<{ row: number; col: number }> = [];
  const floorTiles: number[] = [];
  const wallTiles: Array<{ row: number; col: number }> = [];

  next.patternLines.forEach((line, row) => {
    line.forEach((tile, col) => {
      if (tile !== null && (prev.patternLines[row]?.[col] ?? null) === null) {
        patternTiles.push({ row, col });
      }
    });
  });

  for (let i = prev.floor.length; i < next.floor.length; i++) {
    floorTiles.push(i);
  }

  next.wall.forEach((row, r) => {
    row.forEach((tile, c) => {
      if (tile !== null && (prev.wall[r]?.[c] ?? null) === null) {
        wallTiles.push({ row: r, col: c });
      }
    });
  });

  if (!patternTiles.length && !floorTiles.length && !wallTiles.length) return null;
  return { patternTiles, floorTiles, wallTiles };
}

const TILE_STYLES: Record<TileColor, { bg: string; border: string; label: string; img: string }> = {
  BLUE:   { bg: '#3b82f6', border: '#1d4ed8', label: 'Azul',     img: '/azulejo-azul.png'     },
  YELLOW: { bg: '#eab308', border: '#a16207', label: 'Amarillo', img: '/azulejo-amarillo.png'  },
  RED:    { bg: '#ef4444', border: '#991b1b', label: 'Rojo',     img: '/azulejo-rojo.png'      },
  BLACK:  { bg: '#374151', border: '#111827', label: 'Negro',    img: '/azulejo-negro.png'     },
  TEAL:   { bg: '#14b8a6', border: '#0f766e', label: 'Turquesa', img: '/azulejo-teal.png'      },
};

// Patrón oficial de la pared (para mostrar los slots vacíos con color atenuado)
const WALL_PATTERN: TileColor[][] = [
  ['BLUE',   'YELLOW', 'RED',    'BLACK',  'TEAL'],
  ['TEAL',   'BLUE',   'YELLOW', 'RED',    'BLACK'],
  ['BLACK',  'TEAL',   'BLUE',   'YELLOW', 'RED'],
  ['RED',    'BLACK',  'TEAL',   'BLUE',   'YELLOW'],
  ['YELLOW', 'RED',    'BLACK',  'TEAL',   'BLUE'],
];

const FLOOR_PENALTIES = [-1, -1, -2, -2, -2, -3, -3];

// ─── Componente Tile ─────────────────────────────────────────────────────────

interface TileProps {
  color: TileColor;
  faded?: boolean;       // slot vacío de la pared (color atenuado)
  selected?: boolean;
  selectable?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

function Tile({ color, faded = false, selected = false, selectable = false, onClick, size = 'md' }: TileProps) {
  const s = TILE_STYLES[color];
  const px = size === 'sm' ? 24 : 32;

  return (
    <div
      onClick={selectable ? onClick : undefined}
      title={s.label}
      style={{
        width: px, height: px,
        borderRadius: 3,
        border: `2px solid ${selected ? '#fbbf24' : (faded ? `${s.bg}55` : s.border)}`,
        boxShadow: selected ? '0 0 0 3px #fbbf2466' : undefined,
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
      ].join(' ')}
    />
  );
}

function EmptySlot({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  return <div className={`${dim} rounded-sm border-2 border-dashed border-gray-300/50`} />;
}

// ─── Fábrica ─────────────────────────────────────────────────────────────────

interface FactoryProps {
  tiles: TileColor[];
  index: number;
  selectedSource: SelectedSource | null;
  onSelectTile: (source: SelectedSource) => void;
  disabled: boolean;
}

interface SelectedSource {
  source: 'factory' | 'center';
  factoryIndex?: number;
  color: TileColor;
}

function Factory({ tiles, index, selectedSource, onSelectTile, disabled }: FactoryProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-[var(--color-textSecondary)] font-mono">F{index + 1}</span>
      <div className="w-20 h-20 rounded-full border-2 border-[var(--color-border)] bg-[var(--color-surface)] flex flex-wrap items-center justify-center gap-1 p-2 shadow-md">
        {tiles.map((color, i) => {
          const isSelected =
            selectedSource?.source === 'factory' &&
            selectedSource.factoryIndex === index &&
            selectedSource.color === color;
          return (
            <Tile
              key={i}
              color={color}
              selected={isSelected}
              selectable={!disabled}
              onClick={() => onSelectTile({ source: 'factory', factoryIndex: index, color })}
              size="sm"
            />
          );
        })}
        {tiles.length === 0 && (
          <span className="text-xs text-[var(--color-textSecondary)] opacity-50">vacía</span>
        )}
      </div>
    </div>
  );
}

// ─── Centro de mesa ───────────────────────────────────────────────────────────

interface CenterProps {
  tiles: TileColor[];
  hasFirstPlayerMarker: boolean;
  selectedSource: SelectedSource | null;
  onSelectTile: (source: SelectedSource) => void;
  disabled: boolean;
}

function Center({ tiles, hasFirstPlayerMarker, selectedSource, onSelectTile, disabled }: CenterProps) {
  const colorGroups = Object.entries(
    tiles.reduce<Partial<Record<TileColor, number>>>((acc, t) => {
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    }, {})
  ) as [TileColor, number][];

  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-semibold text-[var(--color-textSecondary)]">Centro</span>
      <div className="min-w-28 min-h-16 rounded-xl border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/60 flex flex-wrap items-center justify-center gap-1.5 p-2">
        {hasFirstPlayerMarker && (
          <div
            title="Marcador primer jugador"
            className="w-8 h-8 rounded-full border-2 border-yellow-400 bg-yellow-100 flex items-center justify-center text-sm font-bold text-yellow-700 shadow"
          >
            1
          </div>
        )}
        {colorGroups.map(([color, count]) => {
          const isSelected =
            selectedSource?.source === 'center' && selectedSource.color === color;
          return (
            <div key={color} className="flex items-center gap-0.5">
              {Array.from({ length: count }).map((_, i) => (
                <Tile
                  key={i}
                  color={color}
                  selected={isSelected}
                  selectable={!disabled}
                  onClick={() => onSelectTile({ source: 'center', color })}
                  size="sm"
                />
              ))}
            </div>
          );
        })}
        {tiles.length === 0 && !hasFirstPlayerMarker && (
          <span className="text-xs text-[var(--color-textSecondary)] opacity-40">vacío</span>
        )}
      </div>
    </div>
  );
}

// ─── Pared (Wall 5×5) ─────────────────────────────────────────────────────────

interface WallProps {
  wall: TileOrNull[][];
  highlightTiles?: Array<{ row: number; col: number }>;
}

function Wall({ wall, highlightTiles }: WallProps) {
  return (
    <div className="flex flex-col gap-1">
      {wall.map((row, r) => (
        <div key={r} className="flex gap-1">
          {row.map((cell, c) => {
            const patternColor = WALL_PATTERN[r]![c]!;
            const isHighlighted = highlightTiles?.some(t => t.row === r && t.col === c) ?? false;
            return cell ? (
              <div key={c} className={isHighlighted ? 'azul-last-move-wall rounded-sm' : undefined}>
                <Tile color={cell} />
              </div>
            ) : (
              <Tile key={c} color={patternColor} faded />
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Líneas de Patrón ────────────────────────────────────────────────────────

interface PatternLinesProps {
  lines: TileOrNull[][];
  wall: TileOrNull[][];
  selectedColor: TileColor | null;
  onSelectLine: (lineIndex: number) => void;
  isMyBoard: boolean;
  highlightTiles?: Array<{ row: number; col: number }>;
}

function PatternLines({ lines, wall, selectedColor, onSelectLine, isMyBoard, highlightTiles }: PatternLinesProps) {
  return (
    <div className="flex flex-col gap-1">
      {lines.map((line, row) => {
        const capacity = row + 1;
        const existingColor = line.find(t => t !== null) as TileColor | undefined;
        const isFull = line.every(t => t !== null);

        const wallColorForRow = existingColor ?? selectedColor;
        const wallRowFull = wallColorForRow
          ? wall[row]?.[WALL_PATTERN[row]!.indexOf(wallColorForRow)] !== null
          : false;
        const isValidTarget =
          isMyBoard &&
          selectedColor !== null &&
          !isFull &&
          (!existingColor || existingColor === selectedColor) &&
          !wallRowFull;

        return (
          <div
            key={row}
            onClick={() => isValidTarget && onSelectLine(row)}
            className={[
              'flex gap-1 justify-end items-center rounded px-1 py-0.5 transition-colors',
              isValidTarget
                ? 'cursor-pointer bg-yellow-400/10 hover:bg-yellow-400/25 ring-1 ring-yellow-400/50'
                : '',
            ].join(' ')}
          >
            {Array.from({ length: capacity }).map((_, i) => {
              const tile = line[i];
              const isHighlighted = highlightTiles?.some(t => t.row === row && t.col === i) ?? false;
              return tile ? (
                <div key={i} className={isHighlighted ? 'azul-last-move rounded-sm' : undefined}>
                  <Tile color={tile} />
                </div>
              ) : (
                <EmptySlot key={i} />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Suelo ────────────────────────────────────────────────────────────────────

interface FloorProps {
  floor: TileColor[];
  hasMarker: boolean;
  selectedColor: TileColor | null;
  onSelectFloor: () => void;
  isMyBoard: boolean;
  highlightIndices?: number[];
}

function Floor({ floor, hasMarker, selectedColor, onSelectFloor, isMyBoard, highlightIndices }: FloorProps) {
  return (
    <div
      onClick={() => isMyBoard && selectedColor !== null && onSelectFloor()}
      className={[
        'flex gap-1 items-center flex-wrap rounded px-2 py-1 min-h-10 border border-dashed transition-colors',
        isMyBoard && selectedColor !== null
          ? 'cursor-pointer border-red-400/60 bg-red-400/5 hover:bg-red-400/15'
          : 'border-[var(--color-border)]',
      ].join(' ')}
      title={isMyBoard && selectedColor !== null ? 'Enviar al suelo (penalización)' : undefined}
    >
      {hasMarker && (
        <div className="w-8 h-8 rounded-full border-2 border-yellow-400 bg-yellow-100 flex items-center justify-center text-sm font-bold text-yellow-700 shadow">
          1
        </div>
      )}
      {floor.map((tile, i) => {
        const isHighlighted = highlightIndices?.includes(i) ?? false;
        return (
          <div key={i} className="flex flex-col items-center">
            <div className={isHighlighted ? 'azul-last-move rounded-sm' : undefined}>
              <Tile color={tile} size="sm" />
            </div>
            <span className="text-[9px] text-red-500 font-mono">{FLOOR_PENALTIES[i]}</span>
          </div>
        );
      })}
      {Array.from({ length: 7 - floor.length - (hasMarker ? 1 : 0) }).map((_, i) => (
        <div key={`empty-${i}`} className="flex flex-col items-center opacity-40">
          <EmptySlot size="sm" />
          <span className="text-[9px] text-red-400 font-mono">{FLOOR_PENALTIES[floor.length + (hasMarker ? 1 : 0) + i]}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Panel de jugador ─────────────────────────────────────────────────────────

interface PlayerBoardProps {
  playerName: string;
  state: ReturnType<typeof useGame>['myState'];
  isMyBoard: boolean;
  isCurrentTurn: boolean;
  selectedColor: TileColor | null;
  onSelectLine: (lineIndex: number) => void;
  onSelectFloor: () => void;
  highlight?: LastMoveHighlight;
}

function PlayerBoard({
  playerName,
  state,
  isMyBoard,
  isCurrentTurn,
  selectedColor,
  onSelectLine,
  onSelectFloor,
  highlight,
}: PlayerBoardProps) {
  if (!state) return null;

  return (
    <div
      className={[
        'rounded-2xl border-2 p-4 transition-all',
        isCurrentTurn
          ? 'border-yellow-400 shadow-lg shadow-yellow-400/20'
          : 'border-[var(--color-border)]',
        'bg-[var(--color-cardBackground)]',
      ].join(' ')}
    >
      {/* Header del jugador */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isCurrentTurn && (
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          )}
          <span className="font-semibold text-[var(--color-text)]">{playerName}</span>
          {isMyBoard && <span className="text-xs text-[var(--color-textSecondary)]">(tú)</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--color-textSecondary)]">Puntos:</span>
          <span className="text-xl font-bold text-[var(--color-primary)]">{state.score}</span>
        </div>
      </div>

      {/* Tablero: líneas de patrón + pared */}
      <div className="flex gap-4 items-start">
        <PatternLines
          lines={state.patternLines}
          wall={state.wall}
          selectedColor={isMyBoard ? selectedColor : null}
          onSelectLine={onSelectLine}
          isMyBoard={isMyBoard}
          highlightTiles={highlight?.patternTiles}
        />
        <Wall wall={state.wall} highlightTiles={highlight?.wallTiles} />
      </div>

      {/* Suelo */}
      <div className="mt-3">
        <p className="text-[10px] text-[var(--color-textSecondary)] mb-1 font-mono uppercase tracking-wider">
          Suelo
        </p>
        <Floor
          floor={state.floor}
          hasMarker={state.hasFirstPlayerMarker}
          selectedColor={isMyBoard ? selectedColor : null}
          onSelectFloor={onSelectFloor}
          isMyBoard={isMyBoard}
          highlightIndices={highlight?.floorTiles}
        />
      </div>
    </div>
  );
}

// ─── GameBoard principal ──────────────────────────────────────────────────────

interface GameBoardProps {
  gameId: string;
}

export function GameBoard({ gameId }: GameBoardProps) {
  const { user } = useAuth();
  const {
    game,
    isLoading,
    error,
    isMyTurn,
    myPlayerIndex,
    myState,
    opponentState,
    sendMove,
    isSendingMove,
    moveError,
    joinGame,
    isJoining,
  } = useGame(gameId, user?.id ?? '');

  // Estado de selección de azulejo (paso 1 del movimiento)
  const [selected, setSelected] = useState<{
    source: 'factory' | 'center';
    factoryIndex?: number;
    color: TileColor;
  } | null>(null);

  // Highlight del último movimiento del rival
  const prevOpponentState = useRef<PlayerState | undefined>(undefined);
  const [lastMoveHighlight, setLastMoveHighlight] = useState<LastMoveHighlight | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const prev = prevOpponentState.current;
    if (prev && opponentState) {
      const diff = computeDiff(prev, opponentState);
      if (diff) {
        setLastMoveHighlight(diff);
        if (highlightTimer.current) clearTimeout(highlightTimer.current);
        highlightTimer.current = setTimeout(() => setLastMoveHighlight(null), 2200);
      }
    }
    prevOpponentState.current = opponentState ? { ...opponentState } : undefined;
  }, [opponentState]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--color-textSecondary)]">
        Cargando partida…
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-700">
        No se pudo cargar la partida.
      </div>
    );
  }

  // ── Estado: esperando jugador 2 ───────────────────────────────────────────
  if (game.status === 'WAITING') {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="text-2xl font-bold text-[var(--color-text)]">Esperando oponente…</div>
        <p className="text-[var(--color-textSecondary)] text-sm">
          Comparte este enlace con tu rival o únete si llegaste a través de uno.
        </p>
        <code className="rounded-lg bg-[var(--color-hover)] px-4 py-2 text-sm font-mono text-[var(--color-text)] break-all">
          {window.location.href}
        </code>
        {game.player1.id !== user?.id && (
          <button
            onClick={() => joinGame()}
            disabled={isJoining}
            className="rounded-lg bg-[var(--color-primary)] px-6 py-2 text-white font-semibold hover:bg-[var(--color-primaryDark)] transition-colors disabled:opacity-60"
          >
            {isJoining ? 'Uniéndose…' : 'Unirse a la partida'}
          </button>
        )}
      </div>
    );
  }

  // ── Estado: partida terminada ─────────────────────────────────────────────
  if (game.status === 'FINISHED') {
    const winner = game.winnerId
      ? (game.player1.id === game.winnerId ? game.player1.name : game.player2?.name)
      : null;
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="text-3xl font-bold text-[var(--color-primary)]">¡Partida terminada!</div>
        <div className="text-xl text-[var(--color-text)]">
          {winner ? `Ganador: ${winner}` : 'Empate'}
        </div>
        <div className="flex gap-8 mt-4">
          {game.gameState.players.map((p, i) => {
            const name = i === 0 ? game.player1.name : (game.player2?.name ?? '?');
            return (
              <div key={p.id} className="text-center">
                <div className="text-sm text-[var(--color-textSecondary)]">{name}</div>
                <div className="text-4xl font-bold text-[var(--color-text)]">{p.score}</div>
                <div className="text-xs text-[var(--color-textSecondary)]">puntos</div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Partida activa ────────────────────────────────────────────────────────
  const gs = game.gameState;
  const opponentIndex = myPlayerIndex >= 0 ? 1 - myPlayerIndex : -1;
  const opponentName = opponentIndex === 0
    ? game.player1.name
    : (game.player2?.name ?? 'Oponente');
  const myName = myPlayerIndex === 0
    ? game.player1.name
    : (game.player2?.name ?? 'Tú');

  const handleSelectTile = (src: { source: 'factory' | 'center'; factoryIndex?: number; color: TileColor }) => {
    if (!isMyTurn) return;
    // Toggle: clic en el mismo color deselecciona
    if (selected?.source === src.source && selected?.factoryIndex === src.factoryIndex && selected?.color === src.color) {
      setSelected(null);
    } else {
      setSelected(src);
    }
  };

  const handleSelectLine = (lineIndex: number) => {
    if (!selected || !isMyTurn) return;
    sendMove({ ...selected, patternLineIndex: lineIndex });
    setSelected(null);
  };

  const handleSelectFloor = () => {
    if (!selected || !isMyTurn) return;
    sendMove({ ...selected, patternLineIndex: -1 });
    setSelected(null);
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Barra de estado */}
      <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm">
        <span className="text-[var(--color-textSecondary)]">Ronda {gs.round}</span>
        <span
          className={[
            'font-semibold',
            isMyTurn ? 'text-yellow-600' : 'text-[var(--color-textSecondary)]',
          ].join(' ')}
        >
          {isMyTurn ? '¡Tu turno!' : `Turno de ${opponentName}`}
        </span>
        <span className="text-[var(--color-textSecondary)] text-xs">
          Fase: {gs.phase === 'OFFER' ? 'Selección' : 'Mosaico'}
        </span>
      </div>

      {/* Error de movimiento */}
      {moveError && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-700">
          {(moveError as Error).message}
        </div>
      )}

      {/* Instrucción contextual */}
      {isMyTurn && (
        <div className="text-center text-sm text-[var(--color-textSecondary)]">
          {!selected
            ? 'Selecciona un color de una fábrica o del centro'
            : `Color seleccionado: ${TILE_STYLES[selected.color]?.label} · Ahora elige una línea de patrón o el suelo`}
        </div>
      )}

      {/* Zona de oferta: fábricas en círculo + centro */}
      <div className="flex flex-col items-center gap-4">
        {/* Fábricas dispuestas en arco */}
        <div className="relative w-72 h-36">
          {gs.factories.map((tiles, i) => {
            const total = gs.factories.length;
            const angle = (i / total) * Math.PI; // arco superior (0 → π)
            const cx = 50 + 45 * Math.cos(Math.PI - angle); // 0% a 100%
            const cy = 90 - 80 * Math.sin(angle);
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${cx}%`, top: `${cy}%` }}
              >
                <Factory
                  tiles={tiles}
                  index={i}
                  selectedSource={selected}
                  onSelectTile={handleSelectTile}
                  disabled={!isMyTurn || isSendingMove}
                />
              </div>
            );
          })}
        </div>

        {/* Centro */}
        <Center
          tiles={gs.center}
          hasFirstPlayerMarker={gs.firstPlayerMarkerInCenter}
          selectedSource={selected}
          onSelectTile={handleSelectTile}
          disabled={!isMyTurn || isSendingMove}
        />
      </div>

      {/* Tableros de jugadores */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Mi tablero */}
        {myState && (
          <PlayerBoard
            playerName={myName}
            state={myState}
            isMyBoard={true}
            isCurrentTurn={isMyTurn}
            selectedColor={selected?.color ?? null}
            onSelectLine={handleSelectLine}
            onSelectFloor={handleSelectFloor}
          />
        )}

        {/* Tablero del oponente */}
        {opponentState && (
          <PlayerBoard
            playerName={opponentName}
            state={opponentState}
            isMyBoard={false}
            isCurrentTurn={!isMyTurn}
            selectedColor={null}
            onSelectLine={() => {}}
            onSelectFloor={() => {}}
            highlight={lastMoveHighlight ?? undefined}
          />
        )}
      </div>
    </div>
  );
}
