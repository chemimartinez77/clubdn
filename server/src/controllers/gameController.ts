// server/src/controllers/gameController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { getRPGGeekItem } from '../services/bggService';
import { ensureGameFromBgg } from '../services/gameCatalogService';

const combatZoneGameFallbacks: Record<string, { id: string; name: string; image: null; thumbnail: null }> = {
  '230802': { id: '230802', name: 'Azul', image: null, thumbnail: null },
  '173346': { id: '173346', name: '7 Wonders Duel', image: null, thumbnail: null },
  '43570': { id: '43570', name: 'Viernes', image: null, thumbnail: null },
};

/**
 * Obtener o crear un juego en la base de datos
 * Si el juego ya existe, lo devuelve. Si no, lo busca en BGG y lo guarda.
 */
export const getOrCreateGame = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        message: 'Game ID is required'
      });
    }

    const { game, created } = await ensureGameFromBgg(gameId, { refreshIfExists: true });

    return res.json({
      success: true,
      data: game,
      cached: !created
    });
  } catch (error) {
    console.error('[GAME] Error al obtener/crear juego:', error);
    if (error instanceof Error && error.message === 'Game not found in BoardGameGeek') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Error retrieving or creating game'
    });
  }
};

/**
 * Actualizar datos de un juego desde BGG
 */
export const refreshGame = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;

    if (!gameId) {
      return res.status(400).json({
        success: false,
        message: 'Game ID is required'
      });
    }

    const { game } = await ensureGameFromBgg(gameId, { refreshIfExists: true });

    console.log(`[GAME] Juego ${game.name} actualizado en BD`);

    return res.json({
      success: true,
      data: game
    });
  } catch (error) {
    console.error('[GAME] Error al actualizar juego:', error);
    if (error instanceof Error && error.message === 'Game not found in BoardGameGeek') {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Error refreshing game'
    });
  }
};

/**
 * Listar todos los juegos en la base de datos
 */
export const listGames = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 50, search } = req.query;
    const currentPage = Number(page);
    const currentPageSize = Number(pageSize);
    const normalizedSearch = typeof search === 'string'
      ? search.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      : '';
    const now = new Date();

    const candidateEvents = await prisma.event.findMany({
      where: {
        type: 'PARTIDA',
        status: { not: 'CANCELLED' },
        AND: [
          {
            OR: [
              { status: { in: ['ONGOING', 'COMPLETED'] } },
              { status: 'SCHEDULED', date: { lte: now } }
            ]
          },
          {
            OR: [
              { bggId: { not: null } },
              { gameName: { not: null } }
            ]
          }
        ]
      },
      orderBy: [
        { date: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        title: true,
        date: true,
        gameName: true,
        game: {
          select: {
            id: true,
            name: true,
            alternateNames: true,
            yearPublished: true,
            image: true,
            thumbnail: true,
            minPlayers: true,
            maxPlayers: true,
            playingTime: true,
            averageRating: true,
            rank: true,
            complexityRating: true
          }
        }
      }
    });

    const normalize = (value: string) =>
      value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const unresolvedGameNames = [...new Set(
      candidateEvents
        .filter((event) => !event.game && event.gameName)
        .map((event) => event.gameName!.trim())
        .filter(Boolean)
    )];

    const fallbackGames = unresolvedGameNames.length > 0
      ? await prisma.game.findMany({
          where: {
            name: {
              in: unresolvedGameNames
            }
          },
          select: {
            id: true,
            name: true,
            alternateNames: true,
            yearPublished: true,
            image: true,
            thumbnail: true,
            minPlayers: true,
            maxPlayers: true,
            playingTime: true,
            averageRating: true,
            rank: true,
            complexityRating: true
          }
        })
      : [];

    const fallbackGamesByName = new Map(
      fallbackGames.map((game) => [normalize(game.name), game])
    );

    const uniqueGames = new Map<string, {
      id: string;
      name: string;
      alternateNames: string[];
      yearPublished: number | null;
      image: string | null;
      thumbnail: string | null;
      minPlayers: number | null;
      maxPlayers: number | null;
      playingTime: number | null;
      averageRating: number | null;
      rank: number | null;
      complexityRating: number | null;
      latestEvent: {
        id: string;
        title: string;
        date: string;
      } | null;
    }>();

    for (const event of candidateEvents) {
      const resolvedGame = event.game ?? (event.gameName ? fallbackGamesByName.get(normalize(event.gameName)) : null);
      if (!resolvedGame) continue;
      if (uniqueGames.has(resolvedGame.id)) continue;

      uniqueGames.set(resolvedGame.id, {
        ...resolvedGame,
        latestEvent: {
          id: event.id,
          title: event.title,
          date: event.date.toISOString()
        }
      });
    }

    const filteredGames = Array.from(uniqueGames.values())
      .filter((game) => {
        if (!normalizedSearch) return true;

        const searchableFields = [game.name, ...game.alternateNames];
        return searchableFields.some((field) => normalize(field).includes(normalizedSearch));
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

    const totalGames = filteredGames.length;
    const games = filteredGames.slice(
      (currentPage - 1) * currentPageSize,
      currentPage * currentPageSize
    );

    return res.json({
      success: true,
      data: {
        games,
        pagination: {
          currentPage,
          pageSize: currentPageSize,
          totalGames,
          totalPages: Math.ceil(totalGames / currentPageSize)
        }
      }
    });
  } catch (error) {
    console.error('[GAME] Error al listar juegos:', error);
    return res.status(500).json({
      success: false,
      message: 'Error listing games'
    });
  }
};

/**
 * Obtener info básica de un juego (solo BD, sin llamar a BGG)
 * Usado para mostrar imagen/nombre en grids de navegación
 */
export const getGameBasicInfo = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    let game = await prisma.game.findUnique({
      where: { id: gameId },
      select: { id: true, name: true, image: true, thumbnail: true },
    });

    if (!game) {
      try {
        const ensured = await ensureGameFromBgg(gameId, { refreshIfExists: false });
        game = {
          id: ensured.game.id,
          name: ensured.game.name,
          image: ensured.game.image,
          thumbnail: ensured.game.thumbnail,
        };
      } catch (error) {
        const fallbackGame = combatZoneGameFallbacks[gameId];
        if (fallbackGame) {
          console.warn(`[GAME] Usando fallback local para ${gameId} al no poder cargar BGG`);
          game = fallbackGame;
        } else {
          throw error;
        }
      }
    }

    return res.json({ success: true, data: game });
  } catch (error) {
    console.error('[GAME] Error al obtener info del juego:', error);
    if (error instanceof Error && error.message === 'Game not found in BoardGameGeek') {
      return res.status(404).json({ success: false, message: error.message });
    }
    return res.status(500).json({ success: false, message: 'Error fetching game info' });
  }
};

