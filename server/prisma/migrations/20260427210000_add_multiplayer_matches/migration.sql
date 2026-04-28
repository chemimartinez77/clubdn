CREATE TYPE "MultiplayerMatchStatus" AS ENUM ('LOBBY', 'ACTIVE', 'FINISHED', 'ABANDONED');
CREATE TYPE "MultiplayerMatchVisibility" AS ENUM ('PRIVATE', 'CLUB', 'INVITE_ONLY');

CREATE TABLE "MultiplayerMatch" (
  "id" TEXT NOT NULL,
  "gameKey" TEXT NOT NULL,
  "status" "MultiplayerMatchStatus" NOT NULL DEFAULT 'LOBBY',
  "visibility" "MultiplayerMatchVisibility" NOT NULL DEFAULT 'CLUB',
  "ownerUserId" TEXT NOT NULL,
  "minPlayers" INTEGER NOT NULL DEFAULT 2,
  "maxPlayers" INTEGER NOT NULL,
  "winnerUserId" TEXT,
  "engineState" JSONB,
  "result" JSONB,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MultiplayerMatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MultiplayerMatchSeat" (
  "id" TEXT NOT NULL,
  "matchId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "playerIndex" INTEGER NOT NULL,
  "isReady" BOOLEAN NOT NULL DEFAULT true,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt" TIMESTAMP(3),

  CONSTRAINT "MultiplayerMatchSeat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MultiplayerMatchSeat_matchId_userId_key" ON "MultiplayerMatchSeat"("matchId", "userId");
CREATE UNIQUE INDEX "MultiplayerMatchSeat_matchId_playerIndex_key" ON "MultiplayerMatchSeat"("matchId", "playerIndex");

CREATE INDEX "MultiplayerMatch_gameKey_status_idx" ON "MultiplayerMatch"("gameKey", "status");
CREATE INDEX "MultiplayerMatch_ownerUserId_idx" ON "MultiplayerMatch"("ownerUserId");
CREATE INDEX "MultiplayerMatch_visibility_status_idx" ON "MultiplayerMatch"("visibility", "status");
CREATE INDEX "MultiplayerMatch_createdAt_idx" ON "MultiplayerMatch"("createdAt");
CREATE INDEX "MultiplayerMatchSeat_userId_joinedAt_idx" ON "MultiplayerMatchSeat"("userId", "joinedAt");
CREATE INDEX "MultiplayerMatchSeat_matchId_leftAt_idx" ON "MultiplayerMatchSeat"("matchId", "leftAt");

ALTER TABLE "MultiplayerMatch"
  ADD CONSTRAINT "MultiplayerMatch_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MultiplayerMatchSeat"
  ADD CONSTRAINT "MultiplayerMatchSeat_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "MultiplayerMatch"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MultiplayerMatchSeat"
  ADD CONSTRAINT "MultiplayerMatchSeat_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
