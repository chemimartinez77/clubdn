CREATE TYPE "SurpriseBoxStatus" AS ENUM ('OPEN', 'RESOLVED', 'CLOSED');

CREATE TABLE "SurpriseBox" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "status" "SurpriseBoxStatus" NOT NULL DEFAULT 'OPEN',
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startHour" INTEGER,
    "startMinute" INTEGER,
    "durationHours" INTEGER,
    "durationMinutes" INTEGER,
    "location" TEXT NOT NULL,
    "address" TEXT,
    "maxAttendees" INTEGER NOT NULL,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "allowLateJoin" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'es',
    "englishLevel" TEXT,
    "createdById" TEXT NOT NULL,
    "resolvedByUserId" TEXT,
    "resolvedEventId" TEXT,
    "winningOptionId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SurpriseBox_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SurpriseBoxOption" (
    "id" TEXT NOT NULL,
    "surpriseBoxId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "gameImage" TEXT,
    "gameThumbnail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurpriseBoxOption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SurpriseBox_token_key" ON "SurpriseBox"("token");
CREATE UNIQUE INDEX "SurpriseBox_resolvedEventId_key" ON "SurpriseBox"("resolvedEventId");
CREATE UNIQUE INDEX "SurpriseBox_winningOptionId_key" ON "SurpriseBox"("winningOptionId");
CREATE INDEX "SurpriseBox_createdById_status_idx" ON "SurpriseBox"("createdById", "status");
CREATE INDEX "SurpriseBox_status_eventDate_idx" ON "SurpriseBox"("status", "eventDate");

CREATE UNIQUE INDEX "SurpriseBoxOption_surpriseBoxId_position_key" ON "SurpriseBoxOption"("surpriseBoxId", "position");
CREATE INDEX "SurpriseBoxOption_surpriseBoxId_position_idx" ON "SurpriseBoxOption"("surpriseBoxId", "position");

ALTER TABLE "SurpriseBox"
ADD CONSTRAINT "SurpriseBox_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SurpriseBox"
ADD CONSTRAINT "SurpriseBox_resolvedByUserId_fkey"
FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SurpriseBox"
ADD CONSTRAINT "SurpriseBox_resolvedEventId_fkey"
FOREIGN KEY ("resolvedEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SurpriseBoxOption"
ADD CONSTRAINT "SurpriseBoxOption_surpriseBoxId_fkey"
FOREIGN KEY ("surpriseBoxId") REFERENCES "SurpriseBox"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SurpriseBox"
ADD CONSTRAINT "SurpriseBox_winningOptionId_fkey"
FOREIGN KEY ("winningOptionId") REFERENCES "SurpriseBoxOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
