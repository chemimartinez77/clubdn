-- AddColumn showTipOfTheDay to UserProfile
ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "showTipOfTheDay" BOOLEAN NOT NULL DEFAULT true;
