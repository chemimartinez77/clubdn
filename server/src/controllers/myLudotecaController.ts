// server/src/controllers/myLudotecaController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { getBGGGame, getBGGCollection } from '../services/bggService';

/**
 * GET /api/my-ludoteca
 * Devuelve los juegos activos del usuario autenticado.
 * Query params: tab (own|wishlist|wantToPlay|all), search, page, pageSize
 */
export const getMyGames = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { tab = 'all', search = '', page = '1', pageSize = '48' } = req.query as Record<string, string>;

    const safePage = Math.max(1, parseInt(page) || 1);
    const safePageSize = Math.min(100, Math.max(1, parseInt(pageSize) || 48));
    const skip = (safePage - 1) * safePageSize;

    const where: Record<string, unknown> = {
      userId,
      status: 'active',
      ...(search.trim() && { title: { contains: search.trim(), mode: 'insensitive' } }),
    };

    if (tab === 'own') where.own = true;
    else if (tab === 'wishlist') where.wishlist = true;
    else if (tab === 'wantToPlay') where.wantToPlay = true;

    const [games, total] = await Promise.all([
      prisma.userGame.findMany({
        where,
        orderBy: { title: 'asc' },
        skip,
        take: safePageSize,
        include: { location: true },
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

    // Obtener metadatos del juego desde BGG
    const bggGame = await getBGGGame(bggId);
    if (!bggGame) {
      return res.status(404).json({ success: false, message: 'Juego no encontrado en BGG' });
    }

    const game = await prisma.userGame.upsert({
      where: { userId_bggId: { userId, bggId } },
      update: {
        status: 'active',
        own: own ?? false,
        wishlist: wishlist ?? false,
        wishlistPriority: wishlistPriority ?? null,
        wantToPlay: wantToPlay ?? false,
        locationId: locationId ?? null,
        title: bggGame.name,
        thumbnail: bggGame.thumbnail || null,
        yearPublished: bggGame.yearPublished ? parseInt(bggGame.yearPublished) : null,
      },
      create: {
        userId,
        bggId,
        title: bggGame.name,
        thumbnail: bggGame.thumbnail || null,
        yearPublished: bggGame.yearPublished ? parseInt(bggGame.yearPublished) : null,
        own: own ?? false,
        wishlist: wishlist ?? false,
        wishlistPriority: wishlistPriority ?? null,
        wantToPlay: wantToPlay ?? false,
        locationId: locationId ?? null,
      },
      include: { location: true },
    });

    return res.status(201).json({ success: true, data: game });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en addGame:', error);
    return res.status(500).json({ success: false, message: 'Error al añadir el juego' });
  }
};

/**
 * PATCH /api/my-ludoteca/:bggId
 * Actualiza los flags de un juego (own, wishlist, wishlistPriority, wantToPlay).
 */
export const updateGame = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const bggId = req.params.bggId as string;
    const { own, wishlist, wishlistPriority, wantToPlay, locationId } = req.body as {
      own?: boolean;
      wishlist?: boolean;
      wishlistPriority?: number | null;
      wantToPlay?: boolean;
      locationId?: string | null;
    };

    const existing = await prisma.userGame.findUnique({
      where: { userId_bggId: { userId, bggId } },
    });

    if (!existing || existing.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Juego no encontrado en tu ludoteca' });
    }

    const updated = await prisma.userGame.update({
      where: { userId_bggId: { userId, bggId } },
      data: {
        ...(own !== undefined && { own }),
        ...(wishlist !== undefined && { wishlist }),
        ...(wishlistPriority !== undefined && { wishlistPriority }),
        ...(wantToPlay !== undefined && { wantToPlay }),
        ...(locationId !== undefined && { locationId }),
      },
      include: { location: true },
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
    const bggId = req.params.bggId as string;

    const existing = await prisma.userGame.findUnique({
      where: { userId_bggId: { userId, bggId } },
    });

    if (!existing || existing.status === 'deleted') {
      return res.status(404).json({ success: false, message: 'Juego no encontrado en tu ludoteca' });
    }

    await prisma.userGame.update({
      where: { userId_bggId: { userId, bggId } },
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
 * Compara la colección BGG del usuario con su ludoteca en DB.
 * Devuelve { bggUsername, toImport[], toDelete[], lastBggSync }.
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

    const [bggCollection, dbGames] = await Promise.all([
      getBGGCollection(bggUsername),
      prisma.userGame.findMany({
        where: { userId, status: 'active' },
        select: { bggId: true, title: true },
      }),
    ]);

    const dbBggIds = new Set(dbGames.map((g) => g.bggId));
    const bggIds = new Set(bggCollection.map((g) => g.bggId));

    const toImport = bggCollection.filter((g) => !dbBggIds.has(g.bggId));
    const toDelete = dbGames.filter((g) => !bggIds.has(g.bggId));

    return res.json({
      success: true,
      data: {
        bggUsername,
        lastBggSync: profile?.lastBggSync ?? null,
        toImport,
        toDelete,
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
 * Ejecuta la sincronización: importa y/o elimina los juegos confirmados.
 * Body: { toImport: BGGCollectionItem[], toDelete: { bggId }[], locationId?: string | null }
 */
export const confirmBggSync = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { toImport = [], toDelete = [], locationId = null } = req.body as {
      toImport: { bggId: string; title: string; thumbnail: string | null; yearPublished: number | null; minPlayers: number | null; maxPlayers: number | null }[];
      toDelete: { bggId: string }[];
      locationId?: string | null;
    };

    // Importar nuevos juegos (upsert: si existe deleted, lo reactiva)
    for (const game of toImport) {
      await prisma.userGame.upsert({
        where: { userId_bggId: { userId, bggId: game.bggId } },
        update: {
          status: 'active',
          own: true,
          title: game.title,
          thumbnail: game.thumbnail,
          yearPublished: game.yearPublished,
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          locationId: locationId ?? null,
        },
        create: {
          userId,
          bggId: game.bggId,
          title: game.title,
          thumbnail: game.thumbnail,
          yearPublished: game.yearPublished,
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          own: true,
          locationId: locationId ?? null,
        },
      });
    }

    // Soft delete de juegos eliminados en BGG
    if (toDelete.length > 0) {
      await prisma.userGame.updateMany({
        where: { userId, bggId: { in: toDelete.map((g) => g.bggId) } },
        data: { status: 'deleted' },
      });
    }

    // Actualizar lastBggSync
    await prisma.userProfile.update({
      where: { userId },
      data: { lastBggSync: new Date() },
    });

    return res.json({
      success: true,
      data: { imported: toImport.length, deleted: toDelete.length },
    });
  } catch (error) {
    console.error('[MY_LUDOTECA] Error en confirmBggSync:', error);
    return res.status(500).json({ success: false, message: 'Error durante la sincronización' });
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
    // Unique constraint violation
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
