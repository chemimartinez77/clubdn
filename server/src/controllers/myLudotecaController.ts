import { BggSyncJobStatus, Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { pokeBggSyncWorker } from '../jobs/bggSyncJob';
import { getBGGCollection } from '../services/bggService';
import { ensureGameFromBgg, estimateBggSyncSeconds } from '../services/gameCatalogService';

function normalizeSearch(value: string) {
  return value.trim();
}

async function buildBggSyncDiff(userId: string, bggUsername: string) {
  const [bggCollection, dbGames] = await Promise.all([
    getBGGCollection(bggUsername),
    prisma.userGame.findMany({
      where: { userId, status: 'active' },
      select: {
        own: true,
        wishlist: true,
        previouslyOwned: true,
        wishlistPriority: true,
        wantToPlay: true,
        bggSynced: true,
        gameId: true,
        game: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  const dbGameMap = new Map(dbGames.map((g) => [g.gameId, g] as const));
  const bggIds = new Set(bggCollection.map((game) => game.bggId));

  const toImport = bggCollection.filter((bggGame) => {
    const existing = dbGameMap.get(bggGame.bggId);
    if (!existing) return true;
    if (bggGame.own !== existing.own) return true;
    if (bggGame.wishlist !== existing.wishlist) return true;
    if (bggGame.previouslyOwned !== existing.previouslyOwned) return true;
    if (bggGame.wishlist && bggGame.wishlistPriority !== existing.wishlistPriority) return true;
    return false;
  });

  const toDelete = dbGames
    .filter((game) => game.bggSynced && (game.own || game.wishlist || game.previouslyOwned) && !bggIds.has(game.gameId))
    .map((game) => ({
      gameId: game.gameId,
      title: game.game.name,
    }));

  const importIds = toImport.map((item) => item.bggId);
  const existingCatalogGames = importIds.length > 0
    ? await prisma.game.findMany({
        where: { id: { in: importIds } },
        select: { id: true, isExpansion: true },
      })
    : [];

  const existingCatalogIds = new Set(existingCatalogGames.map((game) => game.id));
  const catalogExpansionIds = new Set(existingCatalogGames.filter((g) => g.isExpansion).map((g) => g.id));
  const newCatalogItems = toImport.filter((item) => !existingCatalogIds.has(item.bggId)).length;
  const estimatedSeconds = estimateBggSyncSeconds(newCatalogItems, toImport.length + toDelete.length);

  // Para juegos ya en el catálogo usamos isExpansion de la DB (fiable).
  // Para juegos nuevos (aún no en DB) usamos el subtype de BGG como fallback.
  const toImportExpansions = toImport.filter((item) =>
    existingCatalogIds.has(item.bggId) ? catalogExpansionIds.has(item.bggId) : item.isExpansion
  ).length;

  return {
    toImport,
    toDelete,
    newCatalogItems,
    estimatedSeconds,
    toImportOwned: toImport.filter((item) => item.own).length,
    toImportWishlist: toImport.filter((item) => item.wishlist).length,
    toImportPreviouslyOwned: toImport.filter((item) => item.previouslyOwned).length,
    toImportExpansions,
  };
}

async function getQueueInfo(job: { id: string; status: string; requestedAt: Date }) {
  if (job.status !== BggSyncJobStatus.QUEUED && job.status !== BggSyncJobStatus.PENDING) {
    return { queuePosition: null, estimatedWaitSeconds: null };
  }

  const jobsAhead = await prisma.bggSyncJob.findMany({
    where: {
      status: { in: [BggSyncJobStatus.QUEUED, BggSyncJobStatus.PENDING] },
      requestedAt: { lt: job.requestedAt },
    },
    select: { estimatedSeconds: true },
    orderBy: { requestedAt: 'asc' },
  });

  return {
    queuePosition: jobsAhead.length + 1,
    estimatedWaitSeconds: jobsAhead.reduce((sum, j) => sum + j.estimatedSeconds, 0),
  };
}

/**
 * GET /api/my-ludoteca
 * Devuelve los juegos activos del usuario autenticado.
 * Query params: tab (own|wishlist|previouslyOwned|wantToPlay|exclusive|popular|all), search, page, pageSize
 */
export const getMyGames = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tab = 'all', search = '', page = '1', pageSize = '48', locationId = '' } = req.query as Record<string, string>;

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 48));
    const skip = (safePage - 1) * safePageSize;
    const normalizedSearch = normalizeSearch(search);

    const gameNameFilter: Prisma.GameWhereInput = normalizedSearch
      ? {
          name: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        }
      : {};

    const where: Prisma.UserGameWhereInput = {
      userId,
      status: 'active',
      ...(normalizedSearch && {
        game: gameNameFilter,
      }),
    };

    if (tab === 'popular') {
      const popularWhere: Prisma.UserGameWhereInput = {
        ...where,
        own: true,
        game: {
          ...gameNameFilter,
          isExpansion: false,
        },
      };

      if (locationId === '__casa__') popularWhere.locationId = null;
      else if (locationId) popularWhere.locationId = locationId;

      const userGames = await prisma.userGame.findMany({
        where: popularWhere,
        include: {
          game: true,
          location: true,
        },
      });

      const gameIds = userGames.map((game) => game.gameId);
      const ownerCounts = gameIds.length > 0
        ? await prisma.userGame.groupBy({
            by: ['gameId'],
            where: {
              gameId: { in: gameIds },
              own: true,
              status: 'active',
            },
            _count: { gameId: true },
          })
        : [];
      const ownerCountByGameId = new Map(ownerCounts.map((count) => [count.gameId, count._count.gameId]));

      const games = userGames
        .map((game) => ({
          ...game,
          clubOwnerCount: ownerCountByGameId.get(game.gameId) ?? 1,
        }))
        .filter((game) => game.clubOwnerCount > 1)
        .sort((a, b) => {
          if (b.clubOwnerCount !== a.clubOwnerCount) return b.clubOwnerCount - a.clubOwnerCount;
          return a.game.name.localeCompare(b.game.name, 'es');
        })
        .slice(0, 10);

      return res.json({
        success: true,
        data: {
          games,
          pagination: {
            currentPage: 1,
            pageSize: 10,
            total: games.length,
            totalPages: games.length > 0 ? 1 : 0,
          },
        },
      });
    }

    if (tab === 'own') where.own = true;
    else if (tab === 'wishlist') where.wishlist = true;
    else if (tab === 'previouslyOwned') where.previouslyOwned = true;
    else if (tab === 'wantToPlay') where.wantToPlay = true;
    else if (tab === 'exclusive') {
      where.own = true;
      where.game = {
        ...gameNameFilter,
        userGames: {
          none: {
            userId: { not: userId },
            own: true,
            status: 'active',
          },
        },
      };
    }

    if (locationId === '__casa__') where.locationId = null;
    else if (locationId) where.locationId = locationId;

    const [games, total] = await Promise.all([
      prisma.userGame.findMany({
        where,
        orderBy: { game: { name: 'asc' } },
        skip,
        take: safePageSize,
        include: {
          game: true,
          location: true,
        },
      }),
      prisma.userGame.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
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
    console.error('[MY_LUDOTECA] Error en getMyGames:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener tu ludoteca' });
  }
};

/**
 * POST /api/my-ludoteca
 * Añade un juego a la ludoteca personal.
 * Body: { bggId, own?, wishlist?, previouslyOwned?, wishlistPriority?, wantToPlay? }
 * Si el juego ya existe con status=deleted, lo reactiva.
 */
export const addGame = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { bggId, own = false, wishlist = false, previouslyOwned = false, wishlistPriority, wantToPlay = false, locationId } = req.body as {
      bggId: string;
      own?: boolean;
      wishlist?: boolean;
      previouslyOwned?: boolean;
      wishlistPriority?: number;
      wantToPlay?: boolean;
      locationId?: string | null;
    };

    if (!bggId) {
      return res.status(400).json({ success: false, message: 'bggId requerido' });
    }

    const { game } = await ensureGameFromBgg(bggId);

    const userGame = await prisma.userGame.upsert({
      where: { userId_gameId: { userId, gameId: game.id } },
      update: {
        status: 'active',
        own: own ?? false,
        wishlist: wishlist ?? false,
        previouslyOwned: previouslyOwned ?? false,
        wishlistPriority: wishlistPriority ?? null,
        wantToPlay: wantToPlay ?? false,
        locationId: locationId ?? null,
      },
      create: {
        userId,
        gameId: game.id,
        own: own ?? false,
        wishlist: wishlist ?? false,
        previouslyOwned: previouslyOwned ?? false,
        wishlistPriority: wishlistPriority ?? null,
        wantToPlay: wantToPlay ?? false,
        locationId: locationId ?? null,
      },
      include: {
        game: true,
        location: true,
      },
    });

    return res.status(201).json({ success: true, data: userGame });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en addGame:', error);
    if (error instanceof Error && error.message === 'Game not found in BoardGameGeek') {
      return res.status(404).json({ success: false, message: 'Juego no encontrado en BGG' });
    }
    return res.status(500).json({ success: false, message: 'Error al añadir el juego' });
  }
};

