// server/src/controllers/notificationController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';

type NotificationShape = {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: unknown;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

function normalizeGlobal(
  gn: { id: string; type: string; title: string; message: string; metadata: unknown; createdAt: Date },
  readEntry: { readAt: Date; dismissed: boolean } | null
): NotificationShape {
  return {
    id: `global_${gn.id}`,
    type: gn.type,
    title: gn.title,
    message: gn.message,
    metadata: gn.metadata,
    read: readEntry !== null && !readEntry.dismissed,
    readAt: readEntry && !readEntry.dismissed ? readEntry.readAt.toISOString() : null,
    createdAt: gn.createdAt.toISOString(),
  };
}

/**
 * Obtener notificaciones del usuario actual
 * GET /api/notifications
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const { unreadOnly } = req.query;

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { notifyNewEvents: true },
    });
    const wantsNewEvents = userProfile?.notifyNewEvents ?? true;

    // Notificaciones personales 1-a-1
    const personalNotifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly === 'true' && { read: false }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // GlobalNotifications visibles para este usuario
    let globalNotifications: NotificationShape[] = [];

    if (wantsNewEvents) {
      if (unreadOnly === 'true') {
        // Solo las que no tienen ninguna entrada de lectura (ni leída ni descartada)
        const globals = await prisma.globalNotification.findMany({
          where: {
            type: 'EVENT_CREATED',
            reads: { none: { userId } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        globalNotifications = globals.map(gn => normalizeGlobal(gn, null));
      } else {
        // Todas excepto las descartadas
        const globals = await prisma.globalNotification.findMany({
          where: {
            type: 'EVENT_CREATED',
            NOT: { reads: { some: { userId, dismissed: true } } },
          },
          include: {
            reads: { where: { userId } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        });
        globalNotifications = globals.map(gn => normalizeGlobal(gn, gn.reads[0] ?? null));
      }
    }

    const allNotifications: NotificationShape[] = [
      ...personalNotifications.map(n => ({
        id: n.id,
        type: n.type as string,
        title: n.title,
        message: n.message,
        metadata: n.metadata,
        read: n.read,
        readAt: n.readAt?.toISOString() ?? null,
        createdAt: n.createdAt.toISOString(),
      })),
      ...globalNotifications,
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50);

    return res.status(200).json({
      success: true,
      data: { notifications: allNotifications },
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    return res.status(500).json({ success: false, message: 'Error al obtener notificaciones' });
  }
};

/**
 * Obtener conteo de notificaciones no leídas
 * GET /api/notifications/unread-count
 */
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { notifyNewEvents: true },
    });
    const wantsNewEvents = userProfile?.notifyNewEvents ?? true;

    const personalCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    let globalCount = 0;
    if (wantsNewEvents) {
      globalCount = await prisma.globalNotification.count({
        where: {
          type: 'EVENT_CREATED',
          reads: { none: { userId } },
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: { count: personalCount + globalCount },
    });
  } catch (error) {
    console.error('Error al contar notificaciones no leídas:', error);
    return res.status(500).json({ success: false, message: 'Error al contar notificaciones' });
  }
};

/**
 * Marcar una notificación como leída
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const id = req.params['id'];

    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    if (!id) {
      return res.status(400).json({ success: false, message: 'ID requerido' });
    }

    if (id.startsWith('global_')) {
      const globalId = id.replace('global_', '');

      const gn = await prisma.globalNotification.findUnique({ where: { id: globalId } });
      if (!gn) {
        return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
      }

      await prisma.globalNotificationRead.upsert({
        where: { userId_globalNotificationId: { userId, globalNotificationId: globalId } },
        create: { userId, globalNotificationId: globalId, readAt: new Date(), dismissed: false },
        update: { readAt: new Date(), dismissed: false },
      });

      return res.status(200).json({ success: true, data: { notification: { id, read: true, readAt: new Date().toISOString() } } });
    }

    const notification = await prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true, readAt: new Date() },
    });

    return res.status(200).json({ success: true, data: { notification: updated } });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar notificación' });
  }
};

/**
 * Marcar todas las notificaciones como leídas
 * PATCH /api/notifications/mark-all-read
 */
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    const userProfile = await prisma.userProfile.findUnique({
      where: { userId },
      select: { notifyNewEvents: true },
    });
    const wantsNewEvents = userProfile?.notifyNewEvents ?? true;

    const personalResult = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });

    let globalCount = 0;
    if (wantsNewEvents) {
      const unreadGlobals = await prisma.globalNotification.findMany({
        where: {
          type: 'EVENT_CREATED',
          reads: { none: { userId } },
        },
        select: { id: true },
      });

      if (unreadGlobals.length > 0) {
        await prisma.globalNotificationRead.createMany({
          data: unreadGlobals.map(gn => ({
            userId,
            globalNotificationId: gn.id,
            readAt: new Date(),
            dismissed: false,
          })),
          skipDuplicates: true,
        });
        globalCount = unreadGlobals.length;
      }
    }

    const total = personalResult.count + globalCount;

    return res.status(200).json({
      success: true,
      data: { count: total },
      message: `${total} notificaciones marcadas como leídas`,
    });
  } catch (error) {
    console.error('Error al marcar todas como leídas:', error);
    return res.status(500).json({ success: false, message: 'Error al actualizar notificaciones' });
  }
};

/**
 * Eliminar una notificación
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const id = req.params['id'];

    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autenticado' });
    }

    if (!id) {
      return res.status(400).json({ success: false, message: 'ID requerido' });
    }

    if (id.startsWith('global_')) {
      const globalId = id.replace('global_', '');

      const gn = await prisma.globalNotification.findUnique({ where: { id: globalId } });
      if (!gn) {
        return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
      }

      await prisma.globalNotificationRead.upsert({
        where: { userId_globalNotificationId: { userId, globalNotificationId: globalId } },
        create: { userId, globalNotificationId: globalId, readAt: new Date(), dismissed: true },
        update: { dismissed: true },
      });

      return res.status(200).json({ success: true, message: 'Notificación eliminada' });
    }

    const notification = await prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notificación no encontrada' });
    }

    await prisma.notification.delete({ where: { id } });

    return res.status(200).json({ success: true, message: 'Notificación eliminada' });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    return res.status(500).json({ success: false, message: 'Error al eliminar notificación' });
  }
};
