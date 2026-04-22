import { LibraryItemLoanStatus, LibraryLoanStatus, LibraryQueueStatus } from '@prisma/client';
import { prisma } from '../config/database';

const POLL_MS = 15 * 60 * 1000; // each 15 minutes
const REQUEST_PICKUP_HOURS = 48;

async function expireStaleQueueNotifications() {
  const config = await prisma.clubConfig.findUnique({
    where: { id: 'club_config' },
    select: { loanQueueNotifyHours: true },
  });
  const hours = config?.loanQueueNotifyHours ?? 48;
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  const stale = await prisma.libraryQueue.findMany({
    where: { status: LibraryQueueStatus.NOTIFIED, notifiedAt: { lte: cutoff } },
    select: { id: true, libraryItemId: true, libraryItem: { select: { name: true } } },
  });

  for (const entry of stale) {
    await prisma.libraryQueue.update({
      where: { id: entry.id },
      data: { status: LibraryQueueStatus.CANCELLED },
    });

    const next = await prisma.libraryQueue.findFirst({
      where: { libraryItemId: entry.libraryItemId, status: LibraryQueueStatus.WAITING },
      orderBy: { createdAt: 'asc' },
      select: { id: true, userId: true },
    });

    if (next) {
      const now = new Date();
      await prisma.libraryQueue.update({
        where: { id: next.id },
        data: { status: LibraryQueueStatus.NOTIFIED, notifiedAt: now },
      });
      await prisma.notification.create({
        data: {
          userId: next.userId,
          type: 'LIBRARY_QUEUE_AVAILABLE',
          title: 'Juego disponible',
          message: `"${entry.libraryItem.name}" ya está disponible. ¡Solicita tu préstamo antes de que lo haga otro socio!`,
          metadata: { itemId: entry.libraryItemId, itemName: entry.libraryItem.name },
        },
      });
    }
  }
}

async function notifyNextInQueue(libraryItemId: string, itemName: string) {
  const next = await prisma.libraryQueue.findFirst({
    where: { libraryItemId, status: LibraryQueueStatus.WAITING },
    orderBy: { createdAt: 'asc' },
    select: { id: true, userId: true },
  });

  if (!next) return;

  const now = new Date();
  await prisma.libraryQueue.update({
    where: { id: next.id },
    data: { status: LibraryQueueStatus.NOTIFIED, notifiedAt: now },
  });
  await prisma.notification.create({
    data: {
      userId: next.userId,
      type: 'LIBRARY_QUEUE_AVAILABLE',
      title: 'Juego disponible',
      message: `"${itemName}" ya esta disponible. Solicita tu prestamo antes de que lo haga otro socio.`,
      metadata: { itemId: libraryItemId, itemName },
    },
  });
}

async function expireStaleLoanRequests() {
  const cutoff = new Date(Date.now() - REQUEST_PICKUP_HOURS * 60 * 60 * 1000);
  const stale = await prisma.libraryLoan.findMany({
    where: { status: LibraryLoanStatus.REQUESTED, createdAt: { lte: cutoff } },
    select: { id: true, libraryItemId: true, libraryItem: { select: { name: true } } },
  });

  for (const loan of stale) {
    await prisma.$transaction(async (tx) => {
      await tx.libraryLoan.update({
        where: { id: loan.id },
        data: { status: LibraryLoanStatus.CANCELLED },
      });
      await tx.libraryItem.update({
        where: { id: loan.libraryItemId },
        data: { loanStatus: LibraryItemLoanStatus.AVAILABLE },
      });
    });

    await notifyNextInQueue(loan.libraryItemId, loan.libraryItem.name);
  }
}

export function startLibraryLoanJob() {
  setInterval(() => {
    expireStaleQueueNotifications().catch((err) =>
      console.error('[LIBRARY_LOAN_JOB] Error expirando notificaciones:', err)
    );
    expireStaleLoanRequests().catch((err) =>
      console.error('[LIBRARY_LOAN_JOB] Error expirando solicitudes pendientes:', err)
    );
  }, POLL_MS);
}
