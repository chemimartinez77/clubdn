// server/scripts/import-members.js
// Importa miembros desde el CSV exportado del sistema anterior.
//
// Uso:
//   node server/scripts/import-members.js --csv "client/public/tmpsocios (2).csv"
//   node server/scripts/import-members.js --csv "client/public/tmpsocios (2).csv" --dry-run
//
// Opciones:
//   --csv <path>   Ruta al CSV (obligatorio)
//   --dry-run      Solo muestra lo que haría, sin escribir en la BD

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ── Argumentos ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const csvIndex = args.indexOf('--csv');
if (csvIndex === -1 || !args[csvIndex + 1]) {
  console.error('Uso: node import-members.js --csv <ruta-al-csv> [--dry-run]');
  process.exit(1);
}
const CSV_PATH = path.resolve(args[csvIndex + 1]);
const DRY_RUN = args.includes('--dry-run');

if (!fs.existsSync(CSV_PATH)) {
  console.error(`No se encuentra el archivo: ${CSV_PATH}`);
  process.exit(1);
}

if (DRY_RUN) console.log('[DRY RUN] No se escribirá nada en la BD.\n');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parsea una línea CSV respetando campos entre comillas */
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * "Apellidos, Nombre" → { firstName: "Nombre", lastName: "Apellidos" }
 * Si no hay coma, todo va a lastName.
 */
function parseName(raw) {
  const comma = raw.indexOf(',');
  if (comma === -1) return { firstName: '', lastName: raw.trim() };
  const lastName = raw.slice(0, comma).trim();
  const firstName = raw.slice(comma + 1).trim();
  return { firstName, lastName };
}

/** DD/MM/YYYY → Date | null */
function parseDate(raw) {
  if (!raw) return null;
  const parts = raw.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

/** Normaliza DNI/NIE a mayúsculas sin espacios */
function normalizeDni(raw) {
  return raw ? raw.trim().toUpperCase() : null;
}

/** Mapea membresiaNombre + estado → MembershipType de Prisma */
function parseMembershipType(nombre, estado) {
  if (estado === 'canceled') return 'BAJA';
  const map = {
    'Socio': 'SOCIO',
    'Colaborador': 'COLABORADOR',
    'Familiar': 'FAMILIAR',
    'En pruebas': 'EN_PRUEBAS',
    'Baja': 'BAJA',
  };
  return map[nombre] ?? 'COLABORADOR';
}

/** Genera una contraseña aleatoria segura de 20 chars */
function randomPassword() {
  return crypto.randomBytes(15).toString('base64');
}

// ── Lectura del CSV ───────────────────────────────────────────────────────────

async function readCsv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

// ── Importación ───────────────────────────────────────────────────────────────

const PROTECTED_EMAIL = 'chemimartinez@gmail.com';

async function importMembers() {
  const allRows = await readCsv(CSV_PATH);
  console.log(`Filas en CSV: ${allRows.length}`);

  // Deduplicar por email: en caso de duplicado, gana la última aparición
  const seen = new Map();
  for (const row of allRows) {
    const email = (row['email'] ?? '').trim().toLowerCase();
    if (!email) continue;
    if (seen.has(email)) {
      console.log(`  [DEDUP] Email duplicado, se usa la última fila: ${email}`);
    }
    seen.set(email, row);
  }
  const rows = [...seen.values()];
  console.log(`Filas únicas a procesar: ${rows.length}\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const email = (row['email'] ?? '').trim().toLowerCase();
    if (!email) {
      console.warn(`  [SKIP] Fila sin email: ${row['nombre']}`);
      skipped++;
      continue;
    }

    // El usuario protegido no se toca nunca
    if (email === PROTECTED_EMAIL) {
      console.log(`  [SKIP] Usuario protegido: ${email}`);
      skipped++;
      continue;
    }

    const { firstName, lastName } = parseName(row['nombre'] ?? '');
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const membershipType = parseMembershipType(row['membresiaNombre'], row['estado']);
    const joinedAt = parseDate(row['Fecha Alta']);
    const dni = row['dni']?.trim() || null;
    const dniNormalized = normalizeDni(dni);
    const phone = row['mobile']?.trim() || null;
    const iban = row['cuenta']?.trim() || null;
    const address = row['direccion']?.trim() || null;
    const city = row['ciudad']?.trim() || null;
    const province = row['provincia']?.trim() || null;
    const postalCode = row['Codigo Postal']?.trim() || null;
    const memberNumber = row['Número de socio']?.trim() || null;
    const isActive = membershipType !== 'BAJA';

    console.log(`  [${isActive ? 'ACTIVE' : 'BAJA  '}] ${fullName} <${email}> (${membershipType})`);

    if (DRY_RUN) { created++; continue; }

    try {
      await prisma.$transaction(async (tx) => {
        // Crear usuario
        const user = await tx.user.create({
          data: {
            email,
            name: fullName || email,
            password: randomPassword(), // contraseña temporal, no se puede usar sin reset
            role: 'USER',
            status: 'APPROVED',
            emailVerified: true,
          },
        });

        // Crear perfil
        await tx.userProfile.create({
          data: {
            userId: user.id,
            firstName,
            lastName,
            dni,
            dniNormalized,
            phone,
            iban,
            address,
            city,
            province,
            postalCode,
            memberNumber: memberNumber || null,
            joinedAt,
          },
        });

        // Crear membresía
        await tx.membership.create({
          data: {
            userId: user.id,
            type: membershipType,
            iban,
            startDate: joinedAt ?? new Date(),
            isActive,
            becameSocioAt: membershipType === 'SOCIO' ? joinedAt : null,
            fechaBaja: membershipType === 'BAJA' ? (joinedAt ?? new Date()) : null,
          },
        });
      });

      created++;
    } catch (err) {
      console.error(`  [ERROR] ${email}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n── Resumen ──────────────────────────────────────────');
  console.log(`  Creados : ${created}`);
  console.log(`  Saltados: ${skipped}`);
  console.log(`  Errores : ${errors}`);
  console.log('─────────────────────────────────────────────────────');
}

importMembers()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
