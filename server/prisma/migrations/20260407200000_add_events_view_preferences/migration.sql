-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN "eventsDefaultView" TEXT NOT NULL DEFAULT 'calendar';
ALTER TABLE "UserProfile" ADD COLUMN "eventsAccordionMode" TEXT NOT NULL DEFAULT 'current_only';
