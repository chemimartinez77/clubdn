-- Enums missing from migrations
CREATE TYPE "ReportType" AS ENUM ('BUG', 'MEJORA');
CREATE TYPE "ReportStatus" AS ENUM ('NUEVO', 'EN_REVISION', 'EN_PROGRESO', 'HECHO');
CREATE TYPE "ReportPriority" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');
CREATE TYPE "ReportSeverity" AS ENUM ('NO_URGE', 'ME_MOLESTA', 'BLOQUEANTE');
CREATE TYPE "ReportPlatform" AS ENUM ('MOVIL', 'PC');
CREATE TYPE "AzulGameStatus" AS ENUM ('WAITING', 'ACTIVE', 'FINISHED');
CREATE TYPE "ViernesGameStatus" AS ENUM ('ACTIVE', 'FINISHED');

-- CreateTable Announcement
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Announcement_createdAt_idx" ON "Announcement"("createdAt");
CREATE INDEX "Announcement_pinned_idx" ON "Announcement"("pinned");

ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable AnnouncementLike
CREATE TABLE "AnnouncementLike" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnnouncementLike_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AnnouncementLike_announcementId_userId_key" ON "AnnouncementLike"("announcementId", "userId");
CREATE INDEX "AnnouncementLike_announcementId_idx" ON "AnnouncementLike"("announcementId");

ALTER TABLE "AnnouncementLike" ADD CONSTRAINT "AnnouncementLike_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnnouncementLike" ADD CONSTRAINT "AnnouncementLike_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable EventShareLink
CREATE TABLE "EventShareLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventShareLink_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EventShareLink_token_key" ON "EventShareLink"("token");
CREATE UNIQUE INDEX "EventShareLink_eventId_memberId_key" ON "EventShareLink"("eventId", "memberId");
CREATE INDEX "EventShareLink_token_idx" ON "EventShareLink"("token");

ALTER TABLE "EventShareLink" ADD CONSTRAINT "EventShareLink_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventShareLink" ADD CONSTRAINT "EventShareLink_memberId_fkey"
    FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable Report
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "screenshotUrl" TEXT,
    "originUrl" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'NUEVO',
    "internalPriority" "ReportPriority" NOT NULL DEFAULT 'MEDIA',
    "perceivedSeverity" "ReportSeverity" NOT NULL,
    "platform" "ReportPlatform" NOT NULL DEFAULT 'MOVIL',
    "mobileOs" TEXT,
    "devResponse" TEXT,
    "votesCount" INTEGER NOT NULL DEFAULT 0,
    "assignedToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Report_userId_idx" ON "Report"("userId");
CREATE INDEX "Report_status_idx" ON "Report"("status");
CREATE INDEX "Report_internalPriority_idx" ON "Report"("internalPriority");
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");
CREATE INDEX "Report_assignedToId_idx" ON "Report"("assignedToId");

ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable ReportVote
CREATE TABLE "ReportVote" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReportVote_reportId_userId_key" ON "ReportVote"("reportId", "userId");
CREATE INDEX "ReportVote_reportId_idx" ON "ReportVote"("reportId");
CREATE INDEX "ReportVote_userId_idx" ON "ReportVote"("userId");

ALTER TABLE "ReportVote" ADD CONSTRAINT "ReportVote_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportVote" ADD CONSTRAINT "ReportVote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable ReportComment
CREATE TABLE "ReportComment" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "ReportComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportComment_reportId_idx" ON "ReportComment"("reportId");
CREATE INDEX "ReportComment_userId_idx" ON "ReportComment"("userId");
CREATE INDEX "ReportComment_createdAt_idx" ON "ReportComment"("createdAt");

ALTER TABLE "ReportComment" ADD CONSTRAINT "ReportComment_reportId_fkey"
    FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReportComment" ADD CONSTRAINT "ReportComment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable ReportCommentHistory
CREATE TABLE "ReportCommentHistory" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportCommentHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportCommentHistory_commentId_idx" ON "ReportCommentHistory"("commentId");

ALTER TABLE "ReportCommentHistory" ADD CONSTRAINT "ReportCommentHistory_commentId_fkey"
    FOREIGN KEY ("commentId") REFERENCES "ReportComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable GameValidation
CREATE TABLE "GameValidation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "scannerId" TEXT NOT NULL,
    "scannedId" TEXT NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameValidation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GameValidation_eventId_scannerId_scannedId_key" ON "GameValidation"("eventId", "scannerId", "scannedId");
CREATE INDEX "GameValidation_eventId_idx" ON "GameValidation"("eventId");
CREATE INDEX "GameValidation_scannerId_idx" ON "GameValidation"("scannerId");
CREATE INDEX "GameValidation_scannedId_idx" ON "GameValidation"("scannedId");

ALTER TABLE "GameValidation" ADD CONSTRAINT "GameValidation_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameValidation" ADD CONSTRAINT "GameValidation_scannerId_fkey"
    FOREIGN KEY ("scannerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GameValidation" ADD CONSTRAINT "GameValidation_scannedId_fkey"
    FOREIGN KEY ("scannedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable AzulGame
CREATE TABLE "AzulGame" (
    "id" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT,
    "gameState" JSONB NOT NULL,
    "currentTurn" TEXT,
    "status" "AzulGameStatus" NOT NULL DEFAULT 'WAITING',
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AzulGame_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AzulGame_player1Id_idx" ON "AzulGame"("player1Id");
CREATE INDEX "AzulGame_player2Id_idx" ON "AzulGame"("player2Id");
CREATE INDEX "AzulGame_status_idx" ON "AzulGame"("status");
CREATE INDEX "AzulGame_createdAt_idx" ON "AzulGame"("createdAt");

ALTER TABLE "AzulGame" ADD CONSTRAINT "AzulGame_player1Id_fkey"
    FOREIGN KEY ("player1Id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AzulGame" ADD CONSTRAINT "AzulGame_player2Id_fkey"
    FOREIGN KEY ("player2Id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable ViernesGame
CREATE TABLE "ViernesGame" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameState" JSONB NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "status" "ViernesGameStatus" NOT NULL DEFAULT 'ACTIVE',
    "won" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ViernesGame_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ViernesGame_playerId_idx" ON "ViernesGame"("playerId");
CREATE INDEX "ViernesGame_status_idx" ON "ViernesGame"("status");
CREATE INDEX "ViernesGame_createdAt_idx" ON "ViernesGame"("createdAt");

ALTER TABLE "ViernesGame" ADD CONSTRAINT "ViernesGame_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
