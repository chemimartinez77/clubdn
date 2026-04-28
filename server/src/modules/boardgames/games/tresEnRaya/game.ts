import type { Ctx, Game } from 'boardgame.io';
import { INVALID_MOVE, TurnOrder } from 'boardgame.io/core';
import type { BoardGameDefinition } from '../../types/contracts';

export type TresEnRayaCell = null | '0' | '1';

export interface TresEnRayaState {
  cells: TresEnRayaCell[];
  winnerLine: number[] | null;
}

const WIN_LINES: number[][] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function getWinnerLine(cells: TresEnRayaCell[]): number[] | null {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (a === undefined || b === undefined || c === undefined) {
      continue;
    }
    const value = cells[a];
    if (value !== null && value === cells[b] && value === cells[c]) {
      return line;
    }
  }

  return null;
}

function getWinner(cells: TresEnRayaCell[]): '0' | '1' | null {
  const line = getWinnerLine(cells);
  if (!line) {
    return null;
  }

  const firstIndex = line[0];
  if (firstIndex === undefined) {
    return null;
  }

  const value = cells[firstIndex] ?? null;
  return value === null ? null : value;
}

const tresEnRayaGame: Game<TresEnRayaState> = {
  name: 'tres-en-raya',
  setup: () => ({
    cells: Array.from({ length: 9 }, () => null),
    winnerLine: null,
  }),
  turn: {
    order: TurnOrder.RESET,
  },
  moves: {
    placeMark: ({ G, playerID }, cellIndex: number) => {
      if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 8) {
        return INVALID_MOVE;
      }

      if (!playerID) {
        return INVALID_MOVE;
      }

      if (G.cells[cellIndex] !== null) {
        return INVALID_MOVE;
      }

      G.cells[cellIndex] = playerID as '0' | '1';
      G.winnerLine = getWinnerLine(G.cells);
      return G;
    },
  },
  endIf: ({ G }) => {
    const winner = getWinner(G.cells);
    if (winner) {
      return { winner };
    }

    if (G.cells.every((cell) => cell !== null)) {
      return { draw: true };
    }

    return undefined;
  },
  playerView: ({ G }) => G,
};

export const tresEnRayaDefinition: BoardGameDefinition = {
  gameKey: 'tres-en-raya',
  title: 'Tres en raya',
  description: 'Duelo instantáneo por turnos con sincronización en tiempo real.',
  minPlayers: 2,
  maxPlayers: 2,
  game: tresEnRayaGame,
};

export function getTresEnRayaCurrentPlayerLabel(ctx: Ctx, playerID: string | null): boolean {
  return playerID !== null && ctx.currentPlayer === playerID;
}
