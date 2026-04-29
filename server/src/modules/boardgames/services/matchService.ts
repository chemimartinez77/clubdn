import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';
import { CreateGameReducer, InitializeGame, ProcessGameConfig } from 'boardgame.io/internal';
import type { State } from 'boardgame.io';
import { prisma } from '../../../config/database';
import { getBoardGameDefinition, listBoardGames } from '../games/registry';
import type { MatchMoveInput } from '../types/contracts';
import type {
  MultiplayerEngineViewDto,
  MultiplayerGameInfoDto,
  MultiplayerMatchDto,
  MultiplayerMatchSnapshotDto,
  MultiplayerPlayerDto,
} from '../types/dto';

type MatchWithRelations = Prisma.MultiplayerMatchGetPayload<{
  include: {
    seats: {
      include: {
        user: {
          select: {
            id: true;
            name: true;
            profile: {
              select: {
                nick: true;
              };
            };
          };
        };
      };
    };
  };
}>;

interface CreateMatchInput {
  ownerUserId: string;
  gameKey: string;
  visibility?: 'PRIVATE' | 'CLUB' | 'INVITE_ONLY';
  maxPlayers?: number;
}

interface MatchViewer {
  userId: string;
}

export class MatchError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}

const matchInclude = {
  seats: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          profile: {
            select: {
              nick: true,
            },
          },
        },
      },
    },
    orderBy: {
      playerIndex: 'asc',
    },
  },
} as const;

function assertGameDefinition(gameKey: string) {
  const definition = getBoardGameDefinition(gameKey);
  if (!definition) {
    throw new MatchError('Juego multijugador no soportado', 400);
  }

  return definition;
}

function getActiveSeats(seats: MatchWithRelations['seats']): MatchWithRelations['seats'] {
  return seats.filter((seat) => seat.leftAt === null);
}

function canViewMatch(match: MatchWithRelations, userId: string): boolean {
  if (match.ownerUserId === userId) {
    return true;
  }

  if (match.visibility === 'CLUB') {
    return true;
  }

  return match.seats.some((seat) => seat.userId === userId && seat.leftAt === null);
}

function canJoinMatch(match: MatchWithRelations, userId: string): boolean {
  if (match.status !== 'LOBBY') {
    return false;
  }

  if (match.visibility !== 'CLUB') {
    return false;
  }

  const activeSeats = getActiveSeats(match.seats);
  if (activeSeats.some((seat) => seat.userId === userId)) {
    return false;
  }

  return activeSeats.length < match.maxPlayers;
}

function getViewerSeat(match: MatchWithRelations, userId: string) {
  return match.seats.find((seat) => seat.userId === userId && seat.leftAt === null) ?? null;
}

function getPlayerDto(match: MatchWithRelations, seat: MatchWithRelations['seats'][number]): MultiplayerPlayerDto {
  return {
    userId: seat.userId,
    name: seat.user.name,
    nick: seat.user.profile?.nick ?? null,
    playerIndex: seat.playerIndex,
    isReady: seat.isReady,
    joinedAt: seat.joinedAt.toISOString(),
    leftAt: seat.leftAt?.toISOString() ?? null,
    isOwner: match.ownerUserId === seat.userId,
  };
}

function buildEngineView(match: MatchWithRelations, viewerUserId: string): MultiplayerEngineViewDto | null {
  if (!match.engineState || match.status === 'LOBBY') {
    return null;
  }

  const definition = assertGameDefinition(match.gameKey);
  const processedGame = ProcessGameConfig(definition.game);
  const state = match.engineState as unknown as State;
  const viewerSeat = getViewerSeat(match, viewerUserId);
  const playerID = viewerSeat ? String(viewerSeat.playerIndex) : null;
  const playerView = processedGame.playerView ?? (({ G }: { G: unknown }) => G);

  return {
    G: playerView({ G: state.G, ctx: state.ctx, playerID }),
    ctx: state.ctx,
    stateId: state._stateID,
    playerID,
    isYourTurn: playerID !== null && state.ctx.currentPlayer === playerID,
  };
}

