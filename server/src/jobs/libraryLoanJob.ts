import { LibraryQueueStatus } from '@prisma/client';
import { prisma } from '../config/database';

const POLL_MS = 15 * 60 * 1000; // each 15 minutes

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

export function startLibraryLoanJob() {
  setInterval(() => {
    expireStaleQueueNotifications().catch((err) =>
      console.error('[LIBRARY_LOAN_JOB] Error expirando notificaciones:', err)
    );
  }, POLL_MS);
}
