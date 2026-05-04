// server/src/jobs/eventCompletionJob.ts
import cron from 'node-cron';
import { prisma } from '../config/database';
import { completePassedEvents } from '../controllers/statsController';

async function markNotAttendedInvitations(): Promise<void> {
  const now = new Date();

  const candidates = await prisma.invitation.findMany({
    where: { status: 'PENDING' },
    select: {
      id: true,
      event: {
        select: {
          date: true,
          startHour: true,
          startMinute: true,
          durationHours: true,
          durationMinutes: true,
        },
      },
    },
  });

  const expiredIds: string[] = [];

  for (const inv of candidates) {
    const { date, startHour, startMinute, durationHours, durationMinutes } = inv.event;
    if (startHour == null) continue;

    const endTime = new Date(date);
    endTime.setHours(startHour + (durationHours ?? 0), (startMinute ?? 0) + (durationMinutes ?? 0), 0, 0);

    if (endTime < now) {
      expiredIds.push(inv.id);
    }
  }

  if (expiredIds.length === 0) return;

  await prisma.invitation.updateMany({
    where: { id: { in: expiredIds } },
    data: { status: 'NOT_ATTENDED' },
  });

  console.log(`[CRON] ${expiredIds.length} invitaciones marcadas como NOT_ATTENDED`);
}

export function startEventCompletionJob(): void {
  cron.schedule('0,30 12-23,0-2 * * *', async () => {
    console.log('[CRON] Ejecutando completePassedEvents...');
    try {
      await completePassedEvents();
      console.log('[CRON] completePassedEvents completado');
    } catch (error) {
      console.error('[CRON] Error en completePassedEvents:', error);
    }

    console.log('[CRON] Ejecutando markNotAttendedInvitations...');
    try {
      await markNotAttendedInvitations();
    } catch (error) {
      console.error('[CRON] Error en markNotAttendedInvitations:', error);
    }
  });
  console.log('[CRON] Job de cierre de eventos registrado (cada 30 minutos)');
}
