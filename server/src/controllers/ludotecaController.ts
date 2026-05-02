// server/src/controllers/ludotecaController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { GameType, GameCondition, Prisma } from '@prisma/client';
import { getRPGGeekItem } from '../services/bggService';
import { buildClubOwnerWhere, buildParticularOwnerWhere, isClubOwnerEmail } from '../utils/libraryOwnership';

/**
 * Obtener todos los items de la ludoteca con filtros opcionales
 */
export const getLibraryItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      search,
      gameType,
      condition,
      ownerEmail,
      page = '1',
      limit = '50',
      sortBy = 'name',
      sortOrder = 'asc',
      includeExpansions = 'false'
    } = req.query;

    const showExpansions = includeExpansions === 'true';

    // Construir filtros
    const andClauses: Prisma.LibraryItemWhereInput[] = [{ bajaAt: null }];
    const where: Prisma.LibraryItemWhereInput = {};

    if (search && typeof search === 'string') {
      const term = search.trim();
      const matchingBggIds = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Game"
        WHERE name ILIKE ${'%' + term + '%'}
           OR EXISTS (
             SELECT 1 FROM unnest("alternateNames") AS alt
             WHERE alt ILIKE ${'%' + term + '%'}
           )
      `;
      const bggIds = matchingBggIds.map((r) => r.id);
      andClauses.push({
        OR: [
        { name: { contains: term, mode: 'insensitive' } },
        { bggId: { in: bggIds } },
        ],
      });
    }

    if (gameType && typeof gameType === 'string') {
      andClauses.push({ gameType: gameType as GameType });
    }

    if (condition && typeof condition === 'string') {
      andClauses.push({ condition: condition as GameCondition });
    }

    if (ownerEmail && typeof ownerEmail === 'string') {
      if (ownerEmail === 'club') {
        andClauses.push(buildClubOwnerWhere());
      } else {
        andClauses.push({ ownerEmail });
      }
    }

    // Filtrar expansiones si no se solicitan explícitamente
    if (!showExpansions) {
      const noExpansion = { OR: [{ bggId: null }, { game: { isExpansion: false } }] };
      andClauses.push(noExpansion);
    }

    where.AND = andClauses;

    // Paginación
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Ordenamiento
    const orderBy: any = {};
    if (sortBy === 'name' || sortBy === 'internalId' || sortBy === 'acquisitionDate') {
      orderBy[sortBy] = sortOrder === 'desc' ? 'desc' : 'asc';
    } else {
      orderBy.name = 'asc';
    }

    // Obtener items y contar total
    const [items, total] = await Promise.all([
      prisma.libraryItem.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          game: { select: { isExpansion: true, parentBggId: true } },
          ownerUser: { select: { id: true, name: true, profile: { select: { nick: true } } } },
          donorUser: { select: { id: true, name: true, profile: { select: { nick: true } } } },
        }
      }),
      prisma.libraryItem.count({ where })
    ]);

    // Para expansiones: obtener el nombre del juego base
    const parentBggIds = items
      .filter(i => i.game?.isExpansion && i.game?.parentBggId)
      .map(i => i.game!.parentBggId!);
    const parentGames = parentBggIds.length > 0
      ? await prisma.game.findMany({ where: { id: { in: parentBggIds } }, select: { id: true, name: true } })
      : [];
    const parentGameMap = new Map(parentGames.map(g => [g.id, g.name]));

    // Para cada item ROL sin thumbnail cacheado, consultar RPGGeek y guardarlo.
    // Para el resto, el thumbnail ya viene en el propio item (campo de BD).
    const itemsWithThumbnails = await Promise.all(
      items.map(async (item) => {
        const { game, ownerUser, donorUser, ...itemWithoutGame } = item;
        const isExpansion = game?.isExpansion ?? false;
        const parentBggId = game?.parentBggId ?? null;
        const parentGameName = parentBggId ? (parentGameMap.get(parentBggId) ?? null) : null;
        const ownerDisplayName = ownerUser?.profile?.nick || ownerUser?.name || (isClubOwnerEmail(item.ownerEmail) ? 'Club Dreadnought' : item.ownerEmail);
        const donorDisplayName = donorUser?.profile?.nick || donorUser?.name || null;

        if (item.gameType === 'ROL' && item.bggId && !item.thumbnail) {
          const rpggItem = await getRPGGeekItem(item.bggId);
          const thumbnail = rpggItem?.thumbnail || null;
          const image = rpggItem?.image || null;
          const yearPublished = rpggItem?.yearPublished || null;
          if (thumbnail) {
            await prisma.libraryItem.update({
              where: { id: item.id },
              data: { thumbnail, image, yearPublished }
            });
          }
          return {
            ...itemWithoutGame,
            gameThumbnail: thumbnail,
            isExpansion,
            parentBggId,
            parentGameName,
            ownerDisplayName,
            donorDisplayName,
            isDonated: !!item.donorUserId,
          };
        }
        // Para juegos no-ROL sin thumbnail cacheado, buscar en tabla Game (sin llamada externa)
        if (item.gameType !== 'ROL' && item.bggId && !item.thumbnail) {
          const gameData = await prisma.game.findUnique({
            where: { id: item.bggId },
            select: { thumbnail: true, image: true, yearPublished: true }
          });
          if (gameData?.thumbnail) {
            await prisma.libraryItem.update({
              where: { id: item.id },
              data: {
                thumbnail: gameData.thumbnail,
                image: gameData.image ?? undefined,
                yearPublished: gameData.yearPublished ?? undefined
              }
            });
            return {
              ...itemWithoutGame,
              gameThumbnail: gameData.thumbnail,
              isExpansion,
              parentBggId,
              parentGameName,
              ownerDisplayName,
              donorDisplayName,
              isDonated: !!item.donorUserId,
            };
          }
        }
        return {
          ...itemWithoutGame,
          gameThumbnail: item.thumbnail || null,
          isExpansion,
          parentBggId,
          parentGameName,
          ownerDisplayName,
          donorDisplayName,
          isDonated: !!item.donorUserId,
        };
      })
    );

    res.json({
      success: true,
      data: {
        items: itemsWithThumbnails,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener items de la ludoteca:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener items de la ludoteca'
    });
  }
};

/**
 * Obtener un item específico por ID
 */
export const getLibraryItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const item = await prisma.libraryItem.findFirst({
      where: { id, bajaAt: null }
    });

    if (!item) {
      res.status(404).json({
        success: false,
        message: 'Item no encontrado'
      });
      return;
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('Error al obtener item:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener item'
    });
  }
};

/**
 * Obtener estadísticas de la ludoteca
 */
export const getLibraryStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const activeWhere: Prisma.LibraryItemWhereInput = { bajaAt: null };

    // Total de items
    const total = await prisma.libraryItem.count({ where: { bajaAt: null } });

    // Expansiones
    const expansions = await prisma.libraryItem.count({
      where: {
        AND: [
          activeWhere,
          { game: { isExpansion: true } },
        ]
      }
    });

    // Por tipo de juego
    const byGameType = await prisma.libraryItem.groupBy({
      by: ['gameType'],
      _count: true,
      where: { bajaAt: null }
    });

    // Por condición
    const byCondition = await prisma.libraryItem.groupBy({
      by: ['condition'],
      _count: true,
      where: { bajaAt: null }
    });

    // Items del club vs. de socios
    // Consideramos como del club: ownerEmail null O clubdreadnought.vlc@gmail.com
    const clubItems = await prisma.libraryItem.count({
      where: {
        AND: [
          { bajaAt: null },
          buildClubOwnerWhere(),
        ]
      }
    });

    const memberItems = await prisma.libraryItem.count({
      where: {
        AND: [
          { bajaAt: null },
          buildParticularOwnerWhere(),
        ]
      }
    });

    // Propietarios únicos (excluyendo el club)
    const owners = await prisma.libraryItem.groupBy({
      by: ['ownerEmail'],
      where: {
        AND: [
          { bajaAt: null },
          buildParticularOwnerWhere(),
        ]
      },
      _count: true
    });

    res.json({
      success: true,
      data: {
        total,
        expansions,
        clubItems,
        memberItems,
        byGameType: byGameType.map(item => ({
          type: item.gameType,
          count: item._count
        })),
        byCondition: byCondition.map(item => ({
          condition: item.condition,
          count: item._count
        })),
        uniqueOwners: owners.length
      }
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener estadísticas'
    });
  }
};

/**
 * Obtener filtros disponibles (tipos, condiciones, propietarios)
 */
export const getLibraryItemDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const item = await prisma.libraryItem.findFirst({
      where: { id, bajaAt: null },
      select: { id: true, name: true, gameType: true, bggId: true, description: true, image: true, thumbnail: true, yearPublished: true }
    });

    if (!item) {
      res.status(404).json({ success: false, message: 'Item no encontrado' });
      return;
    }

    if (item.gameType !== 'ROL' || !item.bggId) {
      res.status(400).json({ success: false, message: 'Este item no tiene detalle en RPGGeek' });
      return;
    }

    // Intentar obtener datos completos desde la tabla Game (ya cacheados) o consultar RPGGeek
    const prefixedId = item.bggId.startsWith('rpgg-') ? item.bggId : `rpgg-${item.bggId}`;
    let gameData = await prisma.game.findUnique({ where: { id: prefixedId } });

    if (!gameData) {
      // No está en Game — consultar RPGGeek y guardar
      const rpgData = await getRPGGeekItem(item.bggId);
      if (!rpgData) {
        res.status(404).json({ success: false, message: 'No se encontró información en RPGGeek' });
        return;
      }
      gameData = await prisma.game.create({
        data: {
          id: prefixedId,
          name: rpgData.name,
          alternateNames: rpgData.alternateNames,
          description: rpgData.description,
          yearPublished: rpgData.yearPublished,
          image: rpgData.image,
          thumbnail: rpgData.thumbnail,
          minPlayers: rpgData.minPlayers,
          maxPlayers: rpgData.maxPlayers,
          playingTime: rpgData.playingTime,
          minPlaytime: rpgData.minPlaytime,
          maxPlaytime: rpgData.maxPlaytime,
          minAge: rpgData.minAge,
          usersRated: rpgData.usersRated,
          averageRating: rpgData.averageRating,
          bayesAverage: rpgData.bayesAverage,
          rank: rpgData.rank,
          complexityRating: rpgData.complexityRating,
          numOwned: rpgData.numOwned,
          numWanting: rpgData.numWanting,
          numWishing: rpgData.numWishing,
          numComments: rpgData.numComments,
          categories: rpgData.categories,
          mechanics: rpgData.mechanics,
          families: rpgData.families,
          designers: rpgData.designers,
          artists: rpgData.artists,
          publishers: rpgData.publishers,
          lastSyncedAt: new Date()
        }
      });
    }

    // Actualizar caché en LibraryItem si faltaban imagen/año
    if (!item.image && gameData.image) {
      await prisma.libraryItem.update({
        where: { id },
        data: { image: gameData.image, thumbnail: gameData.thumbnail, yearPublished: gameData.yearPublished }
      });
    }

    // Devolver en el mismo formato que /api/games/:id para que GameDetailModal lo consuma sin cambios
    res.json({
      success: true,
      data: {
        ...gameData,
        isRpg: true,
      }
    });
  } catch (error) {
    console.error('Error al obtener detalle de item ROL:', error);
    res.status(500).json({ success: false, message: 'Error al obtener detalle del item' });
  }
};

export const getLibraryFilters = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Tipos de juego disponibles
    const gameTypes = Object.values(GameType);

    // Condiciones disponibles
    const conditions = Object.values(GameCondition);

    // Propietarios únicos (excluyendo el email del club, que se agrupa bajo 'club')
    const ownerRows = await prisma.libraryItem.findMany({
      where: {
        AND: [
          { bajaAt: null },
          buildParticularOwnerWhere(),
        ]
      },
      select: {
        ownerEmail: true,
        ownerUser: { select: { name: true, profile: { select: { nick: true } } } },
      },
      distinct: ['ownerEmail']
    });

    const ownerEmails = ownerRows.map(o => o.ownerEmail).filter(Boolean) as string[];

    const owners = ownerEmails.map(email => {
      const row = ownerRows.find((ownerRow) => ownerRow.ownerEmail === email);
      const displayName = row?.ownerUser?.profile?.nick || row?.ownerUser?.name || email;
      return { email, displayName };
    });

    res.json({
      success: true,
      data: {
        gameTypes,
        conditions,
        owners: [{ email: 'club', displayName: 'Club Dreadnought' }, ...owners]
      }
    });
  } catch (error) {
    console.error('Error al obtener filtros:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener filtros'
    });
  }
};
