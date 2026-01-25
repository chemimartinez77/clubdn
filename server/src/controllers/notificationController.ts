// server/src/controllers/notificationController.ts
import { Request, Response } from 'express';
import { prisma } from '../config/database';

/**
 * Obtener notificaciones del usuario actual
 * GET /api/notifications
 */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
    }

    const { unreadOnly } = req.query;

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly === 'true' && { read: false }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Límite de 50 notificaciones
    });

    return res.status(200).json({
      success: true,
      data: { notifications },
    });
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener notificaciones',
    });
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
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
    }

    const count = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });

    return res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error('Error al contar notificaciones no leídas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al contar notificaciones',
    });
  }
};

/**
 * Marcar una notificación como leída
 * PATCH /api/notifications/:id/read
 */
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
    }

    // Verificar que la notificación pertenece al usuario
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada',
      });
    }

    // Marcar como leída
    const updated = await prisma.notification.update({
      where: { id },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      data: { notification: updated },
    });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar notificación',
    });
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
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      data: { count: result.count },
      message: `${result.count} notificaciones marcadas como leídas`,
    });
  } catch (error) {
    console.error('Error al marcar todas como leídas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al actualizar notificaciones',
    });
  }
};

/**
 * Eliminar una notificación
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado',
      });
    }

    // Verificar que la notificación pertenece al usuario
    const notification = await prisma.notification.findFirst({
      where: {
        id,
        userId,
      },
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notificación no encontrada',
      });
    }

    await prisma.notification.delete({
      where: { id },
    });

    return res.status(200).json({
      success: true,
      message: 'Notificación eliminada',
    });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar notificación',
    });
  }
};
