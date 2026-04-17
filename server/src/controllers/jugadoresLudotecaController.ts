import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../config/database';

function displayName(user: { name: string; profile: { nick: string | null } | null }): string {
  return user.profile?.nick || user.name;
}

const activeOwn: Prisma.UserGameWhereInput = { own: true, status: 'active' };

export const getPlayers = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user!.userId;

    // Usuarios con ludoteca pública y al menos 1 juego activo (excluye al usuario actual)
    const publicUsersPromise = prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        profile: { ludotecaPublica: true },
        userGames: { some: activeOwn },
      },
      select: {
        id: true,
        name: true,
        profile: { select: { nick: true, avatar: true } },
        _count: { select: { userGames: { where: activeOwn } } },
      },
      orderBy: { name: 'asc' },
    });

    // Recuento de usuarios con ludoteca privada y al menos 1 juego activo (excluye al usuario actual)
    const privateCountPromise = prisma.user.count({
      where: {
        id: { not: currentUserId },
        profile: { ludotecaPublica: false },
        userGames: { some: activeOwn },
      },
    });

    // Total de juegos en ludotecas públicas (excluye al usuario actual)
    const totalGamesPublicPromise = prisma.userGame.count({
      where: {
        ...activeOwn,
        userId: { not: currentUserId },
        user: { profile: { ludotecaPublica: true } },
      },
    });

    // Total de juegos únicos en ludotecas de todos los jugadores (excluye al usuario actual)
    const uniqueGamesPromise = prisma.userGame.findMany({
      where: {
        ...activeOwn,
        userId: { not: currentUserId },
      },
      select: { gameId: true },
      distinct: ['gameId'],
    });

    const [publicUsers, privateCount, totalGamesPublic, uniqueGamesRows] = await Promise.all([
      publicUsersPromise,
      privateCountPromise,
      totalGamesPublicPromise,
      uniqueGamesPromise,
    ]);

    const players = publicUsers.map((u) => ({
      userId: u.id,
      displayName: displayName(u),
      avatar: u.profile?.avatar ?? null,
      gameCount: u._count.userGames,
    }));

    return res.json({
      success: true,
      data: {
        players,
        stats: {
          publicCount: publicUsers.length,
          privateCount,
          totalGamesPublic,
          uniqueGamesTotal: uniqueGamesRows.length,
        },
      },
    });
  } catch (error) {
    console.error('[JUGADORES_LUDOTECA] Error en getPlayers:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener la lista de jugadores' });
  }
};

export const searchGames = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user!.userId;
    const { q = '', page = '1', pageSize = '20' } = req.query as Record<string, string>;

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePageSize = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 20));
    const skip = (safePage - 1) * safePageSize;
    const term = q.trim();

    if (term.length < 2) {
      return res.json({
        success: true,
        data: { results: [], pagination: { currentPage: 1, pageSize: safePageSize, total: 0, totalPages: 0 } },
      });
    }

    // Filtro base: propietario activo, no el usuario actual
    const ownerFilterBase: Prisma.UserGameWhereInput = {
      ...activeOwn,
      userId: { not: currentUserId },
    };

    const where: Prisma.GameWhereInput = {
      name: { contains: term, mode: 'insensitive' },
      userGames: { some: ownerFilterBase },
    };

    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where,
        skip,
        take: safePageSize,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          yearPublished: true,
          thumbnail: true,
          userGames: {
            where: ownerFilterBase,
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  profile: { select: { nick: true, avatar: true, ludotecaPublica: true } },
                },
              },
            },
          },
        },
      }),
      prisma.game.count({ where }),
    ]);

    const results = games.map((g) => {
      const publicOwners = g.userGames
        .filter((ug) => ug.user.profile?.ludotecaPublica !== false)
        .map((ug) => ({
          userId: ug.user.id,
          displayName: displayName(ug.user),
          avatar: ug.user.profile?.avatar ?? null,
        }));
      const privateCount = g.userGames.filter((ug) => ug.user.profile?.ludotecaPublica === false).length;

      return {
        gameId: g.id,
        name: g.name,
        yearPublished: g.yearPublished,
        thumbnail: g.thumbnail,
        publicOwners,
        privateCount,
        totalOwners: g.userGames.length,
      };
    });

    return res.json({
      success: true,
      data: {
        results,
        pagination: {
          currentPage: safePage,
          pageSize: safePageSize,
          total,
          totalPages: Math.ceil(total / safePageSize),
        },
      },
    });
  } catch (error) {
    console.error('[JUGADORES_LUDOTECA] Error en searchGames:', error);
    return res.status(500).json({ success: false, message: 'Error al buscar juegos' });
  }
};

export const getPlayerGames = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { search = '', page = '1', pageSize = '48' } = req.query as Record<string, string>;

    const player = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        profile: { select: { nick: true, avatar: true, ludotecaPublica: true } },
        _count: { select: { userGames: { where: activeOwn } } },
      },
    });

    if (!player) {
      return res.status(404).json({ success: false, message: 'Jugador no encontrado' });
    }

    // Ludoteca privada: solo el propio usuario puede verla
    const currentUserId = req.user!.userId;
    if (player.profile?.ludotecaPublica === false && player.id !== currentUserId) {
      return res.status(403).json({ success: false, message: 'Esta ludoteca es privada' });
    }

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 48));
    const skip = (safePage - 1) * safePageSize;
    const term = search.trim();

    const where: Prisma.UserGameWhereInput = {
      userId,
      ...activeOwn,
      ...(term && { game: { name: { contains: term, mode: 'insensitive' } } }),
    };

    const [games, total] = await Promise.all([
      prisma.userGame.findMany({
        where,
        orderBy: { game: { name: 'asc' } },
        skip,
        take: safePageSize,
        select: {
          gameId: true,
          game: { select: { id: true, name: true, yearPublished: true, thumbnail: true } },
        },
      }),
      prisma.userGame.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        player: {
          userId: player.id,
          displayName: displayName(player),
          avatar: player.profile?.avatar ?? null,
          gameCount: player._count.userGames,
          ludotecaPublica: player.profile?.ludotecaPublica ?? true,
        },
        games,
        pagination: {
          currentPage: safePage,
          pageSize: safePageSize,
          total,
          totalPages: Math.ceil(total / safePageSize),
        },
      },
    });
  } catch (error) {
    console.error('[JUGADORES_LUDOTECA] Error en getPlayerGames:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener la colección del jugador' });
  }
};
