-- Migration: add_loan_system
-- Adds LibraryLoan, LibraryQueue tables and loan fields to LibraryItem and ClubConfig.
-- NOTE: This migration documents the state as of 2026-04-21. The tables/columns
-- were previously applied via `prisma db push` on the live Railway DB, so running
-- `migrate deploy` on an already-migrated DB will fail with "already exists" errors.
-- On a CLEAN database this migration runs correctly and produces the expected schema.

-- CreateEnum
CREATE TYPE "LibraryItemLoanStatus" AS ENUM ('AVAILABLE', 'REQUESTED', 'ON_LOAN', 'BLOCKED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "LibraryLoanStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'RETURNED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LibraryQueueStatus" AS ENUM ('WAITING', 'NOTIFIED', 'FULFILLED', 'CANCELLED');

-- AlterTable LibraryItem: add loan fields
ALTER TABLE "LibraryItem" ADD COLUMN "loanStatus" "LibraryItemLoanStatus" NOT NULL DEFAULT 'AVAILABLE';
ALTER TABLE "LibraryItem" ADD COLUMN "isLoanable" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "LibraryItem_loanStatus_idx" ON "LibraryItem"("loanStatus");

-- AlterTable ClubConfig: add loan configuration fields
ALTER TABLE "ClubConfig" ADD COLUMN "loanEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "ClubConfig" ADD COLUMN "loanDurationDays" INTEGER NOT NULL DEFAULT 14;
ALTER TABLE "ClubConfig" ADD COLUMN "loanQueueNotifyHours" INTEGER NOT NULL DEFAULT 48;

-- CreateTable LibraryLoan
CREATE TABLE "LibraryLoan" (
    "id"               TEXT NOT NULL,
    "libraryItemId"    TEXT NOT NULL,
    "userId"           TEXT NOT NULL,
    "loanedByUserId"   TEXT,
    "returnedByUserId" TEXT,
    "status"           "LibraryLoanStatus" NOT NULL,
    "loanedAt"         TIMESTAMP(3),
    "dueAt"            TIMESTAMP(3),
    "returnedAt"       TIMESTAMP(3),
    "renewalCount"     INTEGER NOT NULL DEFAULT 0,
    "conditionOut"     "GameCondition",
    "conditionIn"      "GameCondition",
    "notesOut"         TEXT,
    "notesIn"          TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryLoan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LibraryLoan_libraryItemId_idx" ON "LibraryLoan"("libraryItemId");
CREATE INDEX "LibraryLoan_userId_idx"        ON "LibraryLoan"("userId");
CREATE INDEX "LibraryLoan_status_idx"        ON "LibraryLoan"("status");

-- CreateTable LibraryQueue
CREATE TABLE "LibraryQueue" (
    "id"            TEXT NOT NULL,
    "libraryItemId" TEXT NOT NULL,
    "userId"        TEXT NOT NULL,
    "status"        "LibraryQueueStatus" NOT NULL DEFAULT 'WAITING',
    "notifiedAt"    TIMESTAMP(3),
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryQueue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LibraryQueue_libraryItemId_userId_key" ON "LibraryQueue"("libraryItemId", "userId");
CREATE INDEX "LibraryQueue_libraryItemId_status_idx" ON "LibraryQueue"("libraryItemId", "status");

-- AddForeignKey LibraryLoan
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_libraryItemId_fkey"    FOREIGN KEY ("libraryItemId")    REFERENCES "LibraryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_userId_fkey"           FOREIGN KEY ("userId")           REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_loanedByUserId_fkey"   FOREIGN KEY ("loanedByUserId")   REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LibraryLoan" ADD CONSTRAINT "LibraryLoan_returnedByUserId_fkey" FOREIGN KEY ("returnedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey LibraryQueue
ALTER TABLE "LibraryQueue" ADD CONSTRAINT "LibraryQueue_libraryItemId_fkey" FOREIGN KEY ("libraryItemId") REFERENCES "LibraryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LibraryQueue" ADD CONSTRAINT "LibraryQueue_userId_fkey"        FOREIGN KEY ("userId")        REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
