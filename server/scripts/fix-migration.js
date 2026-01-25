// Script para resolver la migración fallida de notificaciones
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Iniciando resolución de migración fallida...');

  try {
    // 1. Leer el script SQL de resolución
    const sqlPath = path.join(__dirname, 'resolve-failed-migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('📝 Aplicando cambios de la migración...');

    // 2. Ejecutar el script SQL
    await prisma.$executeRawUnsafe(sql);

    console.log('✅ Cambios aplicados correctamente');

    // 3. Marcar la migración como resuelta
    console.log('🔄 Marcando migración como resuelta...');

    await prisma.$executeRaw`
      UPDATE "_prisma_migrations"
      SET finished_at = NOW(),
          success = true,
          logs = 'Resolved manually using fix-migration script'
      WHERE migration_name = '20260125000000_add_notifications'
        AND finished_at IS NULL;
    `;

    console.log('✅ Migración marcada como resuelta');
    console.log('🎉 ¡Proceso completado! Ahora puedes ejecutar "npx prisma migrate deploy"');

  } catch (error) {
    console.error('❌ Error durante la resolución:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
