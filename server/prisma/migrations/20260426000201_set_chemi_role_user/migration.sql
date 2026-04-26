UPDATE "User"
SET "role" = 'CHEMI'
WHERE LOWER("email") = 'chemimartinez@gmail.com'
  AND "role" = 'SUPER_ADMIN';