/**
 * GET /api/games/rpgg/:gameId
 * Obtener o crear un juego de RPGGeek en la tabla Game (id con prefijo "rpgg-")
 */
export const getOrCreateRPGGame = async (req: Request, res: Response) => {
  try {
    const { gameId } = req.params;
    if (!gameId) {
      return res.status(400).json({ success: false, message: 'Game ID is required' });
    }

    const prefixedId = gameId.startsWith('rpgg-') ? gameId : `rpgg-${gameId}`;

    // Comprobar si ya existe en BD
    let game = await prisma.game.findUnique({ where: { id: prefixedId } });

    if (game) {
      // Actualizar imágenes si han cambiado (llamada ligera)
      const rpggItem = await getRPGGeekItem(prefixedId);
      if (rpggItem && (game.image !== rpggItem.image || game.thumbnail !== rpggItem.thumbnail)) {
        game = await prisma.game.update({
          where: { id: prefixedId },
          data: { image: rpggItem.image, thumbnail: rpggItem.thumbnail, lastSyncedAt: new Date() }
        });
      }
      return res.json({ success: true, data: game, cached: true });
    }

    // No existe — obtener datos completos y guardar
    const rpggItem = await getRPGGeekItem(prefixedId);
    if (!rpggItem) {
      return res.status(404).json({ success: false, message: 'Game not found in RPGGeek' });
    }

    game = await prisma.game.create({
      data: {
        id: prefixedId,
        name: rpggItem.name,
        alternateNames: rpggItem.alternateNames,
        description: rpggItem.description,
        yearPublished: rpggItem.yearPublished,
        image: rpggItem.image,
        thumbnail: rpggItem.thumbnail,
        minPlayers: rpggItem.minPlayers,
        maxPlayers: rpggItem.maxPlayers,
        playingTime: rpggItem.playingTime,
        minPlaytime: rpggItem.minPlaytime,
        maxPlaytime: rpggItem.maxPlaytime,
        minAge: rpggItem.minAge,
        usersRated: rpggItem.usersRated,
        averageRating: rpggItem.averageRating,
        bayesAverage: rpggItem.bayesAverage,
        rank: rpggItem.rank,
        complexityRating: rpggItem.complexityRating,
        numOwned: rpggItem.numOwned,
        numWanting: rpggItem.numWanting,
        numWishing: rpggItem.numWishing,
        numComments: rpggItem.numComments,
        categories: rpggItem.categories,
        mechanics: rpggItem.mechanics,
        families: rpggItem.families,
        designers: rpggItem.designers,
        artists: rpggItem.artists,
        publishers: rpggItem.publishers,
        lastSyncedAt: new Date()
      }
    });

    console.log(`[GAME] RPGGeek juego ${game.name} guardado en BD con id ${prefixedId}`);
    return res.json({ success: true, data: game, cached: false });
  } catch (error) {
    console.error('[GAME] Error al obtener/crear juego de RPGGeek:', error);
    return res.status(500).json({ success: false, message: 'Error retrieving or creating RPG game' });
  }
};
