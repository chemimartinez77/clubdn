import type { BoardGameKey } from './contracts';

export type MultiplayerVisibility = 'PRIVATE' | 'CLUB' | 'INVITE_ONLY';
export type MultiplayerStatus = 'LOBBY' | 'ACTIVE' | 'FINISHED' | 'ABANDONED';

export interface MultiplayerGameInfoDto {
  gameKey: BoardGameKey;
  title: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}

export interface MultiplayerPlayerDto {
  userId: string;
  name: string;
  nick: string | null;
  playerIndex: number;
  isReady: boolean;
  joinedAt: string;
  leftAt: string | null;
  isOwner: boolean;
}

export interface MultiplayerEngineViewDto {
  G: unknown;
  ctx: unknown;
  stateId: number;
  playerID: string | null;
  isYourTurn: boolean;
}

export interface MultiplayerMatchDto {
  id: string;
  gameKey: BoardGameKey;
  gameTitle: string;
  gameDescription: string;
  status: MultiplayerStatus;
  visibility: MultiplayerVisibility;
  ownerUserId: string;
  minPlayers: number;
  maxPlayers: number;
  winnerUserId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  currentPlayers: number;
  mePlayerIndex: number | null;
  canJoin: boolean;
  canStart: boolean;
  players: MultiplayerPlayerDto[];
  result: unknown;
}

export interface MultiplayerMatchSnapshotDto {
  match: MultiplayerMatchDto;
  engine: MultiplayerEngineViewDto | null;
}

export interface MatchStreamEventDto {
  event:
    | 'match:state'
    | 'match:player-joined'
    | 'match:player-left'
    | 'match:started'
    | 'match:move-applied'
    | 'match:finished'
    | 'match:error';
  payload: MultiplayerMatchSnapshotDto | { message: string };
}
