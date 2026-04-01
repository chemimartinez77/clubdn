// server/scripts/import-missing-members.js
// Inserta los 2 miembros que no tenían email en el CSV original.

'use strict';

const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function randomPassword() {
  return crypto.randomBytes(15).toString('base64');
}

const members = [
  {
    email: 'joelbaygos@gmail.com',
    name: 'Joel Bayona Belenguer',
    firstName: 'Joel',
    lastName: 'Bayona Belenguer',
    joinedAt: new Date('2026-02-21'),
    membershipType: 'EN_PRUEBAS',
  },
  {
    email: 'kenovis@hotmail.com',
    name: 'Carlos Cano Genoves',
    firstName: 'Carlos',
    lastName: 'Cano Genoves',
    joinedAt: new Date('2026-02-18'),
    membershipType: 'EN_PRUEBAS',
  },
];

async function main() {
  for (const m of members) {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: m.email,
          name: m.name,
          password: randomPassword(),
          role: 'USER',
          status: 'APPROVED',
          emailVerified: true,
        },
      });

      await tx.userProfile.create({
        data: {
          userId: user.id,
          firstName: m.firstName,
          lastName: m.lastName,
          joinedAt: m.joinedAt,
        },
      });

      await tx.membership.create({
        data: {
          userId: user.id,
          type: m.membershipType,
          startDate: m.joinedAt,
          isActive: true,
        },
      });
    });

    console.log(`  [OK] ${m.name} <${m.email}> (${m.membershipType})`);
  }

  console.log('\nListo.');
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
