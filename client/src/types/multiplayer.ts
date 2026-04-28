export type MultiplayerVisibility = 'PRIVATE' | 'CLUB' | 'INVITE_ONLY';
export type MultiplayerStatus = 'LOBBY' | 'ACTIVE' | 'FINISHED' | 'ABANDONED';
export type MultiplayerGameKey = 'tres-en-raya';

export interface MultiplayerGameInfo {
  gameKey: MultiplayerGameKey;
  title: string;
  description: string;
  minPlayers: number;
  maxPlayers: number;
}

export interface MultiplayerPlayer {
  userId: string;
  name: string;
  nick: string | null;
  playerIndex: number;
  isReady: boolean;
  joinedAt: string;
  leftAt: string | null;
  isOwner: boolean;
}

export interface MultiplayerEngineView {
  G: unknown;
  ctx: unknown;
  stateId: number;
  playerID: string | null;
  isYourTurn: boolean;
}

export interface MultiplayerMatch {
  id: string;
  gameKey: MultiplayerGameKey;
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
  players: MultiplayerPlayer[];
  result: unknown;
}

export interface MultiplayerMatchSnapshot {
  match: MultiplayerMatch;
  engine: MultiplayerEngineView | null;
}

export type MatchStreamEventName =
  | 'match:state'
  | 'match:player-joined'
  | 'match:player-left'
  | 'match:started'
  | 'match:move-applied'
  | 'match:finished'
  | 'match:error';

export interface TresEnRayaEngineState {
  cells: Array<null | '0' | '1'>;
  winnerLine: number[] | null;
}

export interface TresEnRayaCtx {
  currentPlayer: string;
  gameover?: {
    winner?: string;
    draw?: boolean;
  };
  turn: number;
}
