// server/src/services/notificationService.ts
import { prisma } from '../config/database';
import { NotificationType, Prisma, UserRole } from '@prisma/client';

const ADMIN_LIKE_NOTIFICATION_ROLES: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.CHEMI,
];

const formatDateEs = (date: Date): string => {
  const d = date.getUTCDate();
  const m = date.getUTCMonth() + 1;
  const y = date.getUTCFullYear();
  return `${d}/${m}/${y}`;
};

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
          in: ADMIN_LIKE_NOTIFICATION_ROLES,
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
 * Notificar a los admins que un usuario ha completado el onboarding
 */
export const notifyAdminsOnboardingCompleted = async (userName: string, userEmail: string) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ADMIN_LIKE_NOTIFICATION_ROLES } },
      select: { id: true },
    });

    const adminIds = admins.map(a => a.id);
    if (adminIds.length === 0) return { success: true, count: 0 };

    return await createBulkNotifications({
      userIds: adminIds,
      type: 'ADMIN_NEW_USER',
      title: 'Nuevo socio registrado',
      message: `${userName} (${userEmail}) ha completado su ficha de socio.`,
      metadata: { userName, userEmail },
    });
  } catch (error) {
    console.error('Error notificando onboarding completado:', error);
    return { success: false, error };
  }
};

/**
 * Notificar sobre una nueva partida — genera 1 sola fila global en lugar de una por usuario
 */
export const notifyNewEvent = async (
  eventId: string,
  eventTitle: string,
  eventDate: Date,
  _createdById?: string
) => {
  try {
    const globalNotification = await prisma.globalNotification.create({
      data: {
        type: 'EVENT_CREATED',
        title: 'Nueva partida disponible',
        message: `Se ha creado una nueva partida: "${eventTitle}". Fecha: ${formatDateEs(new Date(eventDate))}`,
        metadata: { eventId, eventTitle, eventDate: eventDate.toISOString() },
      },
    });

    return { success: true, globalNotification };
  } catch (error) {
    console.error('Error notificando nueva partida:', error);
    return { success: false, error };
  }
};

/**
 * Notificar al organizador cuando alguien se une directamente (sin aprobación)
 */
export const notifyRegistrationConfirmed = async (
  eventId: string,
  eventTitle: string,
  organizerId: string,
  userName: string
) => {
  return await createNotification({
    userId: organizerId,
    type: 'REGISTRATION_PENDING',
    title: 'Nuevo asistente en tu partida',
    message: `${userName} se ha apuntado a "${eventTitle}".`,
    metadata: { eventId, eventTitle, userName },
  });
};

/**
 * Notificar al organizador cuando alguien abandona su partida
 */
export const notifyRegistrationCancelled = async (
  eventId: string,
  eventTitle: string,
  organizerId: string,
  userName: string,
  wasConfirmed: boolean = true
) => {
  const title = wasConfirmed ? 'Un asistente ha abandonado la partida' : 'Un asistente ha cancelado su solicitud';
  const message = wasConfirmed
    ? `${userName} ha abandonado "${eventTitle}".`
    : `${userName} ha cancelado su solicitud para unirse a "${eventTitle}".`;
  return await createNotification({
    userId: organizerId,
    type: 'REGISTRATION_PENDING',
    title,
    message,
    metadata: { eventId, eventTitle, userName },
  });
};

/**
 * Notificar al resto de jugadores cuando alguien abandona la partida
 */
export const notifyPlayersOfAbandonment = async (
  eventId: string,
  eventTitle: string,
  leavingUserId: string,
  leavingUserName: string,
  excludeUserId: string | null = null
) => {
  try {
    const registrations = await prisma.eventRegistration.findMany({
      where: {
        eventId,
        status: 'CONFIRMED',
        userId: { notIn: [leavingUserId, ...(excludeUserId ? [excludeUserId] : [])] },
      },
      select: { userId: true },
    });

    const userIds = registrations.map(r => r.userId);
    if (userIds.length === 0) return { success: true, count: 0 };

    return await createBulkNotifications({
      userIds,
      type: 'REGISTRATION_PENDING',
      title: 'Un jugador ha abandonado la partida',
      message: `${leavingUserName} ha abandonado "${eventTitle}".`,
      metadata: { eventId, eventTitle, userName: leavingUserName },
    });
  } catch (error) {
    console.error('Error notificando abandono a jugadores:', error);
    return { success: false, error };
  }
};

