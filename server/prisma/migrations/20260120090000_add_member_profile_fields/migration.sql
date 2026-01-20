-- Add admin-only member profile fields
ALTER TABLE "UserProfile"
  ADD COLUMN "firstName" TEXT,
  ADD COLUMN "lastName" TEXT,
  ADD COLUMN "dni" TEXT,
  ADD COLUMN "dniNormalized" TEXT,
  ADD COLUMN "imageConsentActivities" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "imageConsentSocial" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "UserProfile_dniNormalized_idx" ON "UserProfile"("dniNormalized");
