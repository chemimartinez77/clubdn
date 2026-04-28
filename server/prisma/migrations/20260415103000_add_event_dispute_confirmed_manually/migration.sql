ALTER TABLE "Event"
ADD COLUMN "disputeConfirmedManually" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Event' AND column_name = 'disputeConfirmedAt'
  ) THEN
    UPDATE "Event" e
    SET "disputeConfirmedManually" = true
    WHERE e."disputeConfirmedAt" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "GameValidation" gv WHERE gv."eventId" = e."id"
      );
  END IF;
END $$;