/**
 * Notificar al usuario que ha sido eliminado de una partida por el organizador
 */
export const notifyParticipantRemoved = async (
  eventId: string,
  eventTitle: string,
  userId: string,
  removalReason: string
) => {
  try {
    return await createNotification({
      userId,
      type: 'REGISTRATION_REJECTED',
      title: 'Has sido eliminado de una partida',
      message: `El organizador te ha eliminado de "${eventTitle}". Motivo: ${removalReason}.`,
      metadata: { eventId, eventTitle, removalReason },
    });
  } catch (error) {
    console.error('Error notificando expulsión al participante:', error);
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
          in: ADMIN_LIKE_NOTIFICATION_ROLES,
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
 * Notificar al organizador que debe confirmar si la partida se disputó
 */
export const notifyEventDisputeConfirmation = async (
  eventId: string,
  eventTitle: string,
  organizerId: string
) => {
  return await createNotification({
    userId: organizerId,
    type: 'EVENT_DISPUTE_CONFIRMATION',
    title: '¿Se disputó esta partida?',
    message: `La partida "${eventTitle}" ya ha finalizado. ¿Llegó a disputarse? Confírmalo en el detalle de la partida.`,
    metadata: { eventId, eventTitle },
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
              in: ADMIN_LIKE_NOTIFICATION_ROLES,
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

/**
 * Notificar a admins que un miembro EN_PRUEBAS ha sido promovido automáticamente a COLABORADOR
 */
export const notifyAdminsMemberPromoted = async (userName: string, userEmail: string, userId: string) => {
  try {
    const admins = await prisma.user.findMany({
      where: { role: { in: ADMIN_LIKE_NOTIFICATION_ROLES } },
      select: { id: true },
    });

    const adminIds = admins.map(a => a.id);
    if (adminIds.length === 0) return { success: true, count: 0 };

    return await createBulkNotifications({
      userIds: adminIds,
      type: 'MEMBER_PROMOTED',
      title: 'Miembro promovido automáticamente',
      message: `${userName} (${userEmail}) ha completado su período de prueba y ha pasado a ser COLABORADOR.`,
      metadata: { userName, userEmail, userId },
    });
  } catch (error) {
    console.error('Error notificando promoción de miembro:', error);
    return { success: false, error };
  }
};

/**
 * Notificar a todos los usuarios sobre un nuevo anuncio en el tablón
 */
export const notifyNewAnnouncement = async (
  announcementId: string,
  title: string | null,
  content: string
) => {
  try {
    const notificationTitle = 'Tablón de anuncios';
    const message = title ?? (content.length > 120 ? content.slice(0, 117) + '...' : content);
    await prisma.globalNotification.create({
      data: {
        type: 'ANNOUNCEMENT_CREATED',
        title: notificationTitle,
        message,
        metadata: { announcementId },
      },
    });
    return { success: true };
  } catch (error) {
    console.error('Error notificando nuevo anuncio:', error);
    return { success: false, error };
  }
};

// ─── Mercadillo ───────────────────────────────────────────────────────────────

export const notifyMarketplaceNewMessage = async (
  recipientId: string,
  senderName: string,
  listingTitle: string,
  conversationId: string
) => {
  try {
    return await createNotification({
      userId: recipientId,
      type: 'MARKETPLACE_NEW_MESSAGE',
      title: 'Nuevo mensaje en el mercadillo',
      message: `${senderName} te ha enviado un mensaje sobre "${listingTitle}".`,
      metadata: { conversationId },
    });
  } catch (error) {
    console.error('Error notificando mensaje mercadillo:', error);
    return { success: false, error };
  }
};

export const notifyMarketplaceNewConversation = async (
  sellerId: string,
  buyerName: string,
  listingTitle: string,
  conversationId: string
) => {
  try {
    return await createNotification({
      userId: sellerId,
      type: 'MARKETPLACE_NEW_CONVERSATION',
      title: 'Alguien está interesado en tu anuncio',
      message: `${buyerName} ha iniciado una conversación sobre "${listingTitle}".`,
      metadata: { conversationId },
    });
  } catch (error) {
    console.error('Error notificando nueva conversación mercadillo:', error);
    return { success: false, error };
  }
};

export const notifyMarketplaceNewOffer = async (
  sellerId: string,
  buyerName: string,
  listingTitle: string,
  amount: number,
  conversationId: string
) => {
  try {
    return await createNotification({
      userId: sellerId,
      type: 'MARKETPLACE_NEW_OFFER',
      title: 'Nueva oferta en el mercadillo',
      message: `${buyerName} ha hecho una oferta de ${amount}€ por "${listingTitle}".`,
      metadata: { conversationId, amount },
    });
  } catch (error) {
    console.error('Error notificando nueva oferta mercadillo:', error);
    return { success: false, error };
  }
};

export const notifyMarketplaceOfferAccepted = async (
  buyerId: string,
  listingTitle: string,
  amount: number,
  conversationId: string
) => {
  try {
    return await createNotification({
      userId: buyerId,
      type: 'MARKETPLACE_OFFER_ACCEPTED',
      title: 'Tu oferta ha sido aceptada',
      message: `Tu oferta de ${amount}€ por "${listingTitle}" ha sido aceptada.`,
      metadata: { conversationId, amount },
    });
  } catch (error) {
    console.error('Error notificando oferta aceptada mercadillo:', error);
    return { success: false, error };
  }
};

export const notifyMarketplaceOfferRejected = async (
  buyerId: string,
  listingTitle: string,
  amount: number,
  conversationId: string
) => {
  try {
    return await createNotification({
      userId: buyerId,
      type: 'MARKETPLACE_OFFER_REJECTED',
      title: 'Tu oferta ha sido rechazada',
      message: `Tu oferta de ${amount}€ por "${listingTitle}" ha sido rechazada.`,
      metadata: { conversationId, amount },
    });
  } catch (error) {
    console.error('Error notificando oferta rechazada mercadillo:', error);
    return { success: false, error };
  }
};

export const notifyMarketplaceOfferCountered = async (
  buyerId: string,
  sellerName: string,
  listingTitle: string,
  newAmount: number,
  conversationId: string
) => {
  try {
    return await createNotification({
      userId: buyerId,
      type: 'MARKETPLACE_OFFER_COUNTERED',
      title: 'Has recibido una contraoferta',
      message: `${sellerName} ha contraofertado ${newAmount}€ por "${listingTitle}".`,
      metadata: { conversationId, amount: newAmount },
    });
  } catch (error) {
    console.error('Error notificando contraoferta mercadillo:', error);
    return { success: false, error };
  }
};

export const notifyAdminsGuestConflict = async (dni: string, phone: string) => {
  try {
    const recipients = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN', 'CHEMI'] } },
      select: { id: true },
    });
    const recipientIds = recipients.map(u => u.id);
    if (recipientIds.length > 0) {
      await createBulkNotifications({
        userIds: recipientIds,
        type: NotificationType.GUEST_IDENTITY_CONFLICT,
        title: 'Alerta: posible suplantación de invitado',
        message: `Inconsistencia en formulario de invitado externo. DNI: ${dni} — Teléfono: ${phone}.`,
        metadata: { dni, phone },
      });
    }

    const alertEmail = process.env.DEFAULT_ADMIN_EMAIL;
    if (alertEmail) {
      const { sendEmail } = await import('./emailService');
      await sendEmail({
        to: alertEmail,
        subject: 'Alerta: posible suplantación de invitado',
        html: `<p>Se ha detectado una inconsistencia en el formulario de invitado externo.</p><p><strong>DNI:</strong> ${dni}<br><strong>Teléfono:</strong> ${phone}</p><p>Revisa el historial de invitaciones.</p>`,
        template: 'admin_notification',
      });
    }
  } catch (error) {
    console.error('Error notificando conflicto de identidad de invitado:', error);
  }
};

