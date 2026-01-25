// Script para resolver la migración fallida de notificaciones
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Iniciando resolución de migración fallida...');

  try {
    console.log('📝 Aplicando cambios de la migración...');

    // 1. Crear enum si no existe
    console.log('  - Creando enum NotificationType...');
    await prisma.$executeRaw`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
              CREATE TYPE "NotificationType" AS ENUM (
                  'EVENT_CANCELLED',
                  'EVENT_MODIFIED',
                  'EVENT_CREATED',
                  'EVENT_REMINDER',
                  'USER_APPROVED',
                  'USER_REJECTED',
                  'ADMIN_NEW_USER',
                  'INVITATION_VALIDATED',
                  'INVITATION_REJECTED',
                  'WAITLIST_SPOT_AVAILABLE'
              );
          END IF;
      END $$;
    `;

    // 2. Añadir columnas a UserProfile
    console.log('  - Añadiendo columnas a UserProfile...');

    await prisma.$executeRaw`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserProfile' AND column_name = 'notifyNewEvents') THEN
              ALTER TABLE "UserProfile" ADD COLUMN "notifyNewEvents" BOOLEAN NOT NULL DEFAULT true;
          END IF;
      END $$;
    `;

    await prisma.$executeRaw`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserProfile' AND column_name = 'notifyEventChanges') THEN
              ALTER TABLE "UserProfile" ADD COLUMN "notifyEventChanges" BOOLEAN NOT NULL DEFAULT true;
          END IF;
      END $$;
    `;

    await prisma.$executeRaw`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserProfile' AND column_name = 'notifyEventCancelled') THEN
              ALTER TABLE "UserProfile" ADD COLUMN "notifyEventCancelled" BOOLEAN NOT NULL DEFAULT true;
          END IF;
      END $$;
    `;

    await prisma.$executeRaw`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserProfile' AND column_name = 'notifyInvitations') THEN
              ALTER TABLE "UserProfile" ADD COLUMN "notifyInvitations" BOOLEAN NOT NULL DEFAULT true;
          END IF;
      END $$;
    `;

    // 3. Crear tabla Notification
    console.log('  - Creando tabla Notification...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Notification" (
          "id" TEXT NOT NULL,
          "userId" TEXT NOT NULL,
          "type" "NotificationType" NOT NULL,
          "title" TEXT NOT NULL,
          "message" TEXT NOT NULL,
          "metadata" JSONB,
          "read" BOOLEAN NOT NULL DEFAULT false,
          "readAt" TIMESTAMP(3),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
      );
    `;

    // 4. Crear índices
    console.log('  - Creando índices...');
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read");`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");`;

    // 5. Añadir foreign key
    console.log('  - Añadiendo foreign key...');
    await prisma.$executeRaw`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey') THEN
              ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
              FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
          END IF;
      END $$;
    `;

    console.log('✅ Cambios aplicados correctamente');

    // 3. Marcar la migración como resuelta
    console.log('🔄 Marcando migración como resuelta...');

    // Verificar si existe la columna 'applied_steps_count' (Prisma 5+) o simplemente marcar con finished_at
    const result = await prisma.$executeRaw`
      UPDATE "_prisma_migrations"
      SET finished_at = NOW(),
          logs = 'Resolved manually using fix-migration script',
          applied_steps_count = 1
      WHERE migration_name = '20260125000000_add_notifications'
        AND finished_at IS NULL;
    `;

    console.log('✅ Migración marcada como resuelta');
    console.log(`   (${result} fila(s) actualizada(s))`);
    console.log('🎉 ¡Proceso completado! Ahora puedes ejecutar "npx prisma migrate deploy"');

  } catch (error) {
    console.error('❌ Error durante la resolución:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
