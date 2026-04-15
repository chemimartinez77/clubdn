-- Añadir nuevos valores al enum BggSyncJobStatus
-- ADD VALUE es seguro en PostgreSQL: no toca datos existentes
ALTER TYPE "BggSyncJobStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE "BggSyncJobStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Actualizar el default del campo status en BggSyncJob
ALTER TABLE "BggSyncJob" ALTER COLUMN "status" SET DEFAULT 'QUEUED';
