// server/src/jobs/memberPromotionJob.ts
import cron from 'node-cron';
import { prisma } from '../config/database';
import { notifyAdminsMemberPromoted } from '../services/notificationService';
import { sendMemberPromotedEmail } from '../services/emailService';

const TRIAL_DAYS = 60;

/**
 * Promueve automáticamente los miembros EN_PRUEBAS que llevan ≥ 60 días en el club,
 * y notifica a admins/super admins por campanita y email.
 */
export async function promoteTrialMembers(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - TRIAL_DAYS);

  // Buscar membresías EN_PRUEBAS sin fecha de baja.
  // Filtramos en memoria porque el cutoff debe aplicarse sobre trialStartDate si existe,
  // o sobre startDate si no (miembros nuevos sin reactivación manual).
  const candidates = await prisma.membership.findMany({
    where: {
      type: 'EN_PRUEBAS',
      fechaBaja: null,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  const memberships = candidates.filter(m => {
    const referenceDate = m.trialStartDate ?? m.startDate;
    return referenceDate <= cutoff;
  });

  if (memberships.length === 0) return;

  // Obtener admins con sus emails para el envío de email
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] }, status: 'APPROVED' },
    select: { id: true, name: true, email: true },
  });

  const membersUrl = `${process.env.CLIENT_URL}/admin/members`;

  for (const membership of memberships) {
    const { user } = membership;

    try {
      // Promover a COLABORADOR
      await prisma.membership.update({
        where: { id: membership.id },
        data: {
          type: 'COLABORADOR',
          monthlyFee: 16.00,
        },
      });

      console.log(`[PROMO] ${user.name} (${user.email}) promovido a COLABORADOR`);

      // Notificación de campanita a todos los admins
      await notifyAdminsMemberPromoted(user.name, user.email, user.id);

      // Email a cada admin (sin await en paralelo para no bloquear si uno falla)
      for (const admin of admins) {
        sendMemberPromotedEmail(admin.email, admin.name, user.name, user.email, membersUrl)
          .catch(err => console.error(`[PROMO] Error enviando email a ${admin.email}:`, err));
      }
    } catch (err) {
      console.error(`[PROMO] Error promoviendo a ${user.name}:`, err);
    }
  }
}

/**
 * Registra el cron job de promoción de miembros.
 * Se ejecuta una vez al día a las 08:00.
 */
export function startMemberPromotionJob(): void {
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON] Ejecutando promoteTrialMembers...');
    try {
      await promoteTrialMembers();
      console.log('[CRON] promoteTrialMembers completado');
    } catch (error) {
      console.error('[CRON] Error en promoteTrialMembers:', error);
    }
  });
  console.log('[CRON] Job de promoción de miembros registrado (diario a las 08:00)');
}
