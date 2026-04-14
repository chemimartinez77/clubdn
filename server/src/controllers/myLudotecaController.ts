import { BggSyncJobStatus, Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { pokeBggSyncWorker } from '../jobs/bggSyncJob';
import { getBGGCollection } from '../services/bggService';
import { ensureGameFromBgg, estimateBggSyncSeconds } from '../services/gameCatalogService';

type SyncImportItem = {
  bggId: string;
  title: string;
  thumbnail: string | null;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
};

type SyncDeleteItem = {
  gameId: string;
  title: string;
};

function normalizeSearch(value: string) {
  return value.trim();
}

/**
 * GET /api/my-ludoteca
 * Devuelve los juegos activos del usuario autenticado.
 * Query params: tab (own|wishlist|wantToPlay|all), search, page, pageSize
 */
export const getMyGames = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tab = 'all', search = '', page = '1', pageSize = '48' } = req.query as Record<string, string>;

    const safePage = Math.max(1, parseInt(page, 10) || 1);
    const safePageSize = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 48));
    const skip = (safePage - 1) * safePageSize;
    const normalizedSearch = normalizeSearch(search);

    const where: Prisma.UserGameWhereInput = {
      userId,
      status: 'active',
      ...(normalizedSearch && {
        game: {
          name: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
      }),
    };

    if (tab === 'own') where.own = true;
    else if (tab === 'wishlist') where.wishlist = true;
    else if (tab === 'wantToPlay') where.wantToPlay = true;

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
 * AÃ±ade un juego a la ludoteca personal.
 * Body: { bggId, own?, wishlist?, wishlistPriority?, wantToPlay? }
 * Si el juego ya existe con status=deleted, lo reactiva.
 */
export const addGame = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { bggId, own = false, wishlist = false, wishlistPriority, wantToPlay = false, locationId } = req.body as {
      bggId: string;
      own?: boolean;
      wishlist?: boolean;
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
        wishlistPriority: wishlistPriority ?? null,
        wantToPlay: wantToPlay ?? false,
        locationId: locationId ?? null,
      },
      create: {
        userId,
        gameId: game.id,
        own: own ?? false,
        wishlist: wishlist ?? false,
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
    return res.status(500).json({ success: false, message: 'Error al aÃ±adir el juego' });
  }
};

/**
 * PATCH /api/my-ludoteca/:bggId
 * Actualiza los flags de un juego (own, wishlist, wishlistPriority, wantToPlay).
 */
