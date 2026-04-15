import cron from 'node-cron';
import { prisma } from '../config/database';

const NOTIFICATION_RETENTION_DAYS = 7;

function buildCutoffDate(): Date {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - NOTIFICATION_RETENTION_DAYS);
  return cutoff;
}

export async function cleanupOldNotifications(): Promise<void> {
  const cutoff = buildCutoffDate();

  const [notificationsResult, globalNotificationsResult] = await prisma.$transaction([
    prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoff,
        },
      },
    }),
    prisma.globalNotification.deleteMany({
      where: {
        createdAt: {
          lt: cutoff,
        },
      },
    }),
  ]);

  console.log(
    `[CRON] Limpieza de notificaciones completada. ` +
    `Notification borradas: ${notificationsResult.count}. ` +
    `GlobalNotification borradas: ${globalNotificationsResult.count}. ` +
    `Cutoff: ${cutoff.toISOString()}`
  );
}

export function startNotificationCleanupJob(): void {
  cron.schedule('5 8 * * *', async () => {
    console.log('[CRON] Ejecutando cleanupOldNotifications...');
    try {
      await cleanupOldNotifications();
    } catch (error) {
      console.error('[CRON] Error en cleanupOldNotifications:', error);
    }
  });

  console.log('[CRON] Job de limpieza de notificaciones registrado (diario a las 08:05)');
}
