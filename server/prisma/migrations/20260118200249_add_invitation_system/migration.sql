-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'USED', 'EXPIRED');

-- AlterTable
ALTER TABLE "ClubConfig" ADD COLUMN     "inviteAllowSelfValidation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inviteMaxActive" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "inviteMaxGuestYear" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "inviteMaxMonthly" INTEGER NOT NULL DEFAULT 10;

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestNameNormalized" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "validDate" TIMESTAMP(3) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "isExceptional" BOOLEAN NOT NULL DEFAULT false,
    "validatedByUserId" TEXT,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_eventId_idx" ON "Invitation"("eventId");

-- CreateIndex
CREATE INDEX "Invitation_memberId_idx" ON "Invitation"("memberId");

-- CreateIndex
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");

-- CreateIndex
CREATE INDEX "Invitation_validDate_idx" ON "Invitation"("validDate");

-- CreateIndex
CREATE INDEX "Invitation_guestNameNormalized_idx" ON "Invitation"("guestNameNormalized");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_validatedByUserId_fkey" FOREIGN KEY ("validatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
