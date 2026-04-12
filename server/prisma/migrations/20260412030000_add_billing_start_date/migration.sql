-- Añadir campo billingStartDate a Membership
ALTER TABLE "Membership" ADD COLUMN "billingStartDate" TIMESTAMP(3);

-- Backfill desde MembershipChangeLog (cambios manuales y del cron ya registrados)
-- Para colaboradores con registro de cambio EN_PRUEBAS -> COLABORADOR en el log:
-- billingStartDate = primer día del mes siguiente a changedAt
UPDATE "Membership" m
SET "billingStartDate" = DATE_TRUNC('month', (
  SELECT cl."changedAt" FROM "MembershipChangeLog" cl
  WHERE cl."userId" = m."userId"
    AND cl."previousType" = 'EN_PRUEBAS'
    AND cl."newType" = 'COLABORADOR'
  ORDER BY cl."changedAt" DESC
  LIMIT 1
)) + INTERVAL '1 month'
WHERE m."type" = 'COLABORADOR'
  AND m."billingStartDate" IS NULL
  AND EXISTS (
    SELECT 1 FROM "MembershipChangeLog" cl
    WHERE cl."userId" = m."userId"
      AND cl."previousType" = 'EN_PRUEBAS'
      AND cl."newType" = 'COLABORADOR'
  );

-- Backfill desde trialStartDate + 60 días (casos del cron sin registro en el log)
-- Para colaboradores sin billingStartDate pero con trialStartDate:
-- billingStartDate = primer día del mes siguiente a (trialStartDate + 60 días)
UPDATE "Membership" m
SET "billingStartDate" = DATE_TRUNC('month', m."trialStartDate" + INTERVAL '60 days') + INTERVAL '1 month'
WHERE m."type" = 'COLABORADOR'
  AND m."billingStartDate" IS NULL
  AND m."trialStartDate" IS NOT NULL;
