ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LIBRARY_DONATION_REQUESTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LIBRARY_DONATION_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LIBRARY_DONATION_REJECTED';

CREATE TYPE "LibraryDonationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "LibraryItem"
  ADD COLUMN "ownerUserId" TEXT,
  ADD COLUMN "donorUserId" TEXT,
  ADD COLUMN "bajaAt" TIMESTAMP(3),
  ADD COLUMN "bajaByUserId" TEXT;

UPDATE "LibraryItem" li
SET "ownerUserId" = u.id
FROM "User" u
WHERE li."ownerEmail" = u.email
  AND li."ownerEmail" IS NOT NULL
  AND li."ownerEmail" <> 'clubdreadnought.vlc@gmail.com';

CREATE TABLE "LibraryDonationRequest" (
  "id" TEXT NOT NULL,
  "requesterUserId" TEXT NOT NULL,
  "reviewerUserId" TEXT,
  "bggId" TEXT,
  "name" TEXT NOT NULL,
  "gameType" "GameType" NOT NULL,
  "condition" "GameCondition" NOT NULL,
  "notes" TEXT,
  "acquisitionDate" TIMESTAMP(3),
  "status" "LibraryDonationStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedAt" TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdLibraryItemId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "LibraryDonationRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LibraryItem_ownerUserId_idx" ON "LibraryItem"("ownerUserId");
CREATE INDEX "LibraryItem_donorUserId_idx" ON "LibraryItem"("donorUserId");
CREATE INDEX "LibraryItem_bajaAt_idx" ON "LibraryItem"("bajaAt");
CREATE INDEX "LibraryDonationRequest_requesterUserId_idx" ON "LibraryDonationRequest"("requesterUserId");
CREATE INDEX "LibraryDonationRequest_reviewerUserId_idx" ON "LibraryDonationRequest"("reviewerUserId");
CREATE INDEX "LibraryDonationRequest_status_idx" ON "LibraryDonationRequest"("status");
CREATE INDEX "LibraryDonationRequest_createdLibraryItemId_idx" ON "LibraryDonationRequest"("createdLibraryItemId");

ALTER TABLE "LibraryItem"
  ADD CONSTRAINT "LibraryItem_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LibraryItem"
  ADD CONSTRAINT "LibraryItem_donorUserId_fkey"
  FOREIGN KEY ("donorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LibraryItem"
  ADD CONSTRAINT "LibraryItem_bajaByUserId_fkey"
  FOREIGN KEY ("bajaByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LibraryDonationRequest"
  ADD CONSTRAINT "LibraryDonationRequest_requesterUserId_fkey"
  FOREIGN KEY ("requesterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LibraryDonationRequest"
  ADD CONSTRAINT "LibraryDonationRequest_reviewerUserId_fkey"
  FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LibraryDonationRequest"
  ADD CONSTRAINT "LibraryDonationRequest_createdLibraryItemId_fkey"
  FOREIGN KEY ("createdLibraryItemId") REFERENCES "LibraryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
