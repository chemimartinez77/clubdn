import type { BoardGameDefinition, BoardGameKey } from '../types/contracts';
import { tresEnRayaDefinition } from './tresEnRaya/game';

const gameRegistry = new Map<BoardGameKey, BoardGameDefinition>([
  [tresEnRayaDefinition.gameKey, tresEnRayaDefinition],
]);

export function listBoardGames(): BoardGameDefinition[] {
  return Array.from(gameRegistry.values());
}

export function getBoardGameDefinition(gameKey: string): BoardGameDefinition | null {
  return gameRegistry.get(gameKey as BoardGameKey) ?? null;
}
