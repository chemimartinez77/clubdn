ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CHEMI';

UPDATE "User"
SET "role" = 'CHEMI'
WHERE LOWER("email") = 'chemimartinez@gmail.com'
  AND "role" = 'SUPER_ADMIN';
