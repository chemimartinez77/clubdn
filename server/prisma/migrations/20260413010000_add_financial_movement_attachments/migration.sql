CREATE TYPE "FinancialAttachmentType" AS ENUM ('IMAGE', 'PDF');

CREATE TABLE "FinancialMovementAttachment" (
    "id" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileType" "FinancialAttachmentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "cloudinaryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialMovementAttachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FinancialMovementAttachment_movementId_idx" ON "FinancialMovementAttachment"("movementId");

ALTER TABLE "FinancialMovementAttachment"
ADD CONSTRAINT "FinancialMovementAttachment_movementId_fkey"
FOREIGN KEY ("movementId") REFERENCES "FinancialMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
