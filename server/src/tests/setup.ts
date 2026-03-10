// server/src/tests/setup.ts
import dotenv from 'dotenv';
import path from 'path';
import { prisma } from '../config/database';
import '@jest/globals';

// Cargar variables de entorno de test
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// 🚨 SEGURIDAD CRÍTICA: Prevenir ejecución de tests contra producción
if (!process.env.DATABASE_URL?.includes('clubdn_test')) {
  console.error('🚨 PELIGRO: Los tests NO pueden ejecutarse contra producción!');
  console.error(`DATABASE_URL actual: ${process.env.DATABASE_URL}`);
  throw new Error(
    'Tests bloqueados: DATABASE_URL debe apuntar a la base de datos de test (clubdn_test). ' +
    'Verifica que .env.test existe y se está cargando correctamente.'
  );
}

// Setup global antes de todos los tests
beforeAll(async () => {
  console.log('🧪 Test environment initialized');
  console.log(`📊 Database: ${process.env.DATABASE_URL}`);
});

// Cleanup después de cada test
afterEach(async () => {
  // Orden respetando FK: primero las tablas hijas
  await prisma.$transaction([
    prisma.eventAuditLog.deleteMany(),
    prisma.eventGuest.deleteMany(),
    prisma.invitation.deleteMany(),
    prisma.eventPhoto.deleteMany(),
    prisma.eventRegistration.deleteMany(),
    prisma.event.deleteMany(),
    prisma.financialMovement.deleteMany(),
    prisma.financialCategory.deleteMany(),
    prisma.reportCommentHistory.deleteMany(),
    prisma.reportComment.deleteMany(),
    prisma.reportVote.deleteMany(),
    prisma.report.deleteMany(),
    prisma.document.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.userBadge.deleteMany(),
    prisma.badgeDefinition.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.membershipChangeLog.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.azulGame.deleteMany(),
    prisma.viernesGame.deleteMany(),
    prisma.game.deleteMany(),
    prisma.gamePlayHistory.deleteMany(),
    prisma.libraryItem.deleteMany(),
    prisma.loginAttempt.deleteMany(),
    prisma.pageViewArchive.deleteMany(),
    prisma.pageView.deleteMany(),
    prisma.userProfile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
});

// Cleanup global después de todos los tests
afterAll(async () => {
  await prisma.$disconnect();
  console.log('🧪 Test environment cleaned up');

  // Dar tiempo para que se cierren las conexiones
  await new Promise(resolve => setTimeout(resolve, 500));
});
