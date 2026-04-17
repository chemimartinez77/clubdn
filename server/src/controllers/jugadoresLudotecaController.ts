import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../config/database';

function displayName(user: { name: string; profile: { nick: string | null } | null }): string {
  return user.profile?.nick || user.name;
}

export const getPlayers = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user!.userId;

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        userGames: { some: { own: true, status: 'active' } },
      },
      select: {
        id: true,
        name: true,
        profile: { select: { nick: true, avatar: true } },
        _count: {
          select: { userGames: { where: { own: true, status: 'active' } } },
        },
      },
      orderBy: { name: 'asc' },
    });

    const players = users.map((u) => ({
      userId: u.id,
      displayName: displayName(u),
      avatar: u.profile?.avatar ?? null,
      gameCount: u._count.userGames,
    }));

    return res.json({ success: true, data: { players } });
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

    const ownerFilter: Prisma.UserGameWhereInput = {
      own: true,
      status: 'active',
      userId: { not: currentUserId },
    };

    const where: Prisma.GameWhereInput = {
      name: { contains: term, mode: 'insensitive' },
      userGames: { some: ownerFilter },
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
            where: ownerFilter,
            select: {
              user: {
                select: {
                  id: true,
                  name: true,
                  profile: { select: { nick: true, avatar: true } },
                },
              },
            },
          },
        },
      }),
      prisma.game.count({ where }),
    ]);

    const results = games.map((g) => ({
      gameId: g.id,
      name: g.name,
      yearPublished: g.yearPublished,
      thumbnail: g.thumbnail,
      ownerCount: g.userGames.length,
      owners: g.userGames.map((ug) => ({
        userId: ug.user.id,
        displayName: displayName(ug.user),
        avatar: ug.user.profile?.avatar ?? null,
      })),
    }));

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
        profile: { select: { nick: true, avatar: true } },
        _count: { select: { userGames: { where: { own: true, status: 'active' } } } },
      },
    });

    if (!player) {
      return res.status(404).json({ success: false, message: 'Jugador no encontrado' });
    }

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 48));
    const skip = (safePage - 1) * safePageSize;
    const term = search.trim();

    const where: Prisma.UserGameWhereInput = {
      userId,
      own: true,
      status: 'active',
      ...(term && {
        game: { name: { contains: term, mode: 'insensitive' } },
      }),
    };

    const [games, total] = await Promise.all([
      prisma.userGame.findMany({
        where,
        orderBy: { game: { name: 'asc' } },
        skip,
        take: safePageSize,
        select: {
          gameId: true,
          game: {
            select: { id: true, name: true, yearPublished: true, thumbnail: true },
          },
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
