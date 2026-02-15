// server/src/tests/helpers/db.helper.ts
import { prisma } from '../../config/database';

/**
 * Verificar que un usuario existe en la base de datos
 */
export async function userExists(email: string) {
  const user = await prisma.user.findUnique({
    where: { email }
  });
  return user !== null;
}

/**
 * Obtener un usuario por email
 */
export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      badges: true,
      organizedEvents: true,
      eventRegistrations: true,
    }
  });
}

/**
 * Obtener un usuario por ID
 */
export async function getUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      badges: true,
      payments: true,
      profile: true,
    }
  });
}

/**
 * Verificar que un evento existe
 */
export async function eventExists(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId }
  });
  return event !== null;
}

/**
 * Obtener un evento por ID
 */
export async function getEventById(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    include: {
      registrations: true,
      organizer: true,
    }
  });
}

/**
 * Verificar que un usuario está en un evento
 */
export async function userIsAttendingEvent(userId: string, eventId: string) {
  const attendance = await prisma.eventRegistration.findFirst({
    where: {
      userId,
      eventId
    }
  });
  return attendance !== null;
}

/**
 * Contar asistentes de un evento
 */
export async function countEventAttendees(eventId: string) {
  return prisma.eventRegistration.count({
    where: { eventId }
  });
}

/**
 * Obtener un documento por ID
 */
export async function getDocumentById(docId: string) {
  return prisma.document.findUnique({
    where: { id: docId }
  });
}

/**
 * Obtener un reporte de feedback por ID
 */
export async function getFeedbackReportById(reportId: string) {
  return prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reporter: true,
      votes: true,
    }
  });
}

/**
 * Verificar que un usuario tiene un badge desbloqueado
 */
export async function userHasBadge(userId: string, badgeId: string) {
  const userBadge = await prisma.userBadge.findFirst({
    where: {
      userId,
      badgeId
    }
  });
  return userBadge !== null && userBadge.unlockedAt !== null;
}

/**
 * Obtener pagos de un usuario
 */
export async function getUserPayments(userId: string, year: number) {
  return prisma.payment.findMany({
    where: {
      userId,
      year
    },
    orderBy: {
      month: 'asc'
    }
  });
}

/**
 * Verificar que un pago está marcado
 */
export async function paymentIsMarked(userId: string, year: number, month: number) {
  const payment = await prisma.payment.findFirst({
    where: {
      userId,
      year,
      month,
      paid: true
    }
  });
  return payment !== null;
}
