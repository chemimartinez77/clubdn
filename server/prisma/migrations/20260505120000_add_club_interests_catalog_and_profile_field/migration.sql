ALTER TABLE "UserProfile"
ADD COLUMN "clubInterests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "ClubConfig"
ADD COLUMN "clubInterestsCatalog" JSONB;
