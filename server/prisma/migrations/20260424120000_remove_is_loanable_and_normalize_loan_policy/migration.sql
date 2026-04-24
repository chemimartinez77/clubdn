UPDATE "LibraryItem"
SET "loanPolicy" = CASE
  WHEN "ownerEmail" IS NULL THEN 'LOANABLE'::"LibraryLoanPolicy"
  WHEN "ownerEmail" = 'clubdreadnought.vlc@gmail.com' THEN 'LOANABLE'::"LibraryLoanPolicy"
  ELSE 'NOT_LOANABLE'::"LibraryLoanPolicy"
END
WHERE "loanPolicy" IS NULL
   OR "loanPolicy" = 'NOT_LOANABLE'::"LibraryLoanPolicy"
   OR "loanPolicy" = 'LOANABLE'::"LibraryLoanPolicy";

ALTER TABLE "LibraryItem"
DROP COLUMN "isLoanable";