function buildMatchDto(match: MatchWithRelations, viewerUserId: string): MultiplayerMatchDto {
  const definition = assertGameDefinition(match.gameKey);
  const activeSeats = getActiveSeats(match.seats);
  const viewerSeat = getViewerSeat(match, viewerUserId);

  return {
    id: match.id,
    gameKey: definition.gameKey,
    gameTitle: definition.title,
    gameDescription: definition.description,
    status: match.status,
    visibility: match.visibility,
    ownerUserId: match.ownerUserId,
    minPlayers: match.minPlayers,
    maxPlayers: match.maxPlayers,
    winnerUserId: match.winnerUserId,
    startedAt: match.startedAt?.toISOString() ?? null,
    finishedAt: match.finishedAt?.toISOString() ?? null,
    createdAt: match.createdAt.toISOString(),
    updatedAt: match.updatedAt.toISOString(),
    currentPlayers: activeSeats.length,
    mePlayerIndex: viewerSeat?.playerIndex ?? null,
    canJoin: canJoinMatch(match, viewerUserId),
    canStart:
      match.status === 'LOBBY' &&
      match.ownerUserId === viewerUserId &&
      activeSeats.length >= match.minPlayers,
    players: activeSeats.map((seat) => getPlayerDto(match, seat)),
    result: match.result,
  };
}

function buildSnapshot(match: MatchWithRelations, viewerUserId: string): MultiplayerMatchSnapshotDto {
  return {
    match: buildMatchDto(match, viewerUserId),
    engine: buildEngineView(match, viewerUserId),
  };
}

async function getMatchOrThrow(tx: PrismaClient | Prisma.TransactionClient, matchId: string): Promise<MatchWithRelations> {
  const match = await tx.multiplayerMatch.findUnique({
    where: { id: matchId },
    include: matchInclude,
  });

  if (!match) {
    throw new MatchError('Partida no encontrada', 404);
  }

  return match;
}

function sanitizeEngineState(state: State): State {
  const { transients: _transients, ...cleanState } = state as State & { transients?: unknown };
  return cleanState;
}

function getNextAvailablePlayerIndex(match: MatchWithRelations): number {
  const occupied = new Set(getActiveSeats(match.seats).map((seat) => seat.playerIndex));
  for (let index = 0; index < match.maxPlayers; index += 1) {
    if (!occupied.has(index)) {
      return index;
    }
  }

  throw new MatchError('La partida ya está completa', 400);
}

function getWinnerUserId(match: MatchWithRelations, gameover: unknown): string | null {
  if (!gameover || typeof gameover !== 'object') {
    return null;
  }

  const winnerPlayerID = (gameover as { winner?: string }).winner;
  if (!winnerPlayerID) {
    return null;
  }

  const winnerSeat = match.seats.find((seat) => String(seat.playerIndex) === winnerPlayerID && seat.leftAt === null);
  return winnerSeat?.userId ?? null;
}

export async function listGameCatalog(): Promise<MultiplayerGameInfoDto[]> {
  return listBoardGames().map((definition) => ({
    gameKey: definition.gameKey,
    title: definition.title,
    description: definition.description,
    minPlayers: definition.minPlayers,
    maxPlayers: definition.maxPlayers,
  }));
}

export async function listMatchesForUser(viewer: MatchViewer): Promise<MultiplayerMatchDto[]> {
  const matches = await prisma.multiplayerMatch.findMany({
    where: {
      OR: [
        { ownerUserId: viewer.userId },
        { visibility: 'CLUB' },
        {
          seats: {
            some: {
              userId: viewer.userId,
              leftAt: null,
            },
          },
        },
      ],
    },
    include: matchInclude,
    orderBy: [
      { status: 'asc' },
      { updatedAt: 'desc' },
    ],
    take: 40,
  });

  return matches
    .filter((match) => canViewMatch(match, viewer.userId))
    .map((match) => buildMatchDto(match, viewer.userId));
}

