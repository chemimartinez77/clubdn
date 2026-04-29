import type { Ctx, FnContext, Game } from 'boardgame.io';
import { INVALID_MOVE } from 'boardgame.io/core';
import type { BoardGameDefinition } from '../../types/contracts';

type JaipurPlayerID = '0' | '1';
type JaipurGoodsType = 'diamante' | 'oro' | 'plata' | 'tela' | 'especias' | 'cuero';
type JaipurCardType = JaipurGoodsType | 'camello';
type JaipurRoundEndReason = 'three-goods-depleted' | 'deck-empty-refill';

interface JaipurPlayerState {
  hand: JaipurGoodsType[];
  herdCount: number;
  goodsTokenValuesWon: number[];
  bonusTokenValuesWon: number[];
  camelTokenWon: boolean;
}

interface JaipurRoundSummary {
  roundNumber: number;
  winnerPlayerID: JaipurPlayerID | null;
  winnerBy: 'rupias' | 'bonus' | 'goods' | 'empate';
  totals: Record<JaipurPlayerID, number>;
  bonusCounts: Record<JaipurPlayerID, number>;
  goodsCounts: Record<JaipurPlayerID, number>;
  camelWinnerPlayerID: JaipurPlayerID | null;
  seals: Record<JaipurPlayerID, number>;
  reason: JaipurRoundEndReason;
}

