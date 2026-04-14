-- AlterTable
ALTER TABLE "Event" ADD COLUMN "linkedNextEventId" TEXT;

-- CreateTable
CREATE TABLE "EventExpansion" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventExpansion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_linkedNextEventId_key" ON "Event"("linkedNextEventId");
CREATE INDEX "Event_linkedNextEventId_idx" ON "Event"("linkedNextEventId");
CREATE UNIQUE INDEX "EventExpansion_eventId_gameId_key" ON "EventExpansion"("eventId", "gameId");
CREATE INDEX "EventExpansion_eventId_position_idx" ON "EventExpansion"("eventId", "position");
CREATE INDEX "EventExpansion_gameId_idx" ON "EventExpansion"("gameId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_linkedNextEventId_fkey" FOREIGN KEY ("linkedNextEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EventExpansion" ADD CONSTRAINT "EventExpansion_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventExpansion" ADD CONSTRAINT "EventExpansion_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
