-- Add view counter to marketplace listings
ALTER TABLE "MarketplaceListing"
ADD COLUMN "viewsCount" INTEGER NOT NULL DEFAULT 0;
