-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alternateNames" TEXT[],
    "description" TEXT,
    "yearPublished" INTEGER,
    "image" TEXT,
    "thumbnail" TEXT,
    "minPlayers" INTEGER,
    "maxPlayers" INTEGER,
    "playingTime" INTEGER,
    "minPlaytime" INTEGER,
    "maxPlaytime" INTEGER,
    "minAge" INTEGER,
    "usersRated" INTEGER,
    "averageRating" DOUBLE PRECISION,
    "bayesAverage" DOUBLE PRECISION,
    "rank" INTEGER,
    "strategyRank" INTEGER,
    "complexityRating" DOUBLE PRECISION,
    "numOwned" INTEGER,
    "numWanting" INTEGER,
    "numWishing" INTEGER,
    "numComments" INTEGER,
    "categories" TEXT[],
    "mechanics" TEXT[],
    "families" TEXT[],
    "designers" TEXT[],
    "artists" TEXT[],
    "publishers" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Game_name_idx" ON "Game"("name");

-- CreateIndex
CREATE INDEX "Game_yearPublished_idx" ON "Game"("yearPublished");

-- CreateIndex
CREATE INDEX "Game_rank_idx" ON "Game"("rank");

-- CreateIndex
CREATE INDEX "Game_averageRating_idx" ON "Game"("averageRating");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_bggId_fkey" FOREIGN KEY ("bggId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
