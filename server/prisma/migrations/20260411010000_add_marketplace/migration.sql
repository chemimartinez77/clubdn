-- CreateEnum
CREATE TYPE "MarketplaceListingStatus" AS ENUM ('PUBLICADO', 'RESERVADO', 'VENDIDO');

-- CreateEnum
CREATE TYPE "MarketplaceOfferStatus" AS ENUM ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA', 'CONTRAOFERTA');

-- CreateEnum
CREATE TYPE "MarketplaceCancellationRole" AS ENUM ('BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "MarketplaceCategory" AS ENUM ('JUEGOS_MESA', 'ROL', 'WARGAMES', 'MINIATURAS', 'ACCESORIOS', 'MATERIAL_RELACIONADO');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MARKETPLACE_NEW_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE 'MARKETPLACE_NEW_OFFER';
ALTER TYPE "NotificationType" ADD VALUE 'MARKETPLACE_OFFER_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'MARKETPLACE_OFFER_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'MARKETPLACE_OFFER_COUNTERED';
ALTER TYPE "NotificationType" ADD VALUE 'MARKETPLACE_NEW_CONVERSATION';

-- CreateTable
CREATE TABLE "MarketplaceListing" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "MarketplaceCategory" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "status" "MarketplaceListingStatus" NOT NULL DEFAULT 'PUBLICADO',
    "images" TEXT[],
    "contactExtra" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceConversation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceOffer" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "proposedById" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "MarketplaceOfferStatus" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceCancellation" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "cancelledById" TEXT NOT NULL,
    "role" "MarketplaceCancellationRole" NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceCancellation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MarketplaceListing_authorId_idx" ON "MarketplaceListing"("authorId");
CREATE INDEX "MarketplaceListing_status_idx" ON "MarketplaceListing"("status");
CREATE INDEX "MarketplaceListing_category_idx" ON "MarketplaceListing"("category");
CREATE INDEX "MarketplaceListing_isArchived_idx" ON "MarketplaceListing"("isArchived");
CREATE INDEX "MarketplaceListing_isHidden_idx" ON "MarketplaceListing"("isHidden");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceConversation_listingId_buyerId_key" ON "MarketplaceConversation"("listingId", "buyerId");
CREATE INDEX "MarketplaceConversation_listingId_idx" ON "MarketplaceConversation"("listingId");
CREATE INDEX "MarketplaceConversation_buyerId_idx" ON "MarketplaceConversation"("buyerId");

-- CreateIndex
CREATE INDEX "MarketplaceMessage_conversationId_idx" ON "MarketplaceMessage"("conversationId");
CREATE INDEX "MarketplaceMessage_senderId_idx" ON "MarketplaceMessage"("senderId");

-- CreateIndex
CREATE INDEX "MarketplaceOffer_conversationId_idx" ON "MarketplaceOffer"("conversationId");
CREATE INDEX "MarketplaceOffer_proposedById_idx" ON "MarketplaceOffer"("proposedById");

-- CreateIndex
CREATE INDEX "MarketplaceCancellation_conversationId_idx" ON "MarketplaceCancellation"("conversationId");
CREATE INDEX "MarketplaceCancellation_cancelledById_idx" ON "MarketplaceCancellation"("cancelledById");

-- AddForeignKey
ALTER TABLE "MarketplaceListing" ADD CONSTRAINT "MarketplaceListing_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceConversation" ADD CONSTRAINT "MarketplaceConversation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceConversation" ADD CONSTRAINT "MarketplaceConversation_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMessage" ADD CONSTRAINT "MarketplaceMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MarketplaceConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceMessage" ADD CONSTRAINT "MarketplaceMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOffer" ADD CONSTRAINT "MarketplaceOffer_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MarketplaceConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceOffer" ADD CONSTRAINT "MarketplaceOffer_proposedById_fkey" FOREIGN KEY ("proposedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceCancellation" ADD CONSTRAINT "MarketplaceCancellation_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MarketplaceConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceCancellation" ADD CONSTRAINT "MarketplaceCancellation_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
