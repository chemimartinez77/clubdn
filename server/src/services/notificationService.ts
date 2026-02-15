// server/src/services/notificationService.ts
import { prisma } from '../config/database';
import { NotificationType, Prisma } from '@prisma/client';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}

interface CreateBulkNotificationsParams {
  userIds: string[];
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
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
        metadata: params.metadata ?? undefined,
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
        metadata: params.metadata ?? undefined,
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
  const metadata = reason ? { userName, reason } : { userName };
  return await createNotification({
    userId,
    type: 'USER_REJECTED',
    title: 'Solicitud rechazada',
    message: reason
      ? `Tu solicitud ha sido rechazada. Motivo: ${reason}`
      : 'Tu solicitud ha sido rechazada. Contacta al administrador para mas informacion.',
    metadata,
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
  eventDate: Date,
  createdById?: string
) => {
  try {
    // Obtener usuarios con notificaciones de nuevos eventos habilitadas
    const users = await prisma.user.findMany({
      where: {
        status: 'APPROVED',
        ...(createdById ? { id: { not: createdById } } : {}),
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
      metadata: { eventId, eventTitle, eventDate: eventDate.toISOString() },
    });
  } catch (error) {
    console.error('Error notificando nueva partida:', error);
    return { success: false, error };
  }
};

/**
 * Notificar al organizador sobre una solicitud de registro pendiente
 */
export const notifyRegistrationPending = async (
  eventId: string,
  eventTitle: string,
  organizerId: string,
  userName: string
) => {
  return await createNotification({
    userId: organizerId,
    type: 'REGISTRATION_PENDING',
    title: 'Nueva solicitud de registro',
    message: `${userName} ha solicitado unirse a "${eventTitle}".`,
    metadata: { eventId, eventTitle, userName },
  });
};

/**
 * Notificar al usuario que su registro fue aprobado
 */
export const notifyRegistrationApproved = async (
  userId: string,
  eventId: string,
  eventTitle: string
) => {
  return await createNotification({
    userId,
    type: 'REGISTRATION_APPROVED',
    title: 'Registro aprobado',
    message: `Tu solicitud para "${eventTitle}" ha sido aprobada.`,
    metadata: { eventId, eventTitle },
  });
};

/**
 * Notificar al usuario que su registro fue rechazado
 */
export const notifyRegistrationRejected = async (
  userId: string,
  eventId: string,
  eventTitle: string
) => {
  return await createNotification({
    userId,
    type: 'REGISTRATION_REJECTED',
    title: 'Registro rechazado',
    message: `Tu solicitud para "${eventTitle}" no ha sido aprobada.`,
    metadata: { eventId, eventTitle },
  });
};

/**
 * Notificar a todos los admins sobre un nuevo reporte
 */
export const notifyReportCreated = async (
  reportId: string,
  reportTitle: string,
  reportType: string,
  reporterName: string
) => {
  try {
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
      type: 'REPORT_CREATED',
      title: 'Nuevo reporte',
      message: `${reporterName} ha creado un ${reportType}: "${reportTitle}".`,
      metadata: { reportId, reportTitle, reportType, reporterName },
    });
  } catch (error) {
    console.error('Error notificando creación de reporte:', error);
    return { success: false, error };
  }
};

/**
 * Notificar al creador del reporte sobre una actualización
 */
export const notifyReportUpdated = async (
  reportId: string,
  reportTitle: string,
  userId: string,
  changeDescription: string
) => {
  return await createNotification({
    userId,
    type: 'REPORT_UPDATED',
    title: 'Actualización en tu reporte',
    message: `Tu reporte "${reportTitle}" ha sido actualizado: ${changeDescription}`,
    metadata: { reportId, reportTitle, changeDescription },
  });
};

/**
 * Notificar sobre un nuevo comentario en un reporte
 * Si hay admin asignado, solo notifica a él. Si no, notifica a todos los admins.
 */
export const notifyReportComment = async (
  reportId: string,
  reportTitle: string,
  commenterId: string,
  commenterName: string,
  assignedToId: string | null,
  reportCreatorId: string
) => {
  try {
    // Si el comentario es del creador del reporte, notificar al admin asignado o todos los admins
    if (commenterId === reportCreatorId) {
      if (assignedToId) {
        // Notificar solo al admin asignado
        return await createNotification({
          userId: assignedToId,
          type: 'REPORT_COMMENT',
          title: 'Nuevo comentario en reporte',
          message: `${commenterName} ha comentado en "${reportTitle}".`,
          metadata: { reportId, reportTitle, commenterName },
        });
      } else {
        // Notificar a todos los admins
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
          type: 'REPORT_COMMENT',
          title: 'Nuevo comentario en reporte',
          message: `${commenterName} ha comentado en "${reportTitle}".`,
          metadata: { reportId, reportTitle, commenterName },
        });
      }
    } else {
      // Si el comentario es de un admin, notificar al creador del reporte
      return await createNotification({
        userId: reportCreatorId,
        type: 'REPORT_COMMENT',
        title: 'Nuevo comentario en tu reporte',
        message: `${commenterName} ha comentado en "${reportTitle}".`,
        metadata: { reportId, reportTitle, commenterName },
      });
    }
  } catch (error) {
    console.error('Error notificando comentario en reporte:', error);
    return { success: false, error };
  }
};
