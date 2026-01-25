-- Script para resolver la migración fallida de notificaciones
-- Este script verifica y aplica solo los cambios que faltan

-- 1. Crear enum si no existe
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

-- 2. Añadir columnas a UserProfile si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserProfile' AND column_name = 'notifyNewEvents') THEN
        ALTER TABLE "UserProfile" ADD COLUMN "notifyNewEvents" BOOLEAN NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserProfile' AND column_name = 'notifyEventChanges') THEN
        ALTER TABLE "UserProfile" ADD COLUMN "notifyEventChanges" BOOLEAN NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserProfile' AND column_name = 'notifyEventCancelled') THEN
        ALTER TABLE "UserProfile" ADD COLUMN "notifyEventCancelled" BOOLEAN NOT NULL DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserProfile' AND column_name = 'notifyInvitations') THEN
        ALTER TABLE "UserProfile" ADD COLUMN "notifyInvitations" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- 3. Crear tabla Notification si no existe
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

-- 4. Crear índices si no existen
CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_read_idx" ON "Notification"("read");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

-- 5. Añadir foreign key si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey'
    ) THEN
        ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
