-- Cambiar el default de emailUpdates a false y actualizar registros existentes
ALTER TABLE "UserProfile" ALTER COLUMN "emailUpdates" SET DEFAULT false;
UPDATE "UserProfile" SET "emailUpdates" = false WHERE "emailUpdates" = true;
