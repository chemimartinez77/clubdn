ALTER TABLE "public"."UserProfile"
ADD COLUMN IF NOT EXISTS "accessCombatZone" BOOLEAN NOT NULL DEFAULT false;
