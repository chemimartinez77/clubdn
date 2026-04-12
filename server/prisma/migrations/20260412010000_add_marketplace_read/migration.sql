-- CreateTable
CREATE TABLE "MarketplaceConversationRead" (
    "id"             TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId"         TEXT NOT NULL,
    "lastReadAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceConversationRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceConversationRead_conversationId_userId_key"
    ON "MarketplaceConversationRead"("conversationId", "userId");

CREATE INDEX "MarketplaceConversationRead_conversationId_idx"
    ON "MarketplaceConversationRead"("conversationId");

CREATE INDEX "MarketplaceConversationRead_userId_idx"
    ON "MarketplaceConversationRead"("userId");

-- AddForeignKey
ALTER TABLE "MarketplaceConversationRead"
    ADD CONSTRAINT "MarketplaceConversationRead_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "MarketplaceConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MarketplaceConversationRead"
    ADD CONSTRAINT "MarketplaceConversationRead_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