/**
 * PATCH /api/my-ludoteca/:bggId
 * Actualiza los flags de un juego (own, wishlist, previouslyOwned, wishlistPriority, wantToPlay).
 */
export const updateGame = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const gameId = req.params.bggId as string;
    const { own, wishlist, previouslyOwned, wishlistPriority, wantToPlay, locationId } = req.body as {
      own?: boolean;
      wishlist?: boolean;
      previouslyOwned?: boolean;
      wishlistPriority?: number | null;
      wantToPlay?: boolean;
      locationId?: string | null;
    };

    const existing = await prisma.userGame.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });

    if (!existing || existing.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Juego no encontrado en tu ludoteca' });
    }

    const updated = await prisma.userGame.update({
      where: { userId_gameId: { userId, gameId } },
      data: {
        ...(own !== undefined && { own }),
        ...(wishlist !== undefined && { wishlist }),
        ...(previouslyOwned !== undefined && { previouslyOwned }),
        ...(wishlistPriority !== undefined && { wishlistPriority }),
        ...(wantToPlay !== undefined && { wantToPlay }),
        ...(locationId !== undefined && { locationId }),
      },
      include: {
        game: true,
        location: true,
      },
    });

    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en updateGame:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar el juego' });
  }
};

/**
 * DELETE /api/my-ludoteca/:bggId
 * Soft delete: marca el juego como status='deleted'.
 */
