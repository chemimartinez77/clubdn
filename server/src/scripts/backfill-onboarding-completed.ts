// server/src/scripts/backfill-onboarding-completed.ts
// Marca onboardingCompleted = true para todos los UserProfile existentes.
// Ejecutar UNA SOLA VEZ tras la migración 20260409000000_add_onboarding_completed.

import { prisma } from '../config/database';

async function main() {
  const result = await prisma.userProfile.updateMany({
    where: { onboardingCompleted: false },
    data: { onboardingCompleted: true },
  });

  console.log(`Backfill completado: ${result.count} perfiles actualizados.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
