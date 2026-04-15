ALTER TABLE "Event"
ADD COLUMN "disputeConfirmedManually" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Event" e
SET "disputeConfirmedManually" = true
WHERE e."disputeConfirmedAt" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "GameValidation" gv
    WHERE gv."eventId" = e."id"
  );
