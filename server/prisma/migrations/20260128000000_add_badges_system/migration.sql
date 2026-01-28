-- CreateEnum para categorías de badges
CREATE TYPE "BadgeCategory" AS ENUM (
  'EUROGAMES',
  'TEMATICOS',
  'WARGAMES',
  'ROL',
  'MINIATURAS',
  'WARHAMMER',
  'FILLERS_PARTY'
);

-- CreateTable Badge Definitions (definiciones estáticas de badges)
CREATE TABLE "BadgeDefinition" (
    "id" TEXT NOT NULL,
    "category" "BadgeCategory" NOT NULL,
    "level" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "requiredCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BadgeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable User Badges (badges desbloqueados por usuarios)
CREATE TABLE "UserBadge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeDefinitionId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable Game Play History (historial de juegos jugados)
CREATE TABLE "GamePlayHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "gameName" TEXT NOT NULL,
    "gameCategory" "BadgeCategory",
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GamePlayHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BadgeDefinition_category_idx" ON "BadgeDefinition"("category");
CREATE INDEX "BadgeDefinition_level_idx" ON "BadgeDefinition"("level");
CREATE UNIQUE INDEX "BadgeDefinition_category_level_key" ON "BadgeDefinition"("category", "level");

-- CreateIndex
CREATE INDEX "UserBadge_userId_idx" ON "UserBadge"("userId");
CREATE INDEX "UserBadge_badgeDefinitionId_idx" ON "UserBadge"("badgeDefinitionId");
CREATE UNIQUE INDEX "UserBadge_userId_badgeDefinitionId_key" ON "UserBadge"("userId", "badgeDefinitionId");

-- CreateIndex
CREATE INDEX "GamePlayHistory_userId_idx" ON "GamePlayHistory"("userId");
CREATE INDEX "GamePlayHistory_eventId_idx" ON "GamePlayHistory"("eventId");
CREATE INDEX "GamePlayHistory_gameCategory_idx" ON "GamePlayHistory"("gameCategory");
CREATE INDEX "GamePlayHistory_playedAt_idx" ON "GamePlayHistory"("playedAt");

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserBadge" ADD CONSTRAINT "UserBadge_badgeDefinitionId_fkey" FOREIGN KEY ("badgeDefinitionId") REFERENCES "BadgeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayHistory" ADD CONSTRAINT "GamePlayHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePlayHistory" ADD CONSTRAINT "GamePlayHistory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
