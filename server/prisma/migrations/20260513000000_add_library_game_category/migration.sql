-- CreateEnum
CREATE TYPE "LibraryGameCategory" AS ENUM (
  'EUROGAMES',
  'TEMATICOS',
  'WARGAMES',
  'ROL',
  'MINIATURAS',
  'WARHAMMER',
  'FILLERS_PARTY',
  'CARTAS_LCG_TCG',
  'ABSTRACTOS'
);

-- Migrate LibraryItem.gameType
ALTER TABLE "LibraryItem" ADD COLUMN "gameTypeNew" "LibraryGameCategory";

UPDATE "LibraryItem" SET "gameTypeNew" = CASE "gameType"
  WHEN 'WARGAME' THEN 'WARGAMES'::"LibraryGameCategory"
  WHEN 'MESA'    THEN 'EUROGAMES'::"LibraryGameCategory"
  WHEN 'CARTAS'  THEN 'CARTAS_LCG_TCG'::"LibraryGameCategory"
  WHEN 'MINI'    THEN 'MINIATURAS'::"LibraryGameCategory"
  WHEN 'ROL'     THEN 'ROL'::"LibraryGameCategory"
END;

ALTER TABLE "LibraryItem" ALTER COLUMN "gameTypeNew" SET NOT NULL;
ALTER TABLE "LibraryItem" DROP COLUMN "gameType";
ALTER TABLE "LibraryItem" RENAME COLUMN "gameTypeNew" TO "gameType";

-- Migrate LibraryDonationRequest.gameType
ALTER TABLE "LibraryDonationRequest" ADD COLUMN "gameTypeNew" "LibraryGameCategory";

UPDATE "LibraryDonationRequest" SET "gameTypeNew" = CASE "gameType"
  WHEN 'WARGAME' THEN 'WARGAMES'::"LibraryGameCategory"
  WHEN 'MESA'    THEN 'EUROGAMES'::"LibraryGameCategory"
  WHEN 'CARTAS'  THEN 'CARTAS_LCG_TCG'::"LibraryGameCategory"
  WHEN 'MINI'    THEN 'MINIATURAS'::"LibraryGameCategory"
  WHEN 'ROL'     THEN 'ROL'::"LibraryGameCategory"
END;

ALTER TABLE "LibraryDonationRequest" ALTER COLUMN "gameTypeNew" SET NOT NULL;
ALTER TABLE "LibraryDonationRequest" DROP COLUMN "gameType";
ALTER TABLE "LibraryDonationRequest" RENAME COLUMN "gameTypeNew" TO "gameType";

-- DropEnum
DROP TYPE "GameType";
