-- Añadir nuevas categorías de badge al enum BadgeCategory
ALTER TYPE "BadgeCategory" ADD VALUE 'PRIMER_JUGADOR';
ALTER TYPE "BadgeCategory" ADD VALUE 'GIRADOR_RULETA';

-- Añadir campo spinEffect a ClubConfig
ALTER TABLE "ClubConfig" ADD COLUMN "spinEffect" TEXT NOT NULL DEFAULT 'ruleta';

-- Crear tabla FirstPlayerSpin
CREATE TABLE "FirstPlayerSpin" (
    "id"        TEXT NOT NULL,
    "eventId"   TEXT NOT NULL,
    "spinnerId" TEXT NOT NULL,
    "chosenId"  TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FirstPlayerSpin_pkey" PRIMARY KEY ("id")
);

-- Índices
CREATE INDEX "FirstPlayerSpin_eventId_idx"   ON "FirstPlayerSpin"("eventId");
CREATE INDEX "FirstPlayerSpin_spinnerId_idx" ON "FirstPlayerSpin"("spinnerId");
CREATE INDEX "FirstPlayerSpin_chosenId_idx"  ON "FirstPlayerSpin"("chosenId");

-- Foreign keys
ALTER TABLE "FirstPlayerSpin" ADD CONSTRAINT "FirstPlayerSpin_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FirstPlayerSpin" ADD CONSTRAINT "FirstPlayerSpin_spinnerId_fkey"
    FOREIGN KEY ("spinnerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FirstPlayerSpin" ADD CONSTRAINT "FirstPlayerSpin_chosenId_fkey"
    FOREIGN KEY ("chosenId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
