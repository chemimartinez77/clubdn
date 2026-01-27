-- CreateTable
CREATE TABLE IF NOT EXISTS "MembershipChangeLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "previousType" "MembershipType",
    "newType" "MembershipType" NOT NULL,
    "reason" TEXT,
    "changedBy" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipChangeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MembershipChangeLog_userId_idx" ON "MembershipChangeLog"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MembershipChangeLog_changedAt_idx" ON "MembershipChangeLog"("changedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MembershipChangeLog_changedBy_idx" ON "MembershipChangeLog"("changedBy");
