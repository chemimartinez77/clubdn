-- AlterTable: añadir bggUsername y lastBggSync a UserProfile
ALTER TABLE "UserProfile" ADD COLUMN "bggUsername" TEXT;
ALTER TABLE "UserProfile" ADD COLUMN "lastBggSync" TIMESTAMP(3);

-- CreateTable: UserGame (ludoteca personal)
CREATE TABLE "UserGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bggId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "thumbnail" TEXT,
    "yearPublished" INTEGER,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "own" BOOLEAN NOT NULL DEFAULT false,
    "wishlist" BOOLEAN NOT NULL DEFAULT false,
    "wishlistPriority" INTEGER,
    "wantToPlay" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EventResult (resultados de partidas)
CREATE TABLE "EventResult" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "score" INTEGER,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "EventResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserGame_userId_bggId_key" ON "UserGame"("userId", "bggId");
CREATE INDEX "UserGame_userId_idx" ON "UserGame"("userId");
CREATE INDEX "UserGame_userId_status_idx" ON "UserGame"("userId", "status");
CREATE INDEX "EventResult_eventId_idx" ON "EventResult"("eventId");
CREATE INDEX "EventResult_userId_idx" ON "EventResult"("userId");

-- AddForeignKey
ALTER TABLE "UserGame" ADD CONSTRAINT "UserGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventResult" ADD CONSTRAINT "EventResult_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EventResult" ADD CONSTRAINT "EventResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "EventResult" ADD CONSTRAINT "EventResult_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
