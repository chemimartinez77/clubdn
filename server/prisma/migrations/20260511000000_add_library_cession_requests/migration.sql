-- CreateEnum
CREATE TYPE "LibraryContributionType" AS ENUM ('DONATION', 'CESSION');

-- AlterTable
ALTER TABLE "LibraryDonationRequest"
ADD COLUMN "contributionType" "LibraryContributionType" NOT NULL DEFAULT 'DONATION',
ADD COLUMN "requestedLoanPolicy" "LibraryLoanPolicy";
