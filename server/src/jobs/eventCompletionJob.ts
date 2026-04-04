// server/src/jobs/eventCompletionJob.ts
import cron from 'node-cron';
import { completePassedEvents } from '../controllers/statsController';

/**
 * Cron job que marca como COMPLETED los eventos cuya hora de fin ya ha pasado
 * y notifica al organizador para que confirme si la partida se disputó.
 * Se ejecuta cada hora en punto.
 */
export function startEventCompletionJob(): void {
  cron.schedule('0 12-23,0-2 * * *', async () => {
    console.log('[CRON] Ejecutando completePassedEvents...');
    try {
      await completePassedEvents();
      console.log('[CRON] completePassedEvents completado');
    } catch (error) {
      console.error('[CRON] Error en completePassedEvents:', error);
    }
  });
  console.log('[CRON] Job de cierre de eventos registrado (cada hora)');
}