export async function createMatch(input: CreateMatchInput): Promise<MultiplayerMatchSnapshotDto> {
  const definition = assertGameDefinition(input.gameKey);
  const maxPlayers = input.maxPlayers ?? definition.maxPlayers;

  if (maxPlayers < definition.minPlayers || maxPlayers > definition.maxPlayers) {
    throw new MatchError('Número de jugadores no válido para este juego', 400);
  }

  const match = await prisma.multiplayerMatch.create({
    data: {
      gameKey: definition.gameKey,
      visibility: input.visibility ?? 'CLUB',
      ownerUserId: input.ownerUserId,
      minPlayers: definition.minPlayers,
      maxPlayers,
      seats: {
        create: {
          userId: input.ownerUserId,
          playerIndex: 0,
          isReady: true,
        },
      },
    },
    include: matchInclude,
  });

  return buildSnapshot(match, input.ownerUserId);
}

export async function getMatchSnapshot(matchId: string, viewer: MatchViewer): Promise<MultiplayerMatchSnapshotDto> {
  const match = await getMatchOrThrow(prisma, matchId);
  if (!canViewMatch(match, viewer.userId)) {
    throw new MatchError('No tienes acceso a esta partida', 403);
  }

  return buildSnapshot(match, viewer.userId);
}

export async function joinMatch(matchId: string, viewer: MatchViewer): Promise<MultiplayerMatchSnapshotDto> {
  return prisma.$transaction(async (tx) => {
    const match = await getMatchOrThrow(tx, matchId);

    if (!canJoinMatch(match, viewer.userId)) {
      throw new MatchError('No puedes unirte a esta partida', 400);
    }

    const existingSeat = match.seats.find((seat) => seat.userId === viewer.userId);
    if (existingSeat) {
      await tx.multiplayerMatchSeat.update({
        where: { id: existingSeat.id },
        data: {
          leftAt: null,
          isReady: true,
        },
      });
    } else {
      await tx.multiplayerMatchSeat.create({
        data: {
          matchId,
          userId: viewer.userId,
          playerIndex: getNextAvailablePlayerIndex(match),
          isReady: true,
        },
      });
    }

    const updated = await getMatchOrThrow(tx, matchId);
    return buildSnapshot(updated, viewer.userId);
  });
}

export async function leaveMatch(matchId: string, viewer: MatchViewer): Promise<MultiplayerMatchSnapshotDto> {
  return prisma.$transaction(async (tx) => {
    const match = await getMatchOrThrow(tx, matchId);
    const seat = getViewerSeat(match, viewer.userId);

    if (!seat) {
      throw new MatchError('No formas parte de esta partida', 400);
    }

    await tx.multiplayerMatchSeat.update({
      where: { id: seat.id },
      data: {
        leftAt: new Date(),
        isReady: false,
      },
    });

    const updated = await getMatchOrThrow(tx, matchId);
    const activeSeats = getActiveSeats(updated.seats);

    if (activeSeats.length === 0) {
      await tx.multiplayerMatch.update({
        where: { id: matchId },
        data: {
          status: 'ABANDONED',
          finishedAt: new Date(),
        },
      });
    }

    const finalMatch = await getMatchOrThrow(tx, matchId);
    return buildSnapshot(finalMatch, viewer.userId);
  });
}

export async function startMatch(matchId: string, viewer: MatchViewer): Promise<MultiplayerMatchSnapshotDto> {
  return prisma.$transaction(async (tx) => {
    const match = await getMatchOrThrow(tx, matchId);
    if (match.ownerUserId !== viewer.userId) {
      throw new MatchError('Solo el creador puede iniciar la partida', 403);
    }

    if (match.status !== 'LOBBY') {
      throw new MatchError('La partida ya ha comenzado', 400);
    }

    const activeSeats = getActiveSeats(match.seats);
    if (activeSeats.length < match.minPlayers) {
      throw new MatchError('No hay suficientes jugadores para empezar', 400);
    }

    const definition = assertGameDefinition(match.gameKey);
    const processedGame = ProcessGameConfig(definition.game);
    const initialState = InitializeGame({
      game: processedGame,
      numPlayers: activeSeats.length,
    });

    await tx.multiplayerMatch.update({
      where: { id: matchId },
      data: {
        status: 'ACTIVE',
        startedAt: new Date(),
        engineState: sanitizeEngineState(initialState) as unknown as Prisma.InputJsonValue,
      },
    });

    const updated = await getMatchOrThrow(tx, matchId);
    return buildSnapshot(updated, viewer.userId);
  });
}

