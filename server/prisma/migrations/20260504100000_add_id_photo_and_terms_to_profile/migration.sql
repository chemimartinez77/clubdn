-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN "idPhotoUrl" TEXT,
ADD COLUMN "termsAccepted" BOOLEAN NOT NULL DEFAULT false;
