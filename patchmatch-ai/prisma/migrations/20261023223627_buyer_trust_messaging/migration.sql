-- CreateEnum
CREATE TYPE "BuyingStage" AS ENUM ('READY_7_DAYS', 'WITHIN_30_DAYS', 'COMPARING', 'RESEARCHING');

-- CreateEnum
CREATE TYPE "BuyerIntent" AS ENUM ('NOT_CONFIRMED', 'READY_FOR_QUOTES', 'RESEARCHING', 'NO_LONGER_INTERESTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MessageKind" AS ENUM ('TEXT', 'QUOTE', 'PROOF', 'PROOF_APPROVED', 'PROOF_CHANGES', 'REVISION_REQUEST', 'CLARIFICATION_REQUEST', 'CONTACT_SHARED', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('SELECTED', 'PROOF_APPROVED', 'SAMPLE', 'IN_PRODUCTION', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "DisclosureMode" ADD VALUE 'BUYER_SELECTED';

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "contactSharedAt" TIMESTAMP(3),
ADD COLUMN     "reportedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "kind" "MessageKind" NOT NULL DEFAULT 'TEXT',
ADD COLUMN     "meta" JSONB;

-- AlterTable
ALTER TABLE "Quote" ADD COLUMN     "exclusions" TEXT,
ADD COLUMN     "includedBacking" TEXT,
ADD COLUMN     "inclusions" TEXT,
ADD COLUMN     "revisionNote" TEXT,
ADD COLUMN     "revisionRequestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Rfq" ADD COLUMN     "artworkHelpRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "buyingStage" "BuyingStage",
ADD COLUMN     "deliveryFlexibility" TEXT,
ADD COLUMN     "intentConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "intentStatus" "BuyerIntent" NOT NULL DEFAULT 'NOT_CONFIRMED',
ADD COLUMN     "phoneVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "remindersOptOut" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "capabilityReviewedAt" TIMESTAMP(3),
ADD COLUMN     "identityVerifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'SELECTED',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectEvent" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "status" "ProjectStatus" NOT NULL,
    "note" TEXT,
    "actorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_rfqId_key" ON "Project"("rfqId");

-- CreateIndex
CREATE INDEX "Project_sellerId_idx" ON "Project"("sellerId");

-- CreateIndex
CREATE INDEX "ProjectEvent_projectId_createdAt_idx" ON "ProjectEvent"("projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectEvent" ADD CONSTRAINT "ProjectEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
