-- Añadir valor DRAFT al enum EventStatus
ALTER TYPE "EventStatus" ADD VALUE IF NOT EXISTS 'DRAFT';

-- Añadir columna draftEventId a SurpriseBox
ALTER TABLE "SurpriseBox" ADD COLUMN IF NOT EXISTS "draftEventId" TEXT;

-- Añadir constraint unique en draftEventId
ALTER TABLE "SurpriseBox" ADD CONSTRAINT "SurpriseBox_draftEventId_key" UNIQUE ("draftEventId");

-- Añadir foreign key de draftEventId -> Event.id
ALTER TABLE "SurpriseBox" ADD CONSTRAINT "SurpriseBox_draftEventId_fkey" FOREIGN KEY ("draftEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
