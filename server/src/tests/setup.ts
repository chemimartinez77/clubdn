// server/src/tests/setup.ts
import dotenv from 'dotenv';
import path from 'path';
import { prisma } from '../config/database';
import '@jest/globals';

// Cargar variables de entorno de test
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// Setup global antes de todos los tests
beforeAll(async () => {
  // Opcional: Aplicar migraciones si es necesario
  // await execSync('npx prisma migrate deploy', { stdio: 'inherit' });

  console.log('🧪 Test environment initialized');
});

// Cleanup después de cada test
afterEach(async () => {
  // Limpiar datos de test
  const deleteOrders = [
    prisma.financialMovement.deleteMany(),
    prisma.financialCategory.deleteMany(),
    prisma.reportVote.deleteMany(),
    prisma.report.deleteMany(),
    prisma.document.deleteMany(),
    prisma.eventPhoto.deleteMany(),
    prisma.eventRegistration.deleteMany(),
    prisma.event.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.userBadge.deleteMany(),
    prisma.badgeDefinition.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.game.deleteMany(),
    prisma.user.deleteMany(),
  ];

  await prisma.$transaction(deleteOrders);
});

// Cleanup global después de todos los tests
afterAll(async () => {
  await prisma.$disconnect();
  console.log('🧪 Test environment cleaned up');

  // Dar tiempo para que se cierren las conexiones
  await new Promise(resolve => setTimeout(resolve, 500));
});
