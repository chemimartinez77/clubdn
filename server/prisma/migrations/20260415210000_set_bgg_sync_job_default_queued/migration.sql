-- Segunda parte: ahora que QUEUED está committed en el enum, se puede usar como default.
ALTER TABLE "BggSyncJob" ALTER COLUMN "status" SET DEFAULT 'QUEUED';
