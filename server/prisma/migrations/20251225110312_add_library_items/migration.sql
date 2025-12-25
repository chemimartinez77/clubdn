-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('WARGAME', 'MESA', 'CARTAS', 'MINI', 'ROL');

-- CreateEnum
CREATE TYPE "GameCondition" AS ENUM ('NUEVO', 'BUENO', 'REGULAR', 'MALO');

-- CreateTable
CREATE TABLE "LibraryItem" (
    "id" TEXT NOT NULL,
    "bggId" TEXT,
    "internalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "notes" TEXT,
    "gameType" "GameType" NOT NULL,
    "condition" "GameCondition" NOT NULL,
    "ownerEmail" TEXT,
    "acquisitionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LibraryItem_internalId_key" ON "LibraryItem"("internalId");

-- CreateIndex
CREATE INDEX "LibraryItem_name_idx" ON "LibraryItem"("name");

-- CreateIndex
CREATE INDEX "LibraryItem_gameType_idx" ON "LibraryItem"("gameType");

-- CreateIndex
CREATE INDEX "LibraryItem_condition_idx" ON "LibraryItem"("condition");

-- CreateIndex
CREATE INDEX "LibraryItem_ownerEmail_idx" ON "LibraryItem"("ownerEmail");

-- CreateIndex
CREATE INDEX "LibraryItem_bggId_idx" ON "LibraryItem"("bggId");

-- AddForeignKey
ALTER TABLE "LibraryItem" ADD CONSTRAINT "LibraryItem_bggId_fkey" FOREIGN KEY ("bggId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
