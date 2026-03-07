// server/src/controllers/pageViewController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';

const IGNORED_PREFIXES = ['/admin', '/api'];

export const trackPageView = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const impersonatedBy = req.user?.impersonatedBy;
    const { path } = req.body;

    if (!userId) {
      res.status(401).json({ success: false, message: 'No autenticado' });
      return;
    }

    // No registrar sesiones de impersonación
    if (impersonatedBy) {
      res.status(200).json({ success: true });
      return;
    }

    if (!path || typeof path !== 'string') {
      res.status(400).json({ success: false, message: 'path requerido' });
      return;
    }

    // No registrar rutas de admin ni de api
    if (IGNORED_PREFIXES.some(prefix => path.startsWith(prefix))) {
      res.status(200).json({ success: true });
      return;
    }

    // Guardar visita y actualizar collectionStartedAt si es la primera vez
    await prisma.$transaction(async (tx) => {
      await tx.pageView.create({ data: { userId, path } });

      const config = await tx.clubConfig.findUnique({
        where: { id: 'club_config' },
        select: { pageViewCollectionStartedAt: true }
      });

      if (config && !config.pageViewCollectionStartedAt) {
        await tx.clubConfig.update({
          where: { id: 'club_config' },
          data: { pageViewCollectionStartedAt: new Date() }
        });
      }
    });

    res.status(200).json({ success: true });
  } catch (error) {
    // Fire-and-forget: no devolver error al cliente
    console.error('[PAGEVIEW] Error al registrar visita:', error);
    res.status(200).json({ success: true });
  }
};

export const getAnalytics = async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: 'club_config' },
      select: { pageViewCollectionStartedAt: true }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Top páginas (todos los datos)
    const topPagesRaw = await prisma.pageView.groupBy({
      by: ['path'],
      _count: { path: true },
      orderBy: { _count: { path: 'desc' } },
      take: 10
    });

    const topPages = topPagesRaw.map(r => ({ path: r.path, count: r._count.path }));

    // Usuarios activos en los últimos 30 días (al menos 1 visita)
    const activeUserIds = await prisma.pageView.findMany({
      where: { visitedAt: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ['userId']
    });
    const activeUserIdSet = new Set(activeUserIds.map(r => r.userId));

    // Usuarios inactivos: aprobados que no tienen visitas en los últimos 30 días
    const approvedUsers = await prisma.user.findMany({
      where: { status: 'APPROVED' },
      select: {
        id: true,
        name: true,
        email: true,
        lastLoginAt: true,
        profile: { select: { avatar: true, nick: true } },
        membership: { select: { type: true } }
      }
    });

    const inactiveUsers = approvedUsers
      .filter(u => !activeUserIdSet.has(u.id))
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        lastLoginAt: u.lastLoginAt,
        avatar: u.profile?.avatar ?? null,
        nick: u.profile?.nick ?? null,
        membershipType: u.membership?.type ?? null
      }))
      .sort((a, b) => {
        if (!a.lastLoginAt) return -1;
        if (!b.lastLoginAt) return 1;
        return new Date(a.lastLoginAt).getTime() - new Date(b.lastLoginAt).getTime();
      });

    // Historial de archives
    const archives = await prisma.pageViewArchive.findMany({
      orderBy: { archivedAt: 'desc' },
      select: { id: true, archivedAt: true, fromDate: true, toDate: true, totalViews: true }
    });

    // Total de visitas actuales
    const totalViews = await prisma.pageView.count();

    res.status(200).json({
      success: true,
      data: {
        collectionStartedAt: config?.pageViewCollectionStartedAt ?? null,
        totalViews,
        topPages,
        activeUsersLast30Days: activeUserIdSet.size,
        inactiveUsers,
        archives
      }
    });
  } catch (error) {
    console.error('[PAGEVIEW] Error al obtener analytics:', error);
    res.status(500).json({ success: false, message: 'Error al obtener analytics' });
  }
};

export const getUserPageViews = async (req: Request, res: Response): Promise<void> => {
  try {
    const { memberId } = req.params;

    const views = await prisma.pageView.groupBy({
      by: ['path'],
      where: { userId: memberId },
      _count: { path: true },
      _max: { visitedAt: true },
      orderBy: { _count: { path: 'desc' } }
    });

    const user = await prisma.user.findUnique({
      where: { id: memberId },
      select: { id: true, name: true, email: true, profile: { select: { nick: true, avatar: true } } }
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        pages: views.map(v => ({
          path: v.path,
          visits: v._count.path,
          lastVisit: v._max.visitedAt
        }))
      }
    });
  } catch (error) {
    console.error('[PAGEVIEW] Error al obtener visitas de usuario:', error);
    res.status(500).json({ success: false, message: 'Error al obtener visitas del usuario' });
  }
};

export const archiveAndReset = async (_req: Request, res: Response): Promise<void> => {
  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: 'club_config' },
      select: { pageViewCollectionStartedAt: true }
    });

    const fromDate = config?.pageViewCollectionStartedAt ?? new Date(0);
    const toDate = new Date();

    // Calcular snapshot agregado antes de borrar
    const topPagesRaw = await prisma.pageView.groupBy({
      by: ['path'],
      _count: { path: true },
      orderBy: { _count: { path: 'desc' } },
      take: 20
    });

    const totalViews = await prisma.pageView.count();

    const uniqueUsers = await prisma.pageView.findMany({
      select: { userId: true },
      distinct: ['userId']
    });

    await prisma.$transaction(async (tx) => {
      // Guardar archive
      await tx.pageViewArchive.create({
        data: {
          fromDate,
          toDate,
          totalViews,
          data: {
            topPages: topPagesRaw.map(r => ({ path: r.path, count: r._count.path })),
            uniqueUsers: uniqueUsers.length
          }
        }
      });

      // Borrar todos los pageviews
      await tx.pageView.deleteMany({});

      // Resetear collectionStartedAt
      await tx.clubConfig.update({
        where: { id: 'club_config' },
        data: { pageViewCollectionStartedAt: new Date() }
      });
    });

    res.status(200).json({
      success: true,
      message: `Archivados ${totalViews} registros. Contadores reseteados.`,
      data: { archivedViews: totalViews, fromDate, toDate }
    });
  } catch (error) {
    console.error('[PAGEVIEW] Error al archivar y resetear:', error);
    res.status(500).json({ success: false, message: 'Error al archivar analytics' });
  }
};
