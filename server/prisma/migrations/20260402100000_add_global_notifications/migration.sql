-- CreateTable
CREATE TABLE "GlobalNotification" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalNotificationRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "globalNotificationId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GlobalNotificationRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GlobalNotification_createdAt_idx" ON "GlobalNotification"("createdAt");

-- CreateIndex
CREATE INDEX "GlobalNotification_type_idx" ON "GlobalNotification"("type");

-- CreateIndex
CREATE UNIQUE INDEX "GlobalNotificationRead_userId_globalNotificationId_key" ON "GlobalNotificationRead"("userId", "globalNotificationId");

-- CreateIndex
CREATE INDEX "GlobalNotificationRead_userId_idx" ON "GlobalNotificationRead"("userId");

-- CreateIndex
CREATE INDEX "GlobalNotificationRead_globalNotificationId_idx" ON "GlobalNotificationRead"("globalNotificationId");

-- CreateIndex
CREATE INDEX "GlobalNotificationRead_userId_dismissed_idx" ON "GlobalNotificationRead"("userId", "dismissed");

-- AddForeignKey
ALTER TABLE "GlobalNotificationRead" ADD CONSTRAINT "GlobalNotificationRead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GlobalNotificationRead" ADD CONSTRAINT "GlobalNotificationRead_globalNotificationId_fkey" FOREIGN KEY ("globalNotificationId") REFERENCES "GlobalNotification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
