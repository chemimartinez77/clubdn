// server/src/controllers/gameController.ts
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getBGGGameFull } from '../services/bggService';

const prisma = new PrismaClient();

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

    // Buscar en BGG siempre para obtener URLs actualizadas
    console.log(`[GAME] Buscando juego ${gameId} en BGG...`);
    const bggGame = await getBGGGameFull(gameId);

    if (!bggGame) {
      return res.status(404).json({
        success: false,
        message: 'Game not found in BoardGameGeek'
      });
    }

    // Verificar si el juego ya existe en la base de datos
    let game = await prisma.game.findUnique({
      where: { id: gameId }
    });

    if (game) {
      // Actualizar las URLs de imagen si han cambiado
      if (game.image !== bggGame.image || game.thumbnail !== bggGame.thumbnail) {
        console.log(`[GAME] Actualizando URLs de imagen para ${game.name}...`);
        game = await prisma.game.update({
          where: { id: gameId },
          data: {
            image: bggGame.image,
            thumbnail: bggGame.thumbnail,
            lastSyncedAt: new Date()
          }
        });
        console.log(`[GAME] URLs actualizadas para ${game.name}`);
      }

      return res.json({
        success: true,
        data: game,
        cached: true
      });
    }

    // Si no existe, guardar en la base de datos
    game = await prisma.game.create({
      data: {
        id: bggGame.id,
        name: bggGame.name,
        alternateNames: bggGame.alternateNames,
        description: bggGame.description,
        yearPublished: bggGame.yearPublished,
        image: bggGame.image,
        thumbnail: bggGame.thumbnail,
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
        lastSyncedAt: new Date()
      }
    });

    console.log(`[GAME] Juego ${game.name} guardado en BD`);

    return res.json({
      success: true,
      data: game,
      cached: false
    });
  } catch (error) {
    console.error('[GAME] Error al obtener/crear juego:', error);
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

    console.log(`[GAME] Actualizando juego ${gameId} desde BGG...`);
    const bggGame = await getBGGGameFull(gameId);

    if (!bggGame) {
      return res.status(404).json({
        success: false,
        message: 'Game not found in BoardGameGeek'
      });
    }

    // Actualizar en la base de datos (upsert)
    const game = await prisma.game.upsert({
      where: { id: gameId },
      create: {
        id: bggGame.id,
        name: bggGame.name,
        alternateNames: bggGame.alternateNames,
        description: bggGame.description,
        yearPublished: bggGame.yearPublished,
        image: bggGame.image,
        thumbnail: bggGame.thumbnail,
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
        lastSyncedAt: new Date()
      },
      update: {
        name: bggGame.name,
        alternateNames: bggGame.alternateNames,
        description: bggGame.description,
        yearPublished: bggGame.yearPublished,
        image: bggGame.image,
        thumbnail: bggGame.thumbnail,
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
        lastSyncedAt: new Date()
      }
    });

    console.log(`[GAME] Juego ${game.name} actualizado en BD`);

    return res.json({
      success: true,
      data: game
    });
  } catch (error) {
    console.error('[GAME] Error al actualizar juego:', error);
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

    const where: any = {};

    if (search && typeof search === 'string') {
      // Buscar tanto en el nombre principal como en los nombres alternativos
      // Usamos alternateNames con array_to_string para búsqueda parcial
      where.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];

      // También buscar en los juegos donde algún nombre alternativo contiene el término
      const gamesWithAltNames = await prisma.$queryRaw`
        SELECT id FROM "Game"
        WHERE array_to_string("alternateNames", '|') ILIKE ${'%' + search + '%'}
      `;

      if (Array.isArray(gamesWithAltNames) && gamesWithAltNames.length > 0) {
        where.OR.push({
          id: {
            in: gamesWithAltNames.map((g: any) => g.id)
          }
        });
      }
    }

    const [games, totalGames] = await Promise.all([
      prisma.game.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
        select: {
          id: true,
          name: true,
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
      }),
      prisma.game.count({ where })
    ]);

    return res.json({
      success: true,
      data: {
        games,
        pagination: {
          currentPage: Number(page),
          pageSize: Number(pageSize),
          totalGames,
          totalPages: Math.ceil(totalGames / Number(pageSize))
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
