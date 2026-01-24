-- CreateEnum
CREATE TYPE "EventAuditAction" AS ENUM ('REGISTER', 'UNREGISTER', 'REMOVE_PARTICIPANT', 'INVITE', 'CANCEL_INVITE', 'CLOSE_CAPACITY');

-- AlterEnum
ALTER TYPE "InvitationStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- CreateTable
CREATE TABLE "EventAuditLog" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "EventAuditAction" NOT NULL,
    "targetUserId" TEXT,
    "targetGuestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,

    CONSTRAINT "EventAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventAuditLog_eventId_idx" ON "EventAuditLog"("eventId");
CREATE INDEX "EventAuditLog_actorId_idx" ON "EventAuditLog"("actorId");
CREATE INDEX "EventAuditLog_action_idx" ON "EventAuditLog"("action");

-- AddForeignKey
ALTER TABLE "EventAuditLog" ADD CONSTRAINT "EventAuditLog_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventAuditLog" ADD CONSTRAINT "EventAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventAuditLog" ADD CONSTRAINT "EventAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventAuditLog" ADD CONSTRAINT "EventAuditLog_targetGuestId_fkey" FOREIGN KEY ("targetGuestId") REFERENCES "EventGuest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
