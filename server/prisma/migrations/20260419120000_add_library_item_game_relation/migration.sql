-- AddForeignKey
ALTER TABLE "LibraryItem" ADD CONSTRAINT "LibraryItem_bggId_fkey" FOREIGN KEY ("bggId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;
