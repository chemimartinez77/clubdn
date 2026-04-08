-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: los perfiles existentes ya han completado el proceso de alta
UPDATE "UserProfile" SET "onboardingCompleted" = true;