export const updateGame = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const gameId = req.params.bggId as string;
    const { own, wishlist, wishlistPriority, wantToPlay, locationId } = req.body as {
      own?: boolean;
      wishlist?: boolean;
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
 * Compara la colecciÃ³n BGG del usuario con su ludoteca en DB.
 */
export const getBggSyncCheck = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const profile = await prisma.userProfile.findUnique({ where: { userId } });
    const bggUsername = profile?.bggUsername?.trim();

    if (!bggUsername) {
      return res.status(400).json({
        success: false,
        message: 'No tienes configurado tu usuario de BGG. AÃ±Ã¡delo primero.',
      });
    }

    const [bggCollection, dbGames] = await Promise.all([
      getBGGCollection(bggUsername),
      prisma.userGame.findMany({
        where: { userId, status: 'active' },
        select: {
          own: true,
          wishlist: true,
          wantToPlay: true,
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

    const ownedGameIds = new Set(dbGames.filter((game) => game.own).map((game) => game.gameId));
    const bggIds = new Set(bggCollection.map((game) => game.bggId));

    const toImport = bggCollection.filter((game) => !ownedGameIds.has(game.bggId));
    const toDelete = dbGames
      .filter((game) => game.own && !bggIds.has(game.gameId))
      .map((game) => ({
        gameId: game.gameId,
        title: game.game.name,
      }));

    const importIds = toImport.map((item) => item.bggId);
    const existingCatalogGames = importIds.length > 0
      ? await prisma.game.findMany({
          where: { id: { in: importIds } },
          select: { id: true },
        })
      : [];

    const existingCatalogIds = new Set(existingCatalogGames.map((game) => game.id));
    const newCatalogItems = toImport.filter((item) => !existingCatalogIds.has(item.bggId)).length;
    const estimatedSeconds = estimateBggSyncSeconds(newCatalogItems, toImport.length + toDelete.length);

    return res.json({
      success: true,
      data: {
        bggUsername,
        lastBggSync: profile?.lastBggSync ?? null,
        toImport,
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
 * Crea un job persistente de sincronizaciÃ³n en background.
 */
export const confirmBggSync = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { toImport = [], toDelete = [], locationId = null, estimatedSeconds = 0 } = req.body as {
      toImport: SyncImportItem[];
      toDelete: SyncDeleteItem[];
      locationId?: string | null;
      estimatedSeconds?: number;
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
        status: { in: [BggSyncJobStatus.PENDING, BggSyncJobStatus.PROCESSING] },
      },
      orderBy: { requestedAt: 'desc' },
    });

    if (activeJob) {
      return res.status(409).json({
        success: false,
        message: 'Ya tienes una sincronizaciÃ³n en curso',
        data: activeJob,
      });
    }

    const job = await prisma.bggSyncJob.create({
      data: {
        userId,
        bggUsername,
        locationId: locationId ?? null,
        totalToImport: toImport.length,
        totalToDelete: toDelete.length,
        estimatedSeconds,
        importPayload: toImport as unknown as Prisma.JsonArray,
        deletePayload: toDelete as unknown as Prisma.JsonArray,
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
    return res.status(500).json({ success: false, message: 'Error durante la sincronizaciÃ³n' });
  }
};

/**
 * GET /api/my-ludoteca/bgg-sync-jobs/latest
 * Devuelve el Ãºltimo job del usuario.
 */
export const getLatestBggSyncJob = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const job = await prisma.bggSyncJob.findFirst({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });

    return res.json({ success: true, data: job });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en getLatestBggSyncJob:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener el estado de sincronizaciÃ³n' });
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
      return res.status(404).json({ success: false, message: 'SincronizaciÃ³n no encontrada' });
    }

    return res.json({ success: true, data: job });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en getBggSyncJobStatus:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener el estado de sincronizaciÃ³n' });
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
 * Crea una nueva ubicaciÃ³n para el usuario.
 * Body: { name: string }
 */
export const createLocation = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name } = req.body as { name: string };

    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'El nombre de la ubicaciÃ³n es obligatorio' });
    }

    const trimmed = name.trim();

    if (trimmed.toLowerCase() === 'casa') {
      return res.status(400).json({ success: false, message: '"Casa" es la ubicaciÃ³n predeterminada y no puede crearse como personalizada' });
    }

    const location = await prisma.gameLocation.create({
      data: { userId, name: trimmed },
    });

    return res.status(201).json({ success: true, data: location });
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Ya tienes una ubicaciÃ³n con ese nombre' });
    }
    console.error('[MY_LUDOTECA] Error en createLocation:', error);
    return res.status(500).json({ success: false, message: 'Error al crear la ubicaciÃ³n' });
  }
};

/**
 * DELETE /api/my-ludoteca/locations/:locationId
 * Elimina una ubicaciÃ³n. Los juegos que la tenÃ­an asignada quedan con locationId=null (Casa).
 */
export const deleteLocation = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const locationId = req.params.locationId as string;

    const location = await prisma.gameLocation.findUnique({ where: { id: locationId } });
    if (!location || location.userId !== userId) {
      return res.status(404).json({ success: false, message: 'UbicaciÃ³n no encontrada' });
    }

    await prisma.gameLocation.delete({ where: { id: locationId } });
    return res.json({ success: true });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en deleteLocation:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar la ubicaciÃ³n' });
  }
};
