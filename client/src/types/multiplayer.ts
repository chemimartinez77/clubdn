export type MultiplayerVisibility = 'PRIVATE' | 'CLUB' | 'INVITE_ONLY';
export type MultiplayerStatus = 'LOBBY' | 'ACTIVE' | 'FINISHED' | 'ABANDONED';
export type MultiplayerGameKey = 'tres-en-raya' | 'jaipur';

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
  | 'match:restarted'
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

export type JaipurGoodsType = 'diamante' | 'oro' | 'plata' | 'tela' | 'especias' | 'cuero';
export type JaipurCardType = JaipurGoodsType | 'camello';
export type JaipurPlayerID = '0' | '1';

export interface JaipurPlayerView {
  hand: JaipurGoodsType[];
  handSize: number;
  herdCount: number;
  goodsTokenValuesWon: number[];
  bonusTokenValuesWon: number[];
  camelTokenWon: boolean;
}

export interface JaipurRoundSummary {
  roundNumber: number;
  winnerPlayerID: JaipurPlayerID | null;
  winnerBy: 'rupias' | 'bonus' | 'goods' | 'empate';
  totals: Record<JaipurPlayerID, number>;
  bonusCounts: Record<JaipurPlayerID, number>;
  goodsCounts: Record<JaipurPlayerID, number>;
  camelWinnerPlayerID: JaipurPlayerID | null;
  seals: Record<JaipurPlayerID, number>;
  reason: 'three-goods-depleted' | 'deck-empty-refill';
}

export interface JaipurEngineState {
  roundNumber: number;
  roundStarterIndex: 0 | 1;
  matchSeals: Record<JaipurPlayerID, number>;
  matchWinnerPlayerID: JaipurPlayerID | null;
  players: Record<JaipurPlayerID, JaipurPlayerView>;
  deck: JaipurCardType[];
  market: JaipurCardType[];
  discard: JaipurGoodsType[];
  goodsTokens: Record<JaipurGoodsType, number[]>;
  bonusTokens3: number[];
  bonusTokens4: number[];
  bonusTokens5: number[];
  camelTokenAvailable: boolean;
  lastRoundSummary: JaipurRoundSummary | null;
}

export interface JaipurCtx {
  currentPlayer: string;
  turn: number;
  gameover?: {
    winner?: JaipurPlayerID;
    seals?: Record<JaipurPlayerID, number>;
    rounds?: number;
    lastRoundSummary?: JaipurRoundSummary | null;
  };
}
