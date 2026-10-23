-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('RFQ_POSTED', 'SELLER_APPLIED', 'SELLER_VERIFIED', 'RFQ_UNLOCKED', 'QUOTE_SENT', 'SELLER_SELECTED', 'PREVIEW_VIEWED', 'OFFER_NUDGE');

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "nudgedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Rfq" ADD COLUMN     "leadSource" TEXT NOT NULL DEFAULT 'marketplace',
ADD COLUMN     "simulated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "SellerProfile" ADD COLUMN     "completedOrders" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "onTimeDeliveryPct" INTEGER,
ADD COLUMN     "satisfactionPct" INTEGER,
ADD COLUMN     "simulated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" UUID NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "title" TEXT NOT NULL,
    "detail" TEXT,
    "rfqId" UUID,
    "sellerId" UUID,
    "patchType" TEXT,
    "quantity" INTEGER,
    "valueMinor" INTEGER,
    "region" TEXT,
    "public" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "simulated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_isDemo_public_createdAt_idx" ON "ActivityEvent"("isDemo", "public", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_rfqId_idx" ON "ActivityEvent"("rfqId");

-- CreateIndex
CREATE INDEX "Rfq_simulated_createdAt_idx" ON "Rfq"("simulated", "createdAt");
