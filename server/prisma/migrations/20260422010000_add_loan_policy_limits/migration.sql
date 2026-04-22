-- Add three-state loan policy while keeping the legacy boolean for compatibility.
CREATE TYPE "LibraryLoanPolicy" AS ENUM ('NOT_LOANABLE', 'CONSULT', 'LOANABLE');

ALTER TABLE "LibraryItem"
  ADD COLUMN "loanPolicy" "LibraryLoanPolicy" NOT NULL DEFAULT 'NOT_LOANABLE';

UPDATE "LibraryItem"
SET "loanPolicy" = CASE
  WHEN "isLoanable" = true THEN 'LOANABLE'::"LibraryLoanPolicy"
  ELSE 'NOT_LOANABLE'::"LibraryLoanPolicy"
END;

ALTER TABLE "ClubConfig"
  ADD COLUMN "loanMaxActivePerUser" INTEGER NOT NULL DEFAULT 0;

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'LIBRARY_LOAN_CONSULT_REQUESTED';
