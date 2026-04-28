import type { Game } from 'boardgame.io';

export type BoardGameKey = 'tres-en-raya' | 'jaipur';

export interface BoardGameDefinition {
  gameKey: BoardGameKey;
  title: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
  game: Game<any>;
}

export interface MatchMoveInput {
  type: string;
  args?: unknown[];
}
