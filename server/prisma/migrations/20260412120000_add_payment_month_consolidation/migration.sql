CREATE TABLE "PaymentMonthConsolidation" (
  "id" TEXT NOT NULL,
  "year" INTEGER NOT NULL,
  "month" INTEGER NOT NULL,
  "consolidatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consolidatedBy" TEXT NOT NULL,

  CONSTRAINT "PaymentMonthConsolidation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentMonthConsolidation_year_month_key"
ON "PaymentMonthConsolidation"("year", "month");

CREATE INDEX "PaymentMonthConsolidation_consolidatedAt_idx"
ON "PaymentMonthConsolidation"("consolidatedAt");