export const removeGame = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const gameId = req.params.bggId as string;

    const existing = await prisma.userGame.findUnique({
      where: { userId_gameId: { userId, gameId } },
    });

    if (!existing || existing.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Juego no encontrado en tu ludoteca' });
    }

    await prisma.userGame.update({
      where: { userId_gameId: { userId, gameId } },
      data: { status: 'deleted' },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en removeGame:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar el juego' });
  }
};

/**
 * GET /api/my-ludoteca/bgg-username
 * Devuelve el bggUsername guardado del usuario sin llamar a la API de BGG.
 */
export const getBggUsername = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const profile = await prisma.userProfile.findUnique({ where: { userId }, select: { bggUsername: true } });
    return res.json({ success: true, data: { bggUsername: profile?.bggUsername ?? null } });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en getBggUsername:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener el usuario de BGG' });
  }
};

/**
 * PATCH /api/my-ludoteca/bgg-username
 * Actualiza el bggUsername en el perfil del usuario.
 */
export const updateBggUsername = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { bggUsername } = req.body as { bggUsername: string };

    await prisma.userProfile.upsert({
      where: { userId },
      update: { bggUsername: bggUsername?.trim() || null },
      create: { userId, bggUsername: bggUsername?.trim() || null },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en updateBggUsername:', error);
    return res.status(500).json({ success: false, message: 'Error al guardar el usuario de BGG' });
  }
};

/**
 * GET /api/my-ludoteca/bgg-sync-check
 * Compara la colección BGG del usuario con su ludoteca en DB.
 */
export const getBggSyncCheck = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const bggUsername = profile?.bggUsername?.trim();

    if (!bggUsername) {
      return res.status(400).json({
        success: false,
        message: 'No tienes configurado tu usuario de BGG. Añádelo primero.',
      });
    }

    const {
      toImport,
      toDelete,
      newCatalogItems,
      estimatedSeconds,
      toImportOwned,
      toImportWishlist,
      toImportPreviouslyOwned,
      toImportExpansions,
    } = await buildBggSyncDiff(userId, bggUsername);

    return res.json({
      success: true,
      data: {
        bggUsername,
        lastBggSync: profile?.lastBggSync ?? null,
        toImport,
        toImportOwned,
        toImportWishlist,
        toImportPreviouslyOwned,
        toImportExpansions,
        toDelete,
        estimatedSeconds,
        newCatalogItems,
      },
    });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en getBggSyncCheck:', error);
    const message = error instanceof Error ? error.message : 'Error al consultar BGG';
    return res.status(502).json({ success: false, message });
  }
};

/**
 * POST /api/my-ludoteca/bgg-sync-confirm
 * Encola un job de sincronización. El diff se calcula en el worker (sin llamadas a BGG aquí).
 */
