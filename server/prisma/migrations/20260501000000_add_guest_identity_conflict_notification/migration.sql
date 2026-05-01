-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'GUEST_IDENTITY_CONFLICT';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invitation_guestDniNormalized_idx" ON "Invitation"("guestDniNormalized");
