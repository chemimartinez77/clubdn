// server/scripts/clean-for-production.js
// Limpia todas las tablas de datos de prueba antes de ir a producción.
// Conserva: User (solo chemimartinez@gmail.com), ClubConfig, BadgeDefinition,
//            MembershipType, Game, LibraryItem, Document, FinancialCategory
//
// Uso: node server/scripts/clean-for-production.js

'use strict';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PROTECTED_EMAIL = 'chemimartinez@gmail.com';

async function main() {
  console.log('Iniciando limpieza de BD para producción...\n');

  // 1. Analítica / trazabilidad
  await truncate('PageViewArchive');
  await truncate('PageView');
  await truncate('LoginAttempt');
  await truncate('EmailLog');

  // 2. Notificaciones
  await truncate('Notification');

  // 3. Logros de usuario (se conservan las definiciones BadgeDefinition)
  await truncate('UserBadge');

  // 4. Historial de partidas
  await truncate('GamePlayHistory');
  await truncate('GameValidation');

  // 5. Juego Azul / Viernes
  await truncate('AzulGame');
  await truncate('ViernesGame');

  // 6. Eventos
  await truncate('EventAuditLog');
  await truncate('EventPhoto');
  await truncate('EventGuest');
  await truncate('EventShareLink');
  await truncate('EventRegistration');
  await truncate('Invitation');
  await truncate('Event');

  // 7. Reportes
  await truncate('ReportCommentHistory');
  await truncate('ReportComment');
  await truncate('ReportVote');
  await truncate('Report');

  // 8. Finanzas (movimientos, no categorías)
  await truncate('FinancialMovement');

  // 9. Membresías y pagos
  await truncate('MembershipChangeLog');
  await truncate('Payment');

  // 10. Documentos (uploadedById no es nullable, se limpian para poder borrar usuarios)
  await truncate('Document');

  // 11. Eliminar todos los usuarios excepto el protegido
  //     (en cascada elimina UserProfile y Membership)
  const deleted = await prisma.user.deleteMany({
    where: { email: { not: PROTECTED_EMAIL } },
  });
  console.log(`  [OK] User — eliminados ${deleted.count} usuarios (conservado ${PROTECTED_EMAIL})`);

  console.log('\nLimpieza completada.');
}

async function truncate(model) {
  try {
    const result = await prisma[lcFirst(model)].deleteMany({});
    console.log(`  [OK] ${model} — ${result.count} filas eliminadas`);
  } catch (err) {
    console.error(`  [ERROR] ${model}: ${err.message}`);
  }
}

function lcFirst(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
