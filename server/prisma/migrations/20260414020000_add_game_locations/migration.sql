-- CreateTable: GameLocation (ubicaciones personales de juegos)
CREATE TABLE "GameLocation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameLocation_userId_name_key" ON "GameLocation"("userId", "name");
CREATE INDEX "GameLocation_userId_idx" ON "GameLocation"("userId");

-- AddForeignKey
ALTER TABLE "GameLocation" ADD CONSTRAINT "GameLocation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: añadir locationId a UserGame
ALTER TABLE "UserGame" ADD COLUMN "locationId" TEXT;

-- CreateIndex para locationId
CREATE INDEX "UserGame_locationId_idx" ON "UserGame"("locationId");

-- AddForeignKey
ALTER TABLE "UserGame" ADD CONSTRAINT "UserGame_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "GameLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
