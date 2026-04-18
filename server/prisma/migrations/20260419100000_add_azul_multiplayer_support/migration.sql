-- AlterTable: añadir player3, player4 y maxPlayers a AzulGame
ALTER TABLE "AzulGame"
  ADD COLUMN "player3Id" TEXT,
  ADD COLUMN "player4Id" TEXT,
  ADD COLUMN "maxPlayers" INTEGER NOT NULL DEFAULT 2;

-- CreateIndex
CREATE INDEX "AzulGame_player3Id_idx" ON "AzulGame"("player3Id");
CREATE INDEX "AzulGame_player4Id_idx" ON "AzulGame"("player4Id");

-- AddForeignKey
ALTER TABLE "AzulGame" ADD CONSTRAINT "AzulGame_player3Id_fkey"
  FOREIGN KEY ("player3Id") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AzulGame" ADD CONSTRAINT "AzulGame_player4Id_fkey"
  FOREIGN KEY ("player4Id") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
