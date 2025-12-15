-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PARTIDA', 'TORNEO', 'OTROS');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "bggId" TEXT,
ADD COLUMN     "durationHours" INTEGER,
ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "gameImage" TEXT,
ADD COLUMN     "gameName" TEXT,
ADD COLUMN     "startHour" INTEGER,
ADD COLUMN     "startMinute" INTEGER,
ADD COLUMN     "type" "EventType" NOT NULL DEFAULT 'OTROS';

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");
