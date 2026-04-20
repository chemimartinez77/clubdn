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

    const publicUsersPromise = prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        profile: { ludotecaPublica: true },
        userGames: { some: activeOwn },
      },
      select: {
        id: true,
        name: true,
        profile: { select: { nick: true, avatar: true, sharedLudotecaGroupId: true } },
        _count: { select: { userGames: { where: activeOwn } } },
      },
      orderBy: { name: 'asc' },
    });

    const privateCountPromise = prisma.user.count({
      where: {
        profile: { ludotecaPublica: false },
        userGames: { some: activeOwn },
      },
    });

    const publicCountPromise = prisma.user.count({
      where: {
        profile: { ludotecaPublica: true },
        userGames: { some: activeOwn },
      },
    });

    // Top 10 juegos más presentes en ludotecas
    const top10GroupPromise = prisma.userGame.groupBy({
      by: ['gameId'],
      where: { own: true, status: 'active' },
      _count: { gameId: true },
      orderBy: { _count: { gameId: 'desc' } },
      take: 10,
    });

    // Juegos únicos (todos los usuarios, no solo públicos)
    const uniqueGamesPromise = prisma.userGame.findMany({
      where: { ...activeOwn, game: { isExpansion: false } },
      select: { gameId: true },
      distinct: ['gameId'],
    });
    const uniqueExpansionsPromise = prisma.userGame.findMany({
      where: { ...activeOwn, game: { isExpansion: true } },
      select: { gameId: true },
      distinct: ['gameId'],
    });

    const [publicUsers, privateCount, publicCount, top10Group, uniqueGamesRows, uniqueExpansionRows] =
      await Promise.all([
        publicUsersPromise,
        privateCountPromise,
        publicCountPromise,
        top10GroupPromise,
        uniqueGamesPromise,
        uniqueExpansionsPromise,
      ]);

    // Juegos públicos con deduplicación para colecciones compartidas
    const allPublicGames = await prisma.userGame.findMany({
      where: { ...activeOwn, user: { profile: { ludotecaPublica: true } } },
      select: { userId: true, gameId: true, game: { select: { isExpansion: true } } },
    });
    const groupKeyByUserId = new Map(
      publicUsers.map((u) => [u.id, u.profile?.sharedLudotecaGroupId ?? u.id])
    );
    const dedupedPublic = new Map<string, boolean>(); // key: `groupKey:gameId`, value: isExpansion
    for (const ug of allPublicGames) {
      const groupKey = groupKeyByUserId.get(ug.userId) ?? ug.userId;
      const key = `${groupKey}:${ug.gameId}`;
      if (!dedupedPublic.has(key)) dedupedPublic.set(key, ug.game.isExpansion);
    }
    let totalGamesPublic = 0;
    let totalExpansionsPublic = 0;
    for (const isExpansion of dedupedPublic.values()) {
      if (isExpansion) totalExpansionsPublic++;
      else totalGamesPublic++;
    }

    const top10GameIds = top10Group.map((g) => g.gameId);
    const top10Games = await prisma.game.findMany({
      where: { id: { in: top10GameIds } },
      select: { id: true, name: true, thumbnail: true, yearPublished: true },
    });

    const top10 = top10Group
      .map((g) => {
        const game = top10Games.find((gm) => gm.id === g.gameId);
        if (!game) return null;
        return {
          gameId: g.gameId,
          name: game.name,
          thumbnail: game.thumbnail,
          yearPublished: game.yearPublished,
          ownerCount: g._count.gameId,
        };
      })
      .filter(Boolean);

    // Mapa para resolver nombre del compañero de colección compartida
    const userDisplayNameMap = new Map(publicUsers.map((u) => [u.id, displayName(u)]));
    const groupIdToUserIds = new Map<string, string[]>();
    for (const u of publicUsers) {
      const gid = u.profile?.sharedLudotecaGroupId;
      if (gid) {
        const list = groupIdToUserIds.get(gid) ?? [];
        list.push(u.id);
        groupIdToUserIds.set(gid, list);
      }
    }

    const players = publicUsers.map((u) => {
      const gid = u.profile?.sharedLudotecaGroupId;
      let sharedWith: string | null = null;
      if (gid) {
        const partnerId = (groupIdToUserIds.get(gid) ?? []).find((id) => id !== u.id);
        if (partnerId) sharedWith = userDisplayNameMap.get(partnerId) ?? null;
      }
      return {
        userId: u.id,
        displayName: displayName(u),
        avatar: u.profile?.avatar ?? null,
        gameCount: u._count.userGames,
        sharedWith,
      };
    });

    return res.json({
      success: true,
      data: {
        players,
        stats: {
          publicCount,
          privateCount,
          totalGamesPublic,
          totalExpansionsPublic,
          uniqueGamesTotal: uniqueGamesRows.length,
          uniqueExpansionsTotal: uniqueExpansionRows.length,
        },
        top10,
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

    const ownerFilterBase: Prisma.UserGameWhereInput = {
      ...activeOwn,
      userId: { not: currentUserId },
    };

    // Buscar IDs que coinciden por nombre principal O por nombres alternativos (array de texto)
    const matchingIds = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Game"
      WHERE name ILIKE ${'%' + term + '%'}
         OR EXISTS (
           SELECT 1 FROM unnest("alternateNames") AS alt
           WHERE alt ILIKE ${'%' + term + '%'}
         )
    `;
    const gameIds = matchingIds.map((r) => r.id);

    const where: Prisma.GameWhereInput = {
      id: { in: gameIds },
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
    const { search = '', page = '1', pageSize = '48', includeExpansions = 'false' } = req.query as Record<string, string>;
    const showExpansions = includeExpansions === 'true';

    const [player, baseGameCount, expansionCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          profile: { select: { nick: true, avatar: true, ludotecaPublica: true } },
        },
      }),
      prisma.userGame.count({ where: { userId, ...activeOwn, game: { isExpansion: false } } }),
      prisma.userGame.count({ where: { userId, ...activeOwn, game: { isExpansion: true } } }),
    ]);

    if (!player) {
      return res.status(404).json({ success: false, message: 'Jugador no encontrado' });
    }

    const currentUserId = req.user!.userId;
    if (player.profile?.ludotecaPublica === false && player.id !== currentUserId) {
      return res.status(403).json({ success: false, message: 'Esta ludoteca es privada' });
    }

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 48));
    const skip = (safePage - 1) * safePageSize;
    const term = search.trim();

    let gameIdFilter: { in: string[] } | undefined;
    if (term) {
      const matchingIds = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Game"
        WHERE name ILIKE ${'%' + term + '%'}
           OR EXISTS (
             SELECT 1 FROM unnest("alternateNames") AS alt
             WHERE alt ILIKE ${'%' + term + '%'}
           )
      `;
      gameIdFilter = { in: matchingIds.map((r) => r.id) };
    }

    const where: Prisma.UserGameWhereInput = {
      userId,
      ...activeOwn,
      ...(gameIdFilter && { gameId: gameIdFilter }),
      ...(!showExpansions && { game: { isExpansion: false } }),
    };

    const [games, total] = await Promise.all([
      prisma.userGame.findMany({
        where,
        orderBy: { game: { name: 'asc' } },
        skip,
        take: safePageSize,
        select: {
          gameId: true,
          game: { select: { id: true, name: true, yearPublished: true, thumbnail: true, isExpansion: true, parentBggId: true } },
        },
      }),
      prisma.userGame.count({ where }),
    ]);

    // Para expansiones: obtener el nombre del juego base
    const parentBggIds = games
      .filter(g => g.game.isExpansion && g.game.parentBggId)
      .map(g => g.game.parentBggId!);
    const parentGames = parentBggIds.length > 0
      ? await prisma.game.findMany({ where: { id: { in: parentBggIds } }, select: { id: true, name: true } })
      : [];
    const parentGameMap = new Map(parentGames.map(g => [g.id, g.name]));

    const gamesWithExpansion = games.map(g => ({
      ...g,
      game: {
        ...g.game,
        parentGameName: g.game.parentBggId ? (parentGameMap.get(g.game.parentBggId) ?? null) : null,
      },
    }));

    return res.json({
      success: true,
      data: {
        player: {
          userId: player.id,
          displayName: displayName(player),
          avatar: player.profile?.avatar ?? null,
          gameCount: baseGameCount,
          expansionCount,
          ludotecaPublica: player.profile?.ludotecaPublica ?? true,
        },
        games: gamesWithExpansion,
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

export const compareCollections = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user!.userId;
    const { userIds } = req.body as { userIds: unknown };

    if (!Array.isArray(userIds) || userIds.length < 1 || userIds.length > 5) {
      return res.status(400).json({ success: false, message: 'Debes seleccionar entre 1 y 5 jugadores' });
    }

    const ids = [...new Set(userIds.filter((id): id is string => typeof id === 'string'))];

    if (ids.length < 1 || ids.length > 5) {
      return res.status(400).json({ success: false, message: 'IDs inválidos o duplicados' });
    }

    // Verificar que los usuarios externos tienen ludoteca pública (el usuario propio puede incluirse sin restricción)
    const externalIds = ids.filter((id) => id !== currentUserId);
    if (externalIds.length > 0) {
      const validExternal = await prisma.user.count({
        where: {
          id: { in: externalIds },
          profile: { ludotecaPublica: true },
        },
      });
      if (validExternal !== externalIds.length) {
        return res.status(400).json({ success: false, message: 'Algunos jugadores tienen la ludoteca privada' });
      }
    }

    const totalPlayers = ids.length;

    const [userGames, playerInfos] = await Promise.all([
      prisma.userGame.findMany({
        where: { userId: { in: ids }, own: true, status: 'active' },
        select: {
          userId: true,
          gameId: true,
          game: { select: { id: true, name: true, yearPublished: true, thumbnail: true } },
        },
        orderBy: { game: { name: 'asc' } },
      }),
      prisma.user.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          name: true,
          profile: { select: { nick: true, avatar: true } },
        },
      }),
    ]);

    // Agrupar por gameId
    const gameMap = new Map<string, { game: { id: string; name: string; yearPublished: number | null; thumbnail: string | null }; owners: Set<string> }>();
    for (const ug of userGames) {
      if (!gameMap.has(ug.gameId)) {
        gameMap.set(ug.gameId, { game: ug.game, owners: new Set() });
      }
      gameMap.get(ug.gameId)!.owners.add(ug.userId);
    }

    const common: { id: string; name: string; yearPublished: number | null; thumbnail: string | null }[] = [];
    const uniqueByPlayer: Record<string, { id: string; name: string; yearPublished: number | null; thumbnail: string | null }[]> = {};
    for (const id of ids) uniqueByPlayer[id] = [];

    for (const [, { game, owners }] of gameMap) {
      if (owners.size === totalPlayers) {
        common.push(game);
      } else if (owners.size === 1) {
        const ownerId = [...owners][0];
        if (ownerId) uniqueByPlayer[ownerId]?.push(game);
      }
    }

    // Ordenar: el usuario actual primero, luego el resto
    const players = ids.map((id) => {
      const p = playerInfos.find((pi) => pi.id === id)!;
      return {
        userId: p.id,
        displayName: displayName(p),
        avatar: p.profile?.avatar ?? null,
        isCurrentUser: id === currentUserId,
      };
    }).sort((a, b) => (b.isCurrentUser ? 1 : 0) - (a.isCurrentUser ? 1 : 0));

    return res.json({
      success: true,
      data: { players, common, uniqueByPlayer },
    });
  } catch (error) {
    console.error('[JUGADORES_LUDOTECA] Error en compareCollections:', error);
    return res.status(500).json({ success: false, message: 'Error al comparar colecciones' });
  }
};
