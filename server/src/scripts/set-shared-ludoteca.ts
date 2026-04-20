/**
 * Marca dos usuarios como colección compartida asignándoles el mismo sharedLudotecaGroupId.
 *
 * Uso:
 *   npx ts-node src/scripts/set-shared-ludoteca.ts email1@dominio.com email2@dominio.com
 *
 * Para deshacer el vínculo (dejar groupId a null):
 *   npx ts-node src/scripts/set-shared-ludoteca.ts --clear email1@dominio.com email2@dominio.com
 */

import 'dotenv/config';
import { prisma } from '../config/database';
import { randomUUID } from 'crypto';

async function main() {
  const args = process.argv.slice(2);
  const clear = args[0] === '--clear';
  const emails = clear ? args.slice(1) : args;

  if (emails.length !== 2) {
    console.error('Uso: npx ts-node src/scripts/set-shared-ludoteca.ts [--clear] email1 email2');
    process.exit(1);
  }

  const users = await prisma.user.findMany({
    where: { email: { in: emails } },
    select: { id: true, email: true, name: true },
  });

  if (users.length !== 2) {
    console.error(`Se esperaban 2 usuarios, se encontraron ${users.length}:`, users.map(u => u.email));
    process.exit(1);
  }

  const groupId = clear ? null : randomUUID();

  await prisma.userProfile.updateMany({
    where: { userId: { in: users.map(u => u.id) } },
    data: { sharedLudotecaGroupId: groupId },
  });

  if (clear) {
    console.log(`Vínculo eliminado para: ${users.map(u => u.name).join(' y ')}`);
  } else {
    console.log(`Ludoteca compartida configurada (groupId: ${groupId}):`);
    users.forEach(u => console.log(`  - ${u.name} (${u.email})`));
  }

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  prisma.$disconnect();
  process.exit(1);
});
