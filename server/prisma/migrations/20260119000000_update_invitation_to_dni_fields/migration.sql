-- Migration to update Invitation structure: tokenHash -> token, guestName -> firstName/lastName/DNI
-- And add EventGuest table

-- Step 1: Add new columns with defaults (to handle existing data)
ALTER TABLE "Invitation" ADD COLUMN "token" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "guestFirstName" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "guestLastName" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "guestDni" TEXT;
ALTER TABLE "Invitation" ADD COLUMN "guestDniNormalized" TEXT;

-- Step 2: Migrate existing data
-- Copy tokenHash to token (both are unique identifiers)
UPDATE "Invitation" SET "token" = "tokenHash" WHERE "token" IS NULL;
-- Split guestName into firstName and lastName (use full name as lastName if no space)
UPDATE "Invitation" SET
    "guestFirstName" = CASE
        WHEN position(' ' in "guestName") > 0 THEN split_part("guestName", ' ', 1)
        ELSE "guestName"
    END,
    "guestLastName" = CASE
        WHEN position(' ' in "guestName") > 0 THEN substring("guestName" from position(' ' in "guestName") + 1)
        ELSE 'N/A'
    END,
    "guestDni" = 'MIGRATED-' || id,
    "guestDniNormalized" = 'MIGRATED' || UPPER(id)
WHERE "guestFirstName" IS NULL;

-- Step 3: Make new columns required
ALTER TABLE "Invitation" ALTER COLUMN "token" SET NOT NULL;
ALTER TABLE "Invitation" ALTER COLUMN "guestFirstName" SET NOT NULL;
ALTER TABLE "Invitation" ALTER COLUMN "guestLastName" SET NOT NULL;
ALTER TABLE "Invitation" ALTER COLUMN "guestDni" SET NOT NULL;
ALTER TABLE "Invitation" ALTER COLUMN "guestDniNormalized" SET NOT NULL;

-- Step 4: Add unique constraint on token
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- Step 5: Add index on guestDniNormalized
CREATE INDEX "Invitation_guestDniNormalized_idx" ON "Invitation"("guestDniNormalized");

-- Step 6: Drop old columns and indexes
DROP INDEX IF EXISTS "Invitation_guestNameNormalized_idx";
DROP INDEX IF EXISTS "Invitation_tokenHash_key";
ALTER TABLE "Invitation" DROP COLUMN "guestName";
ALTER TABLE "Invitation" DROP COLUMN "guestNameNormalized";
ALTER TABLE "Invitation" DROP COLUMN "tokenHash";

-- Step 7: Create EventGuest table
CREATE TABLE "EventGuest" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "invitationId" TEXT NOT NULL,
    "guestFirstName" TEXT NOT NULL,
    "guestLastName" TEXT NOT NULL,
    "guestDni" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventGuest_pkey" PRIMARY KEY ("id")
);

-- Step 8: Create indexes for EventGuest
CREATE UNIQUE INDEX "EventGuest_invitationId_key" ON "EventGuest"("invitationId");
CREATE INDEX "EventGuest_eventId_idx" ON "EventGuest"("eventId");
CREATE INDEX "EventGuest_guestDni_idx" ON "EventGuest"("guestDni");

-- Step 9: Add foreign keys for EventGuest
ALTER TABLE "EventGuest" ADD CONSTRAINT "EventGuest_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventGuest" ADD CONSTRAINT "EventGuest_invitationId_fkey" FOREIGN KEY ("invitationId") REFERENCES "Invitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Create EventGuest records for existing invitations that were USED
INSERT INTO "EventGuest" ("id", "eventId", "invitationId", "guestFirstName", "guestLastName", "guestDni", "createdAt")
SELECT
    'eg_' || "id",
    "eventId",
    "id",
    "guestFirstName",
    "guestLastName",
    "guestDni",
    "createdAt"
FROM "Invitation"
WHERE "status" = 'USED';
