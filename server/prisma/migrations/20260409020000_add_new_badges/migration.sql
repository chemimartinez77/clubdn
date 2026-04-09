-- AlterEnum: añadir nuevas categorías de badge
ALTER TYPE "BadgeCategory" ADD VALUE 'CONOCEDOR_GENEROS';
ALTER TYPE "BadgeCategory" ADD VALUE 'FOTOGRAFO';

-- AlterTable Game: añadir categoría confirmada por consenso
ALTER TABLE "Game" ADD COLUMN "confirmedCategory" "BadgeCategory";

-- CreateTable GameCategoryVote
CREATE TABLE "GameCategoryVote" (
    "id" TEXT NOT NULL,
    "bggId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "BadgeCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameCategoryVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable GenreConsensusHistory
CREATE TABLE "GenreConsensusHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bggId" TEXT NOT NULL,
    "category" "BadgeCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GenreConsensusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameCategoryVote_bggId_userId_key" ON "GameCategoryVote"("bggId", "userId");
CREATE INDEX "GameCategoryVote_bggId_idx" ON "GameCategoryVote"("bggId");
CREATE INDEX "GameCategoryVote_userId_idx" ON "GameCategoryVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GenreConsensusHistory_userId_bggId_key" ON "GenreConsensusHistory"("userId", "bggId");
CREATE INDEX "GenreConsensusHistory_userId_idx" ON "GenreConsensusHistory"("userId");

-- AddForeignKey
ALTER TABLE "GameCategoryVote" ADD CONSTRAINT "GameCategoryVote_bggId_fkey" FOREIGN KEY ("bggId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameCategoryVote" ADD CONSTRAINT "GameCategoryVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenreConsensusHistory" ADD CONSTRAINT "GenreConsensusHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
