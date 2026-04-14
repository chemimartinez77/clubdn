-- CreateEnum
CREATE TYPE "BggSyncJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "BggSyncJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bggUsername" TEXT NOT NULL,
    "status" "BggSyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "locationId" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    "totalToImport" INTEGER NOT NULL DEFAULT 0,
    "totalToDelete" INTEGER NOT NULL DEFAULT 0,
    "processed" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "linkedExisting" INTEGER NOT NULL DEFAULT 0,
    "deleted" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "estimatedSeconds" INTEGER NOT NULL DEFAULT 0,
    "importPayload" JSONB NOT NULL,
    "deletePayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BggSyncJob_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "UserGame" ADD COLUMN "gameId" TEXT;

-- Backfill catalog rows from existing UserGame cache if missing
INSERT INTO "Game" (
    "id",
    "name",
    "alternateNames",
    "description",
    "yearPublished",
    "image",
    "thumbnail",
    "minPlayers",
    "maxPlayers",
    "playingTime",
    "minPlaytime",
    "maxPlaytime",
    "minAge",
    "usersRated",
    "averageRating",
    "bayesAverage",
    "rank",
    "strategyRank",
    "complexityRating",
    "numOwned",
    "numWanting",
    "numWishing",
    "numComments",
    "categories",
    "mechanics",
    "families",
    "designers",
    "artists",
    "publishers",
    "createdAt",
    "updatedAt",
    "lastSyncedAt"
)
SELECT
    ug."bggId",
    ug."title",
    ARRAY[]::TEXT[],
    NULL,
    ug."yearPublished",
    ug."thumbnail",
    ug."thumbnail",
    ug."minPlayers",
    ug."maxPlayers",
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "UserGame" ug
LEFT JOIN "Game" g ON g."id" = ug."bggId"
WHERE g."id" IS NULL;

-- Backfill relation
UPDATE "UserGame"
SET "gameId" = "bggId"
WHERE "gameId" IS NULL;

-- Enforce relation
ALTER TABLE "UserGame" ALTER COLUMN "gameId" SET NOT NULL;

-- Drop old unique/indexes before removing legacy columns
DROP INDEX IF EXISTS "UserGame_userId_bggId_key";

-- Drop legacy cache columns
ALTER TABLE "UserGame"
    DROP COLUMN "bggId",
    DROP COLUMN "title",
    DROP COLUMN "thumbnail",
    DROP COLUMN "yearPublished",
    DROP COLUMN "minPlayers",
    DROP COLUMN "maxPlayers";

-- CreateIndex
CREATE UNIQUE INDEX "UserGame_userId_gameId_key" ON "UserGame"("userId", "gameId");
CREATE INDEX "UserGame_gameId_idx" ON "UserGame"("gameId");
CREATE INDEX "BggSyncJob_userId_requestedAt_idx" ON "BggSyncJob"("userId", "requestedAt");
CREATE INDEX "BggSyncJob_status_requestedAt_idx" ON "BggSyncJob"("status", "requestedAt");

-- AddForeignKey
ALTER TABLE "UserGame" ADD CONSTRAINT "UserGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BggSyncJob" ADD CONSTRAINT "BggSyncJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
