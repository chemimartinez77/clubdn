// server/src/scripts/backfill-onboarding-completed.ts
// Marca onboardingCompleted = true para perfiles existentes y crea perfiles minimos
// para usuarios APPROVED que aun no tengan UserProfile.

import { prisma } from '../config/database';

async function main() {
  const updatedProfiles = await prisma.userProfile.updateMany({
    where: { onboardingCompleted: false },
    data: { onboardingCompleted: true },
  });

  const approvedUsersWithoutProfile = await prisma.user.findMany({
    where: {
      status: 'APPROVED',
      profile: null
    },
    select: {
      id: true
    }
  });

  if (approvedUsersWithoutProfile.length > 0) {
    await prisma.userProfile.createMany({
      data: approvedUsersWithoutProfile.map((user) => ({
        userId: user.id,
        favoriteGames: [],
        notifications: true,
        emailUpdates: false,
        notifyNewEvents: true,
        notifyEventChanges: true,
        notifyEventCancelled: true,
        notifyInvitations: true,
        onboardingCompleted: true
      }))
    });
  }

  console.log(`Backfill completado: ${updatedProfiles.count} perfiles actualizados.`);
  console.log(`Perfiles minimos creados para usuarios APPROVED sin perfil: ${approvedUsersWithoutProfile.length}.`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
