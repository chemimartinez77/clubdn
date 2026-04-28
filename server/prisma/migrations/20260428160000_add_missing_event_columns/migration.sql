ALTER TABLE "Event"
  ADD COLUMN IF NOT EXISTS "gameCategory" "BadgeCategory",
  ADD COLUMN IF NOT EXISTS "requiresApproval" BOOLEAN NOT NULL DEFAULT true;