interface JaipurState {
  roundNumber: number;
  roundStarterIndex: 0 | 1;
  lastRoundStarterIndex: 0 | 1;
  matchSeals: Record<JaipurPlayerID, number>;
  matchWinnerPlayerID: JaipurPlayerID | null;
  players: Record<JaipurPlayerID, JaipurPlayerState>;
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

interface ExchangePayload {
  takeIndices: number[];
  giveGoods: JaipurGoodsType[];
  giveCamels: number;
}

interface JaipurRandomApi {
  Die: (sides: number) => number;
  Shuffle: <T>(deck: T[]) => T[];
}

interface JaipurGameContext {
  ctx: Ctx;
  random?: JaipurRandomApi;
}

const PLAYER_IDS: JaipurPlayerID[] = ['0', '1'];
const GOODS_TYPES: JaipurGoodsType[] = ['diamante', 'oro', 'plata', 'tela', 'especias', 'cuero'];
const PREMIUM_GOODS = new Set<JaipurGoodsType>(['diamante', 'oro', 'plata']);

const GOODS_CARD_COUNTS: Record<JaipurCardType, number> = {
  diamante: 6,
  oro: 6,
  plata: 6,
  tela: 8,
  especias: 8,
  cuero: 10,
  camello: 11,
};

const GOODS_TOKEN_VALUES: Record<JaipurGoodsType, number[]> = {
  diamante: [7, 7, 5, 5, 5],
  oro: [6, 6, 5, 5, 5],
  plata: [5, 5, 5, 5, 5],
  tela: [5, 3, 3, 2, 2, 1, 1],
  especias: [5, 3, 3, 2, 2, 1, 1],
  cuero: [4, 3, 3, 2, 2, 1, 1, 1, 1],
};

const BONUS_3_VALUES = [1, 1, 2, 2, 2, 3, 3];
const BONUS_4_VALUES = [4, 4, 5, 5, 6, 6];
const BONUS_5_VALUES = [8, 8, 9, 9, 10];

function cloneGoodsTokens(): Record<JaipurGoodsType, number[]> {
  return {
    diamante: [...GOODS_TOKEN_VALUES.diamante],
    oro: [...GOODS_TOKEN_VALUES.oro],
    plata: [...GOODS_TOKEN_VALUES.plata],
    tela: [...GOODS_TOKEN_VALUES.tela],
    especias: [...GOODS_TOKEN_VALUES.especias],
    cuero: [...GOODS_TOKEN_VALUES.cuero],
  };
}

function createBaseDeck(): JaipurCardType[] {
  const deck: JaipurCardType[] = [];
  for (const [cardType, count] of Object.entries(GOODS_CARD_COUNTS) as Array<[JaipurCardType, number]>) {
    for (let index = 0; index < count; index += 1) {
      deck.push(cardType);
    }
  }

  return deck;
}

function createEmptyPlayer(): JaipurPlayerState {
  return {
    hand: [],
    herdCount: 0,
    goodsTokenValuesWon: [],
    bonusTokenValuesWon: [],
    camelTokenWon: false,
  };
}

function isGoodsCard(card: JaipurCardType): card is JaipurGoodsType {
  return card !== 'camello';
}

function hasJaipurRandom(context: JaipurGameContext): context is JaipurGameContext & { random: JaipurRandomApi } {
  return typeof context.random?.Shuffle === 'function';
}

function getPlayerId(index: number): JaipurPlayerID {
  return index === 0 ? '0' : '1';
}

function getOpponentPlayerID(playerID: JaipurPlayerID): JaipurPlayerID {
  return playerID === '0' ? '1' : '0';
}

function sum(values: number[]): number {
  return values.reduce((accumulator, value) => accumulator + value, 0);
}

function drawCard(G: JaipurState): JaipurCardType | null {
  return G.deck.shift() ?? null;
}

function refillMarket(G: JaipurState): boolean {
  let depletedDuringRefill = false;
  while (G.market.length < 5) {
    const nextCard = drawCard(G);
    if (!nextCard) {
      depletedDuringRefill = true;
      break;
    }
    G.market.push(nextCard);
  }

  return depletedDuringRefill;
}

function getInitialRoundStarter(context: JaipurGameContext): 0 | 1 {
  if (hasJaipurRandom(context) && context.random.Die(2) === 2) {
    return 1;
  }

  return 0;
}

function setupRound(
  G: JaipurState,
  context: JaipurGameContext,
  roundStarterIndex: 0 | 1,
  roundNumber: number,
): JaipurState {
  const deck = hasJaipurRandom(context) ? context.random.Shuffle(createBaseDeck()) : createBaseDeck();
  const market: JaipurCardType[] = ['camello', 'camello', 'camello'];
  const players: Record<JaipurPlayerID, JaipurPlayerState> = {
    '0': createEmptyPlayer(),
    '1': createEmptyPlayer(),
  };

  for (const playerID of PLAYER_IDS) {
    while (players[playerID].hand.length + players[playerID].herdCount < 5) {
      const nextCard = deck.shift();
      if (!nextCard) {
        break;
      }

      if (nextCard === 'camello') {
        players[playerID].herdCount += 1;
      } else {
        players[playerID].hand.push(nextCard);
      }
    }
  }

  while (market.length < 5) {
    const nextCard = deck.shift();
    if (!nextCard) {
      break;
    }
    market.push(nextCard);
  }

  return {
    ...G,
    roundNumber,
    roundStarterIndex,
    lastRoundStarterIndex: roundStarterIndex,
    players,
    deck,
    market,
    discard: [],
    goodsTokens: cloneGoodsTokens(),
    bonusTokens3: hasJaipurRandom(context) ? context.random.Shuffle([...BONUS_3_VALUES]) : [...BONUS_3_VALUES],
    bonusTokens4: hasJaipurRandom(context) ? context.random.Shuffle([...BONUS_4_VALUES]) : [...BONUS_4_VALUES],
    bonusTokens5: hasJaipurRandom(context) ? context.random.Shuffle([...BONUS_5_VALUES]) : [...BONUS_5_VALUES],
    camelTokenAvailable: true,
  };
}

function countDepletedGoodsTypes(goodsTokens: JaipurState['goodsTokens']): number {
  return GOODS_TYPES.reduce((count, goodsType) => count + (goodsTokens[goodsType].length === 0 ? 1 : 0), 0);
}

function getRoundEndReason(G: JaipurState, deckEmptiedDuringRefill: boolean): JaipurRoundEndReason | null {
  if (countDepletedGoodsTypes(G.goodsTokens) >= 3) {
    return 'three-goods-depleted';
  }

  if (deckEmptiedDuringRefill) {
    return 'deck-empty-refill';
  }

  return null;
}

function getRoundTotals(G: JaipurState): Record<JaipurPlayerID, number> {
  const camelWinnerPlayerID =
    G.players['0'].herdCount === G.players['1'].herdCount
      ? null
      : G.players['0'].herdCount > G.players['1'].herdCount
        ? '0'
        : '1';

  return {
    '0':
      sum(G.players['0'].goodsTokenValuesWon) +
      sum(G.players['0'].bonusTokenValuesWon) +
      (camelWinnerPlayerID === '0' && G.camelTokenAvailable ? 5 : 0),
    '1':
      sum(G.players['1'].goodsTokenValuesWon) +
      sum(G.players['1'].bonusTokenValuesWon) +
      (camelWinnerPlayerID === '1' && G.camelTokenAvailable ? 5 : 0),
  };
}

function resolveRound(G: JaipurState, reason: JaipurRoundEndReason): JaipurRoundSummary {
  const totals = getRoundTotals(G);
  const bonusCounts = {
    '0': G.players['0'].bonusTokenValuesWon.length,
    '1': G.players['1'].bonusTokenValuesWon.length,
  };
  const goodsCounts = {
    '0': G.players['0'].goodsTokenValuesWon.length,
    '1': G.players['1'].goodsTokenValuesWon.length,
  };
  const camelWinnerPlayerID =
    G.players['0'].herdCount === G.players['1'].herdCount
      ? null
      : G.players['0'].herdCount > G.players['1'].herdCount
        ? '0'
        : '1';

  let winnerPlayerID: JaipurPlayerID | null = null;
  let winnerBy: JaipurRoundSummary['winnerBy'] = 'empate';

  if (totals['0'] !== totals['1']) {
    winnerPlayerID = totals['0'] > totals['1'] ? '0' : '1';
    winnerBy = 'rupias';
  } else if (bonusCounts['0'] !== bonusCounts['1']) {
    winnerPlayerID = bonusCounts['0'] > bonusCounts['1'] ? '0' : '1';
    winnerBy = 'bonus';
  } else if (goodsCounts['0'] !== goodsCounts['1']) {
    winnerPlayerID = goodsCounts['0'] > goodsCounts['1'] ? '0' : '1';
    winnerBy = 'goods';
  }

  if (camelWinnerPlayerID) {
    G.players[camelWinnerPlayerID].camelTokenWon = true;
    G.camelTokenAvailable = false;
  }

  if (winnerPlayerID) {
    G.matchSeals[winnerPlayerID] += 1;
    if (G.matchSeals[winnerPlayerID] >= 2) {
      G.matchWinnerPlayerID = winnerPlayerID;
    }
  }

  return {
    roundNumber: G.roundNumber,
    winnerPlayerID,
    winnerBy,
    totals,
    bonusCounts,
    goodsCounts,
    camelWinnerPlayerID,
    seals: {
      '0': G.matchSeals['0'],
      '1': G.matchSeals['1'],
    },
    reason,
  };
}

function getNextRoundStarterIndex(summary: JaipurRoundSummary, currentStarterIndex: 0 | 1): 0 | 1 {
  if (summary.winnerPlayerID === null) {
    return currentStarterIndex === 0 ? 1 : 0;
  }

  return summary.winnerPlayerID === '0' ? 1 : 0;
}

function maybeTransitionRound(G: JaipurState, context: JaipurGameContext, reason: JaipurRoundEndReason | null): JaipurRoundSummary | null {
  if (!reason) {
    return null;
  }

  const summary = resolveRound(G, reason);
  G.lastRoundSummary = summary;

  if (G.matchWinnerPlayerID) {
    return summary;
  }

  const nextRoundStarterIndex = getNextRoundStarterIndex(summary, G.lastRoundStarterIndex);
  const nextRoundState = setupRound(G, context, nextRoundStarterIndex, G.roundNumber + 1);

  G.roundNumber = nextRoundState.roundNumber;
  G.roundStarterIndex = nextRoundState.roundStarterIndex;
  G.lastRoundStarterIndex = nextRoundState.lastRoundStarterIndex;
  G.players = nextRoundState.players;
  G.deck = nextRoundState.deck;
  G.market = nextRoundState.market;
  G.discard = nextRoundState.discard;
  G.goodsTokens = nextRoundState.goodsTokens;
  G.bonusTokens3 = nextRoundState.bonusTokens3;
  G.bonusTokens4 = nextRoundState.bonusTokens4;
  G.bonusTokens5 = nextRoundState.bonusTokens5;
  G.camelTokenAvailable = nextRoundState.camelTokenAvailable;
  G.lastRoundSummary = summary;

  return summary;
}

function finishTurn(
  G: JaipurState,
  context: JaipurGameContext,
  events: FnContext['events'],
  playerID: JaipurPlayerID,
  deckEmptiedDuringRefill: boolean,
) {
  const summary = maybeTransitionRound(G, context, getRoundEndReason(G, deckEmptiedDuringRefill));
  if (G.matchWinnerPlayerID) {
    return;
  }

  const nextPlayerID = summary ? getPlayerId(G.roundStarterIndex) : getOpponentPlayerID(playerID);
  events?.endTurn({ next: nextPlayerID });
}

function removeHandCards(hand: JaipurGoodsType[], goodsType: JaipurGoodsType, count: number) {
  for (let removed = 0; removed < count; removed += 1) {
    const index = hand.indexOf(goodsType);
    if (index >= 0) {
      hand.splice(index, 1);
    }
  }
}

function getGoodsCount(hand: JaipurGoodsType[], goodsType: JaipurGoodsType): number {
  return hand.filter((card) => card === goodsType).length;
}

function getBonusStackForCount(G: JaipurState, count: number): number[] | null {
  if (count >= 5) {
    return G.bonusTokens5;
  }

  if (count === 4) {
    return G.bonusTokens4;
  }

  if (count === 3) {
    return G.bonusTokens3;
  }

  return null;
}

function createPlayerView(G: JaipurState, playerID: string | null): unknown {
  const viewerID = playerID === '0' || playerID === '1' ? playerID : null;

  return {
    ...G,
    players: {
      '0': {
        ...G.players['0'],
        hand: viewerID === '0' ? [...G.players['0'].hand] : [],
        handSize: G.players['0'].hand.length,
      },
      '1': {
        ...G.players['1'],
        hand: viewerID === '1' ? [...G.players['1'].hand] : [],
        handSize: G.players['1'].hand.length,
      },
    },
  };
}

const jaipurGame: Game<JaipurState> = {
  name: 'jaipur',
  setup: (context) => {
    const starterIndex = getInitialRoundStarter(context);

    return setupRound(
      {
        roundNumber: 0,
        roundStarterIndex: starterIndex,
        lastRoundStarterIndex: starterIndex,
        matchSeals: { '0': 0, '1': 0 },
        matchWinnerPlayerID: null,
        players: {
          '0': createEmptyPlayer(),
          '1': createEmptyPlayer(),
        },
        deck: [],
        market: [],
        discard: [],
        goodsTokens: cloneGoodsTokens(),
        bonusTokens3: [],
        bonusTokens4: [],
        bonusTokens5: [],
        camelTokenAvailable: true,
        lastRoundSummary: null,
      },
      context,
      starterIndex,
      1,
    );
  },
  turn: {
    order: {
      first: ({ G }) => G.roundStarterIndex,
      next: ({ ctx }) => {
        const nextPosition = (ctx.playOrderPos + 1) % ctx.playOrder.length;
        return nextPosition;
      },
    },
  },
  moves: {
    takeSingleGood: ({ G, playerID, ctx, events, random }, marketIndex: number) => {
      if (!playerID || (playerID !== '0' && playerID !== '1')) {
        return INVALID_MOVE;
      }

      if (!Number.isInteger(marketIndex) || marketIndex < 0 || marketIndex >= G.market.length) {
        return INVALID_MOVE;
      }

      const pickedCard = G.market[marketIndex];
      if (!pickedCard || pickedCard === 'camello') {
        return INVALID_MOVE;
      }

      const player = G.players[playerID];
      if (player.hand.length >= 7) {
        return INVALID_MOVE;
      }

      G.market.splice(marketIndex, 1);
      player.hand.push(pickedCard);
      const deckEmptiedDuringRefill = refillMarket(G);
      finishTurn(G, { ctx, random }, events, playerID, deckEmptiedDuringRefill);
      return G;
    },
    takeAllCamels: ({ G, playerID, ctx, events, random }) => {
      if (!playerID || (playerID !== '0' && playerID !== '1')) {
        return INVALID_MOVE;
      }

      const camelCount = G.market.filter((card) => card === 'camello').length;
      if (camelCount === 0) {
        return INVALID_MOVE;
      }

      G.market = G.market.filter((card) => card !== 'camello');
      G.players[playerID].herdCount += camelCount;
      const deckEmptiedDuringRefill = refillMarket(G);
      finishTurn(G, { ctx, random }, events, playerID, deckEmptiedDuringRefill);
      return G;
    },
    exchangeGoods: ({ G, playerID, ctx, events, random }, payload: ExchangePayload) => {
      if (!playerID || (playerID !== '0' && playerID !== '1')) {
        return INVALID_MOVE;
      }

      if (!payload || !Array.isArray(payload.takeIndices) || !Array.isArray(payload.giveGoods)) {
        return INVALID_MOVE;
      }

      const uniqueTakeIndices = [...new Set(payload.takeIndices)].sort((a, b) => b - a);
      if (uniqueTakeIndices.length < 2) {
        return INVALID_MOVE;
      }

      const marketCards = uniqueTakeIndices
        .map((index) => G.market[index])
        .filter((card): card is JaipurCardType => card !== undefined);
      if (marketCards.length !== uniqueTakeIndices.length || marketCards.some((card) => card === 'camello')) {
        return INVALID_MOVE;
      }

      const takenGoods = marketCards.filter((card): card is JaipurGoodsType => isGoodsCard(card));
      const totalGiven = payload.giveGoods.length + payload.giveCamels;
      if (totalGiven !== uniqueTakeIndices.length || payload.giveCamels < 0) {
        return INVALID_MOVE;
      }

      const player = G.players[playerID];
      if (payload.giveCamels > player.herdCount) {
        return INVALID_MOVE;
      }

      const goodsCounts = new Map<JaipurGoodsType, number>();
      for (const goodsType of payload.giveGoods) {
        goodsCounts.set(goodsType, (goodsCounts.get(goodsType) ?? 0) + 1);
      }

      for (const [goodsType, count] of goodsCounts) {
        if (getGoodsCount(player.hand, goodsType) < count) {
          return INVALID_MOVE;
        }
      }

      const takenTypes = new Set(takenGoods);
      for (const goodsType of goodsCounts.keys()) {
        if (takenTypes.has(goodsType)) {
          return INVALID_MOVE;
        }
      }

      const resultingHandSize = player.hand.length - payload.giveGoods.length + takenGoods.length;
      if (resultingHandSize > 7) {
        return INVALID_MOVE;
      }

      for (const index of uniqueTakeIndices) {
        G.market.splice(index, 1);
      }

      for (const goodsType of payload.giveGoods) {
        removeHandCards(player.hand, goodsType, 1);
        G.market.push(goodsType);
      }

      if (payload.giveCamels > 0) {
        player.herdCount -= payload.giveCamels;
        for (let count = 0; count < payload.giveCamels; count += 1) {
          G.market.push('camello');
        }
      }

      player.hand.push(...takenGoods);
      finishTurn(G, { ctx, random }, events, playerID, false);
      return G;
    },
    sellGoods: ({ G, playerID, ctx, events, random }, goodsType: JaipurGoodsType, count: number) => {
      if (!playerID || (playerID !== '0' && playerID !== '1')) {
        return INVALID_MOVE;
      }

      if (!GOODS_TYPES.includes(goodsType) || !Number.isInteger(count) || count <= 0) {
        return INVALID_MOVE;
      }

      const player = G.players[playerID];
      const availableCount = getGoodsCount(player.hand, goodsType);
      if (availableCount < count) {
        return INVALID_MOVE;
      }

      if (PREMIUM_GOODS.has(goodsType) && count < 2) {
        return INVALID_MOVE;
      }

      removeHandCards(player.hand, goodsType, count);
      for (let sold = 0; sold < count; sold += 1) {
        G.discard.push(goodsType);
        const tokenValue = G.goodsTokens[goodsType].shift();
        if (tokenValue !== undefined) {
          player.goodsTokenValuesWon.push(tokenValue);
        }
      }

      const bonusStack = getBonusStackForCount(G, count);
      const bonusValue = bonusStack?.shift();
      if (bonusValue !== undefined) {
        player.bonusTokenValuesWon.push(bonusValue);
      }

      finishTurn(G, { ctx, random }, events, playerID, false);
      return G;
    },
  },
  endIf: ({ G }) => {
    if (!G.matchWinnerPlayerID) {
      return undefined;
    }

    return {
      winner: G.matchWinnerPlayerID,
      seals: G.matchSeals,
      rounds: G.roundNumber,
      lastRoundSummary: G.lastRoundSummary,
    };
  },
  playerView: ({ G, playerID }) => createPlayerView(G, playerID),
};

export const jaipurDefinition: BoardGameDefinition = {
  gameKey: 'jaipur',
  title: 'Jaipur',
  description: 'Duelo comercial de bazar con mercado compartido, camellos y ventas tensas.',
  minPlayers: 2,
  maxPlayers: 2,
  game: jaipurGame,
};
