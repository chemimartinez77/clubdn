-- CreateTable
CREATE TABLE "EventPhoto" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "cloudinaryId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "uploadedById" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventPhoto_eventId_idx" ON "EventPhoto"("eventId");

-- CreateIndex
CREATE INDEX "EventPhoto_uploadedById_idx" ON "EventPhoto"("uploadedById");

-- AddForeignKey
ALTER TABLE "EventPhoto" ADD CONSTRAINT "EventPhoto_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventPhoto" ADD CONSTRAINT "EventPhoto_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
