-- En PostgreSQL, ADD VALUE no puede usarse en la misma transacción donde se referencia
-- el nuevo valor del enum (error 55P04).
-- Esta migración solo añade los valores; el ALTER COLUMN default está en la migración siguiente.
ALTER TYPE "BggSyncJobStatus" ADD VALUE IF NOT EXISTS 'QUEUED';
ALTER TYPE "BggSyncJobStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
