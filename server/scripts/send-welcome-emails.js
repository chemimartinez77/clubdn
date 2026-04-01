// server/scripts/send-welcome-emails.js
// Envía correo de bienvenida/reset de contraseña a todos los usuarios importados.
// Genera un token con expiración de 72h y lo guarda en la BD.
//
// Uso:
//   node server/scripts/send-welcome-emails.js
//
// Para probar con un único email sin modificar la lista:
//   ONLY_EMAIL=tucorreo@example.com node server/scripts/send-welcome-emails.js
//
// Para incluir también a usuarios que ya tienen contraseña real (bcrypt):
//   INCLUDE_ACTIVE=true node server/scripts/send-welcome-emails.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true });

const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const { sendPasswordResetEmail } = require('../dist/services/emailService');

const prisma = new PrismaClient();

const EXCLUDED_EMAILS = ['chemimartinez@gmail.com', 'ileonarroyo@gmail.com'];

// Las contraseñas generadas por el script de importación siguen el patrón rand_XXXX_XXXX
// Los hashes bcrypt empiezan por $2b$ — esos usuarios ya configuraron su contraseña
function hasRealPassword(passwordHash) {
  return passwordHash && passwordHash.startsWith('$2b$');
}

function randomDelay(min = 1000, max = 3000) {
  const ms = min + Math.random() * (max - min);
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const onlyEmail = process.env.ONLY_EMAIL;
  const includeActive = process.env.INCLUDE_ACTIVE === 'true';
  const retryFailed = process.env.RETRY_FAILED === 'true';

  let users;

  if (retryFailed) {
    // Buscar emails que fallaron hoy en el EmailLog
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const failedLogs = await prisma.emailLog.findMany({
      where: {
        success: false,
        template: 'password_reset',
        sentAt: { gte: today },
      },
      select: { to: true },
    });
    const failedEmails = [...new Set(failedLogs.map(l => l.to))];
    console.log(`Reintentando ${failedEmails.length} emails fallidos...\n`);
    users = await prisma.user.findMany({
      where: { email: { in: failedEmails } },
      orderBy: { name: 'asc' },
    });
  } else if (onlyEmail) {
    const user = await prisma.user.findUnique({ where: { email: onlyEmail } });
    users = user ? [user] : [];
  } else {
    users = await prisma.user.findMany({
      where: {
        email: { notIn: EXCLUDED_EMAILS },
        emailVerified: true,
        status: 'APPROVED',
      },
      orderBy: { name: 'asc' },
    });
  }

  // Separar usuarios que ya tienen contraseña real
  const withRealPassword = users.filter(u => hasRealPassword(u.password));
  const pendingUsers = users.filter(u => !hasRealPassword(u.password));

  if (!onlyEmail && !retryFailed) {
    console.log(`Total usuarios en BD (excl. admin): ${users.length}`);
    console.log(`  - Ya configuraron contraseña:      ${withRealPassword.length}`);
    console.log(`  - Pendientes de recibir email:     ${pendingUsers.length}`);

    if (withRealPassword.length > 0 && !includeActive) {
      console.log(`\nUsuarios con contraseña ya configurada (se omiten):`);
      withRealPassword.forEach(u => console.log(`    ${u.email} (${u.name})`));
      console.log(`\nPara enviarles también el email, usa INCLUDE_ACTIVE=true`);
    }
    console.log('');
  }

  const targetUsers = (onlyEmail || retryFailed) ? users : (includeActive ? users : pendingUsers);

  if (onlyEmail && users.length === 0) {
    console.log(`No se encontró usuario con email: ${onlyEmail}`);
    return;
  }

  // Delay mayor al reintentar para evitar otro 429
  const delayMin = retryFailed ? 5000 : 1000;
  const delayMax = retryFailed ? 8000 : 3000;

  console.log(`Procesando ${targetUsers.length} usuario(s)...\n`);

  let ok = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of targetUsers) {
    const token = randomUUID();
    const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 horas

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: token,
        resetPasswordExpiry: expiry,
      },
    });

    try {
      await sendPasswordResetEmail(user.email, user.name, token);
      console.log(`  OK    ${user.email} (${user.name})`);
      ok++;
    } catch (err) {
      console.error(`  ERROR ${user.email} — fallo al enviar: ${err.message}`);
      errors++;
    }

    // Delay entre envíos para no saturar el servidor de correo
    if (ok + errors < targetUsers.length) {
      await randomDelay(delayMin, delayMax);
    }
  }

  console.log(`\nResultado: ${ok} enviados, ${skipped} omitidos, ${errors} errores`);
}

main()
  .catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
