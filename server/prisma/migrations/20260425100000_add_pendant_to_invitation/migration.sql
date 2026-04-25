-- AlterTable
ALTER TABLE "Invitation" ADD COLUMN "pendant" INTEGER;

-- CreateIndex
CREATE INDEX "Invitation_usedAt_idx" ON "Invitation"("usedAt");
