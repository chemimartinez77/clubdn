// server/scripts/send-welcome-emails.js
// Envía correo de bienvenida/reset de contraseña a usuarios importados.
// Genera un token con expiración de 72h y lo guarda en la BD.
//
// Uso:
//   node server/scripts/send-welcome-emails.js
//
// Para probar con un único email sin modificar la lista:
//   ONLY_EMAIL=tucorreo@example.com node server/scripts/send-welcome-emails.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const { sendPasswordResetEmail } = require('../dist/services/emailService');

const prisma = new PrismaClient();

// Lista de emails a los que enviar el correo
const TARGET_EMAILS = [
  'h3ckcsgo@gmail.com',
  'mariajocora@hotmail.com',
  'chemimartinez@gmail.com',
  'nacho81hamc@gmail.com',
  'nacho@hellsangelsmc.es',
  'ileonarroyo@gmail.com',
];

async function main() {
  const onlyEmail = process.env.ONLY_EMAIL;
  const emails = onlyEmail ? [onlyEmail] : TARGET_EMAILS;

  console.log(`Procesando ${emails.length} usuario(s)...\n`);

  let ok = 0;
  let skipped = 0;
  let errors = 0;

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.log(`  SKIP  ${email} — no existe en la BD`);
      skipped++;
      continue;
    }

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
      await sendPasswordResetEmail(email, user.name, token);
      console.log(`  OK    ${email} (${user.name})`);
      ok++;
    } catch (err) {
      console.error(`  ERROR ${email} — fallo al enviar: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nResultado: ${ok} enviados, ${skipped} no encontrados, ${errors} errores`);
}

main()
  .catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
