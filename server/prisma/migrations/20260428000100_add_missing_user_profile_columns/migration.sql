-- Añadir columnas faltantes en UserProfile para alinear la base con schema.prisma
ALTER TABLE "UserProfile"
  ADD COLUMN IF NOT EXISTS "nick" TEXT,
  ADD COLUMN IF NOT EXISTS "memberNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "joinedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "address" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "province" TEXT,
  ADD COLUMN IF NOT EXISTS "postalCode" TEXT,
  ADD COLUMN IF NOT EXISTS "iban" TEXT,
  ADD COLUMN IF NOT EXISTS "allowEventInvitations" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "defaultScreen" TEXT NOT NULL DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS "tourDismissed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "calendarTourDismissed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "feedbackTourDismissed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "createPartidaTourDismissed" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "sharedLudotecaGroupId" TEXT;
