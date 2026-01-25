// server/src/services/notificationService.ts
import { prisma } from '../config/database';
import { NotificationType } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

interface CreateBulkNotificationsParams {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Crear una notificación para un usuario
 */
export const createNotification = async (params: CreateNotificationParams) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata || null,
      },
    });

    return { success: true, notification };
  } catch (error) {
    console.error('Error creando notificación:', error);
    return { success: false, error };
  }
};

/**
 * Crear notificaciones en masa para múltiples usuarios
 */
export const createBulkNotifications = async (params: CreateBulkNotificationsParams) => {
  try {
    const notifications = await prisma.notification.createMany({
      data: params.userIds.map(userId => ({
        userId,
        type: params.type,
        title: params.title,
        message: params.message,
        metadata: params.metadata || null,
      })),
    });

    return { success: true, count: notifications.count };
  } catch (error) {
    console.error('Error creando notificaciones en masa:', error);
    return { success: false, error };
  }
};

/**
 * Notificar a usuarios inscritos que un evento fue cancelado
 */
export const notifyEventCancelled = async (eventId: string, eventTitle: string) => {
  try {
    // Obtener usuarios inscritos que tengan habilitadas las notificaciones de cancelación
    const registrations = await prisma.eventRegistration.findMany({
      where: {
        eventId,
        status: 'CONFIRMED',
      },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
    });

    // Filtrar usuarios que tienen habilitadas las notificaciones
    const userIds = registrations
      .filter(reg => reg.user.profile?.notifyEventCancelled !== false)
      .map(reg => reg.user.id);

    if (userIds.length === 0) {
      return { success: true, count: 0 };
    }

    return await createBulkNotifications({
      userIds,
      type: 'EVENT_CANCELLED',
      title: 'Evento cancelado',
      message: `El evento "${eventTitle}" ha sido cancelado.`,
      metadata: { eventId, eventTitle },
    });
  } catch (error) {
    console.error('Error notificando cancelación de evento:', error);
    return { success: false, error };
  }
};

/**
 * Notificar a un usuario que su solicitud fue aprobada
 */
export const notifyUserApproved = async (userId: string, userName: string) => {
  return await createNotification({
    userId,
    type: 'USER_APPROVED',
    title: '¡Bienvenido al Club!',
    message: `Tu solicitud ha sido aprobada. Ya puedes acceder a todas las funcionalidades del club.`,
    metadata: { userName },
  });
};

/**
 * Notificar a un usuario que su solicitud fue rechazada
 */
export const notifyUserRejected = async (
  userId: string,
  userName: string,
  reason?: string
) => {
  return await createNotification({
    userId,
    type: 'USER_REJECTED',
    title: 'Solicitud rechazada',
    message: reason
      ? `Tu solicitud ha sido rechazada. Motivo: ${reason}`
      : 'Tu solicitud ha sido rechazada. Contacta al administrador para más información.',
    metadata: { userName, reason },
  });
};

/**
 * Notificar a admins sobre un nuevo usuario pendiente
 */
export const notifyAdminsNewUser = async (newUserName: string, newUserEmail: string) => {
  try {
    // Obtener todos los admins y super admins
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'SUPER_ADMIN'],
        },
      },
      select: {
        id: true,
      },
    });

    const adminIds = admins.map(admin => admin.id);

    if (adminIds.length === 0) {
      return { success: true, count: 0 };
    }

    return await createBulkNotifications({
      userIds: adminIds,
      type: 'ADMIN_NEW_USER',
      title: 'Nuevo usuario pendiente',
      message: `${newUserName} (${newUserEmail}) ha verificado su email y espera aprobación.`,
      metadata: { newUserName, newUserEmail },
    });
  } catch (error) {
    console.error('Error notificando a admins:', error);
    return { success: false, error };
  }
};

/**
 * Notificar a usuarios con preferencia activada sobre una nueva partida
 */
export const notifyNewEvent = async (
  eventId: string,
  eventTitle: string,
  eventDate: Date
) => {
  try {
    // Obtener usuarios con notificaciones de nuevos eventos habilitadas
    const users = await prisma.user.findMany({
      where: {
        status: 'APPROVED',
        profile: {
          notifyNewEvents: true,
        },
      },
      select: {
        id: true,
      },
    });

    const userIds = users.map(user => user.id);

    if (userIds.length === 0) {
      return { success: true, count: 0 };
    }

    return await createBulkNotifications({
      userIds,
      type: 'EVENT_CREATED',
      title: 'Nueva partida disponible',
      message: `Se ha creado una nueva partida: "${eventTitle}". Fecha: ${new Date(eventDate).toLocaleDateString('es-ES')}`,
      metadata: { eventId, eventTitle, eventDate },
    });
  } catch (error) {
    console.error('Error notificando nueva partida:', error);
    return { success: false, error };
  }
};
