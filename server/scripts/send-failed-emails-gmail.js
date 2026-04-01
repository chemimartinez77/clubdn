// server/scripts/send-failed-emails-gmail.js
// Reenvía los emails fallidos usando la API de Brevo
//
// Uso:
//   node server/scripts/send-failed-emails-gmail.js
//   ONLY_EMAIL=x node server/scripts/send-failed-emails-gmail.js

require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true });

const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');
const axios = require('axios');

const prisma = new PrismaClient();

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const FROM_EMAIL = process.env.SMTP_USER || 'chemimartinez@gmail.com';
const FROM_NAME = 'Club Dreadnought';

const EXCLUDED_EMAILS = ['chemimartinez@gmail.com', 'ileonarroyo@gmail.com'];

function randomDelay() {
  const ms = 1500 + Math.random() * 1500;
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildHtml(name, resetUrl) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f3f4f6;">
  <div style="max-width:600px;margin:40px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:40px 30px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:28px;font-weight:bold;">Acceso a Club Dreadnought</h1>
    </div>
    <div style="padding:40px 30px;">
      <p style="font-size:16px;color:#374151;line-height:1.6;margin-bottom:20px;">
        Hola <strong>${name}</strong>,
      </p>
      <p style="font-size:16px;color:#374151;line-height:1.6;margin-bottom:20px;">
        Te damos la bienvenida a la plataforma del Club Dreadnought. Hemos creado tu cuenta con los datos del club.
      </p>
      <p style="font-size:16px;color:#374151;line-height:1.6;margin-bottom:30px;">
        Haz clic en el botón de abajo para establecer tu contraseña y acceder:
      </p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#6366f1;color:white;padding:14px 40px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">
          Acceder a la plataforma
        </a>
      </div>
      <div style="background:#fef3c7;padding:15px;border-radius:8px;border-left:4px solid #f59e0b;margin:20px 0;">
        <p style="margin:0;color:#92400e;font-size:14px;">
          <strong>Importante:</strong> Este enlace expirará en 72 horas.
        </p>
      </div>
      <p style="font-size:14px;color:#6b7280;margin-top:20px;">
        Si tienes problemas con el botón, copia y pega este enlace en tu navegador:
      </p>
      <p style="font-size:12px;color:#9ca3af;word-break:break-all;background:#f9fafb;padding:10px;border-radius:4px;">
        ${resetUrl}
      </p>
      <hr style="border:none;border-top:1px solid #e5e7eb;margin:30px 0;">
      <p style="color:#9ca3af;font-size:12px;margin-bottom:0;">
        Saludos,<br><strong>El equipo del Club Dreadnought</strong>
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function sendViaBrevo(toEmail, toName, subject, html) {
  await axios.post(
    BREVO_API_URL,
    {
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: toEmail, name: toName }],
      subject,
      htmlContent: html,
    },
    {
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    }
  );
}

async function main() {
  if (!process.env.BREVO_API_KEY) {
    console.error('BREVO_API_KEY no configurada en .env');
    process.exit(1);
  }

  const onlyEmail = process.env.ONLY_EMAIL;

  let users;

  if (onlyEmail) {
    const user = await prisma.user.findUnique({ where: { email: onlyEmail } });
    users = user ? [user] : [];
    if (users.length === 0) {
      console.log(`No se encontró usuario con email: ${onlyEmail}`);
      return;
    }
  } else {
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
    console.log(`Emails fallidos a reintentar: ${failedEmails.length}\n`);

    users = await prisma.user.findMany({
      where: { email: { in: failedEmails, notIn: EXCLUDED_EMAILS } },
      orderBy: { name: 'asc' },
    });
  }

  let ok = 0;
  let errors = 0;

  for (const user of users) {
    const token = randomUUID();
    const expiry = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const clientUrl = process.env.CLIENT_URL || 'https://app.clubdreadnought.org';
    const resetUrl = `${clientUrl}/reset-password?token=${token}`;

    await prisma.user.update({
      where: { id: user.id },
      data: { resetPasswordToken: token, resetPasswordExpiry: expiry },
    });

    try {
      await sendViaBrevo(user.email, user.name, 'Acceso a Club Dreadnought', buildHtml(user.name, resetUrl));
      console.log(`  OK    ${user.email} (${user.name})`);
      ok++;
    } catch (err) {
      const detail = err?.response?.data?.message || err.message;
      console.error(`  ERROR ${user.email} — ${detail}`);
      errors++;
    }

    if (ok + errors < users.length) {
      await randomDelay();
    }
  }

  console.log(`\nResultado: ${ok} enviados, ${errors} errores`);
}

main()
  .catch(err => {
    console.error('Error fatal:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
