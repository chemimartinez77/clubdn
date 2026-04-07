-- AlterTable
ALTER TABLE "Event" ADD COLUMN "cancellationReason" TEXT;

-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN "removalReason" TEXT;
