-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MembershipType" ADD VALUE 'FAMILIAR';
ALTER TYPE "MembershipType" ADD VALUE 'EN_PRUEBAS';
ALTER TYPE "MembershipType" ADD VALUE 'BAJA';

-- CreateTable
CREATE TABLE "ClubConfig" (
    "id" TEXT NOT NULL DEFAULT 'club_config',
    "membershipTypes" JSONB NOT NULL,
    "clubName" TEXT NOT NULL DEFAULT 'Club DN',
    "clubEmail" TEXT,
    "clubPhone" TEXT,
    "clubAddress" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubConfig_pkey" PRIMARY KEY ("id")
);