export async function restartMatch(matchId: string, viewer: MatchViewer): Promise<MultiplayerMatchSnapshotDto> {
  return prisma.$transaction(async (tx) => {
    const match = await getMatchOrThrow(tx, matchId);
    if (match.ownerUserId !== viewer.userId) {
      throw new MatchError('Solo el creador puede reiniciar la partida', 403);
    }

    if (match.status === 'ABANDONED') {
      throw new MatchError('No se puede reiniciar una partida abandonada', 400);
    }

    const activeSeats = getActiveSeats(match.seats);
    if (activeSeats.length < match.minPlayers) {
      throw new MatchError('No hay suficientes jugadores activos para reiniciar la partida', 400);
    }

    const definition = assertGameDefinition(match.gameKey);
    const processedGame = ProcessGameConfig(definition.game);
    const initialState = InitializeGame({
      game: processedGame,
      numPlayers: activeSeats.length,
    });

    await tx.multiplayerMatch.update({
      where: { id: matchId },
      data: {
        status: 'ACTIVE',
        startedAt: new Date(),
        finishedAt: null,
        winnerUserId: null,
        result: Prisma.JsonNull,
        engineState: sanitizeEngineState(initialState) as unknown as Prisma.InputJsonValue,
      },
    });

    const updated = await getMatchOrThrow(tx, matchId);
    return buildSnapshot(updated, viewer.userId);
  });
}

export async function applyMoveToMatch(
  matchId: string,
  viewer: MatchViewer,
  move: MatchMoveInput,
): Promise<MultiplayerMatchSnapshotDto> {
  return prisma.$transaction(async (tx) => {
    const match = await getMatchOrThrow(tx, matchId);
    if (match.status !== 'ACTIVE' || !match.engineState) {
      throw new MatchError('La partida no está activa', 400);
    }

    const seat = getViewerSeat(match, viewer.userId);
    if (!seat) {
      throw new MatchError('No perteneces a esta partida', 403);
    }

    const definition = assertGameDefinition(match.gameKey);
    const processedGame = ProcessGameConfig(definition.game);
    const reducer = CreateGameReducer({ game: processedGame });
    const currentState = match.engineState as unknown as State;

    const action = {
      type: 'MAKE_MOVE' as const,
      payload: {
        type: move.type,
        args: move.args ?? [],
        playerID: String(seat.playerIndex),
        credentials: '',
      },
    };

    const nextState = reducer(currentState, action);
    const transientError = (nextState as State & { transients?: { error?: unknown } }).transients?.error;
    if (transientError || nextState._stateID === currentState._stateID) {
      throw new MatchError('Movimiento inválido para el estado actual', 422);
    }

    const cleanState = sanitizeEngineState(nextState);
    const gameover = cleanState.ctx.gameover;
    const shouldFinish = gameover !== undefined;

    await tx.multiplayerMatch.update({
      where: { id: matchId },
      data: {
        engineState: cleanState as unknown as Prisma.InputJsonValue,
        status: shouldFinish ? 'FINISHED' : 'ACTIVE',
        winnerUserId: shouldFinish ? getWinnerUserId(match, gameover) : null,
        ...(shouldFinish ? { result: gameover as Prisma.InputJsonValue } : {}),
        finishedAt: shouldFinish ? new Date() : null,
      },
    });

    const updated = await getMatchOrThrow(tx, matchId);
    return buildSnapshot(updated, viewer.userId);
  });
}
