-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "fechaBaja" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Membership_fechaBaja_idx" ON "Membership"("fechaBaja");
