-- AlterTable Event
ALTER TABLE "Event" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "cancelledById" TEXT;

-- AlterTable EventRegistration
ALTER TABLE "EventRegistration" ADD COLUMN IF NOT EXISTS "cancelledAt" TIMESTAMP(3);

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Event_cancelledById_fkey'
    ) THEN
        ALTER TABLE "Event" ADD CONSTRAINT "Event_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
