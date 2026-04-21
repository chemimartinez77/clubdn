import { prisma } from '../config/database';
import { getBGGGameFull } from './bggService';

interface EnsureGameOptions {
  refreshIfExists?: boolean;
}

interface EnsureGameResult {
  game: Awaited<ReturnType<typeof prisma.game.findUniqueOrThrow>>;
  created: boolean;
}

function mapBggGameToGameData(bggGame: NonNullable<Awaited<ReturnType<typeof getBGGGameFull>>>) {
  return {
    name: bggGame.name,
    alternateNames: bggGame.alternateNames,
    description: bggGame.description,
    yearPublished: bggGame.yearPublished,
    image: bggGame.image || null,
    thumbnail: bggGame.thumbnail || null,
    minPlayers: bggGame.minPlayers,
    maxPlayers: bggGame.maxPlayers,
    playingTime: bggGame.playingTime,
    minPlaytime: bggGame.minPlaytime,
    maxPlaytime: bggGame.maxPlaytime,
    minAge: bggGame.minAge,
    usersRated: bggGame.usersRated,
    averageRating: bggGame.averageRating,
    bayesAverage: bggGame.bayesAverage,
    rank: bggGame.rank,
    strategyRank: bggGame.strategyRank,
    complexityRating: bggGame.complexityRating,
    numOwned: bggGame.numOwned,
    numWanting: bggGame.numWanting,
    numWishing: bggGame.numWishing,
    numComments: bggGame.numComments,
    categories: bggGame.categories,
    mechanics: bggGame.mechanics,
    families: bggGame.families,
    designers: bggGame.designers,
    artists: bggGame.artists,
    publishers: bggGame.publishers,
    isExpansion: bggGame.isExpansion,
    lastSyncedAt: new Date(),
  };
}

export async function ensureGameFromBgg(gameId: string, options: EnsureGameOptions = {}): Promise<EnsureGameResult> {
  const existing = await prisma.game.findUnique({
    where: { id: gameId },
  });

  if (existing && !options.refreshIfExists) {
    return { game: existing, created: false };
  }

  const bggGame = await getBGGGameFull(gameId);
  if (!bggGame) {
    throw new Error('Game not found in BoardGameGeek');
  }

  const game = await prisma.game.upsert({
    where: { id: gameId },
    create: {
      id: bggGame.id,
      ...mapBggGameToGameData(bggGame),
    },
    update: mapBggGameToGameData(bggGame),
  });

  return { game, created: !existing };
}

export function estimateBggSyncSeconds(newCatalogItems: number, totalOperations: number): number {
  const perNewGameSeconds = 2;
  const perOperationSeconds = 0.25;
  return Math.max(15, Math.ceil((newCatalogItems * perNewGameSeconds) + (totalOperations * perOperationSeconds)));
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
