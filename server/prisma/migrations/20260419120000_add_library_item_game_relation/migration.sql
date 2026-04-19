-- Limpiar bggIds huérfanos (ítems ROL con IDs de RPGGeek que no están en Game)
UPDATE "LibraryItem" SET "bggId" = NULL
WHERE "bggId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Game" WHERE id = "LibraryItem"."bggId");

-- AddForeignKey
ALTER TABLE "LibraryItem" ADD CONSTRAINT "LibraryItem_bggId_fkey" FOREIGN KEY ("bggId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