export const confirmBggSync = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { locationId = null } = req.body as {
      locationId?: string | null;
    };

    const profile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { bggUsername: true },
    });

    const bggUsername = profile?.bggUsername?.trim();
    if (!bggUsername) {
      return res.status(400).json({ success: false, message: 'No tienes configurado tu usuario de BGG' });
    }

    const activeJob = await prisma.bggSyncJob.findFirst({
      where: {
        userId,
        status: { in: [BggSyncJobStatus.QUEUED, BggSyncJobStatus.PENDING, BggSyncJobStatus.PROCESSING] },
      },
      orderBy: { requestedAt: 'desc' },
    });

    if (activeJob) {
      return res.status(409).json({
        success: false,
        message: 'Ya tienes una sincronización en curso',
        data: activeJob,
      });
    }

    const job = await prisma.bggSyncJob.create({
      data: {
        userId,
        bggUsername,
        locationId: locationId ?? null,
        importPayload: [],
        deletePayload: [],
      },
    });

    await pokeBggSyncWorker();

    return res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        totalToImport: job.totalToImport,
        totalToDelete: job.totalToDelete,
        estimatedSeconds: job.estimatedSeconds,
      },
    });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en confirmBggSync:', error);
    return res.status(500).json({ success: false, message: 'Error durante la sincronización' });
  }
};

/**
 * GET /api/my-ludoteca/bgg-sync-jobs/latest
 * Devuelve el último job del usuario.
 */
export const getLatestBggSyncJob = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const job = await prisma.bggSyncJob.findFirst({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });

    if (!job) {
      return res.json({ success: true, data: null });
    }

    const queueInfo = await getQueueInfo(job);
    return res.json({ success: true, data: { ...job, ...queueInfo } });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en getLatestBggSyncJob:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener el estado de sincronización' });
  }
};

/**
 * GET /api/my-ludoteca/bgg-sync-jobs/:jobId
 * Devuelve el estado de un job concreto.
 */
export const getBggSyncJobStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const jobId = req.params.jobId;

    const job = await prisma.bggSyncJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Sincronización no encontrada' });
    }

    const queueInfo = await getQueueInfo(job);
    return res.json({ success: true, data: { ...job, ...queueInfo } });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en getBggSyncJobStatus:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener el estado de sincronización' });
  }
};

/**
 * DELETE /api/my-ludoteca/bgg-sync-jobs/:jobId
 * Cancela un job que aún no ha empezado a importar (QUEUED o PENDING).
 */
export const cancelBggSyncJob = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { jobId } = req.params;

    const job = await prisma.bggSyncJob.findUnique({ where: { id: jobId } });

    if (!job || job.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Sincronización no encontrada' });
    }

    if (job.status !== BggSyncJobStatus.QUEUED && job.status !== BggSyncJobStatus.PENDING) {
      const message = job.status === BggSyncJobStatus.PROCESSING
        ? 'No se puede cancelar una sincronización que ya está en proceso'
        : 'Esta sincronización ya ha terminado';
      return res.status(409).json({ success: false, message });
    }

    await prisma.bggSyncJob.update({
      where: { id: jobId },
      data: { status: BggSyncJobStatus.CANCELLED, finishedAt: new Date() },
    });

    return res.json({ success: true, message: 'Sincronización cancelada' });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en cancelBggSyncJob:', error);
    return res.status(500).json({ success: false, message: 'Error al cancelar la sincronización' });
  }
};

// ==================== UBICACIONES ====================

/**
 * GET /api/my-ludoteca/locations
 * Devuelve las ubicaciones personalizadas del usuario (sin incluir "Casa", que es el valor por defecto).
 */
export const getLocations = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const locations = await prisma.gameLocation.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: locations });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en getLocations:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener las ubicaciones' });
  }
};

/**
 * POST /api/my-ludoteca/locations
 * Crea una nueva ubicación para el usuario.
 * Body: { name: string }
 */
export const createLocation = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name } = req.body as { name: string };

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de la ubicación es obligatorio' });
    }

    const trimmed = name.trim();

    if (trimmed.toLowerCase() === 'casa') {
      return res.status(400).json({ success: false, message: '"Casa" es la ubicación predeterminada y no puede crearse como personalizada' });
    }

    const location = await prisma.gameLocation.create({
      data: { userId, name: trimmed },
    });

    return res.status(201).json({ success: true, data: location });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Ya tienes una ubicación con ese nombre' });
    }
    console.error('[MY_LUDOTECA] Error en createLocation:', error);
    return res.status(500).json({ success: false, message: 'Error al crear la ubicación' });
  }
};

/**
 * DELETE /api/my-ludoteca/locations/:locationId
 * Elimina una ubicación. Los juegos que la tenían asignada quedan con locationId=null (Casa).
 */
export const deleteLocation = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const locationId = req.params.locationId as string;

    const location = await prisma.gameLocation.findUnique({ where: { id: locationId } });
    if (!location || location.userId !== userId) {
      return res.status(404).json({ success: false, message: 'Ubicación no encontrada' });
    }

    await prisma.gameLocation.delete({ where: { id: locationId } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en deleteLocation:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar la ubicación' });
  }
};
