-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'SUPER_ADMIN', 'ADMIN', 'DESIGNER', 'SUPPORT', 'FULFILLMENT');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('SHIPPING', 'BILLING');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "Shape" AS ENUM ('CIRCLE', 'SQUARE', 'RECTANGLE', 'SHIELD', 'OVAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ModifierType" AS ENUM ('FIXED', 'PER_UNIT', 'PERCENT');

-- CreateEnum
CREATE TYPE "ArtworkStatus" AS ENUM ('UPLOADED', 'NEEDS_DESIGN_HELP', 'SEND_LATER');

-- CreateEnum
CREATE TYPE "FileStatus" AS ENUM ('PENDING_UPLOAD', 'UPLOADED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CartStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('OPEN', 'SENT', 'ACCEPTED', 'EXPIRED', 'CONVERTED');

-- CreateEnum
CREATE TYPE "MockupStatus" AS ENUM ('NEW', 'IN_DESIGN', 'PROOF_SENT', 'CONVERTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('DRAFT', 'QUOTE_REQUESTED', 'MOCKUP_PENDING', 'PROOF_READY', 'REVISION_REQUESTED', 'PROOF_APPROVED', 'PAYMENT_PENDING', 'PAID', 'IN_PRODUCTION', 'QUALITY_CHECK', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FAILED');

-- CreateEnum
CREATE TYPE "OrderSource" AS ENUM ('CHECKOUT', 'FREE_MOCKUP', 'QUOTE', 'ADMIN');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('STRIPE', 'MOCK');

-- CreateEnum
CREATE TYPE "ProofStatus" AS ENUM ('DRAFT', 'SENT', 'REVISION_REQUESTED', 'APPROVED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('LABEL_CREATED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('FREE_MOCKUP', 'QUOTE', 'CONFIGURATOR', 'CHECKOUT', 'SUPPORT', 'NEWSLETTER');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "crmContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "type" "AddressType" NOT NULL DEFAULT 'SHIPPING',
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "company" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'US',
    "phone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "h1" TEXT NOT NULL,
    "tagline" TEXT,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bestFor" TEXT[],
    "canReproduce" TEXT[],
    "highlights" TEXT[],
    "heroImageUrl" TEXT,
    "heroImageAlt" TEXT,
    "videoUrl" TEXT,
    "videoPosterUrl" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "patchTypeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMedia" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "url" TEXT NOT NULL,
    "posterUrl" TEXT,
    "alt" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatchType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "bestUse" TEXT NOT NULL,
    "imageUrl" TEXT,
    "minSizeIn" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "maxSizeIn" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "minQuantity" INTEGER NOT NULL DEFAULT 10,
    "productionDays" INTEGER NOT NULL DEFAULT 10,
    "rushProductionDays" INTEGER NOT NULL DEFAULT 6,
    "allowedShapes" "Shape"[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatchType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SizeTier" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "maxSizeIn" DOUBLE PRECISION NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SizeTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuantityTier" (
    "id" TEXT NOT NULL,
    "minQuantity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuantityTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceMatrix" (
    "id" TEXT NOT NULL,
    "patchTypeId" TEXT NOT NULL,
    "sizeTierId" TEXT NOT NULL,
    "quantityTierId" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackingOption" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "modifierType" "ModifierType" NOT NULL DEFAULT 'PER_UNIT',
    "modifierValue" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackingOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BorderOption" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "modifierType" "ModifierType" NOT NULL DEFAULT 'PER_UNIT',
    "modifierValue" INTEGER NOT NULL DEFAULT 0,
    "allowedShapes" "Shape"[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BorderOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtraOption" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "modifierType" "ModifierType" NOT NULL DEFAULT 'PER_UNIT',
    "modifierValue" INTEGER NOT NULL DEFAULT 0,
    "isRush" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExtraOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatchTypeBacking" (
    "patchTypeId" TEXT NOT NULL,
    "backingOptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatchTypeBacking_pkey" PRIMARY KEY ("patchTypeId","backingOptionId")
);

-- CreateTable
CREATE TABLE "PatchTypeBorder" (
    "patchTypeId" TEXT NOT NULL,
    "borderOptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatchTypeBorder_pkey" PRIMARY KEY ("patchTypeId","borderOptionId")
);

-- CreateTable
CREATE TABLE "PatchTypeExtra" (
    "patchTypeId" TEXT NOT NULL,
    "extraOptionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatchTypeExtra_pkey" PRIMARY KEY ("patchTypeId","extraOptionId")
);

-- CreateTable
CREATE TABLE "PatchConfiguration" (
    "id" TEXT NOT NULL,
    "patchTypeId" TEXT NOT NULL,
    "widthIn" DOUBLE PRECISION NOT NULL,
    "heightIn" DOUBLE PRECISION NOT NULL,
    "quotedSizeIn" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "shape" "Shape" NOT NULL,
    "backingOptionId" TEXT,
    "borderOptionId" TEXT,
    "artworkStatus" "ArtworkStatus" NOT NULL DEFAULT 'SEND_LATER',
    "artworkFileId" TEXT,
    "notes" TEXT,
    "name" TEXT,
    "customerId" TEXT,
    "isSaved" BOOLEAN NOT NULL DEFAULT false,
    "unitPriceCents" INTEGER,
    "subtotalCents" INTEGER,
    "estimatedDeliveryDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatchConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigurationExtra" (
    "configurationId" TEXT NOT NULL,
    "extraOptionId" TEXT NOT NULL,

    CONSTRAINT "ConfigurationExtra_pkey" PRIMARY KEY ("configurationId","extraOptionId")
);

-- CreateTable
CREATE TABLE "ArtworkFile" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "anonOwnerId" TEXT,
    "storageKey" TEXT NOT NULL,
    "previewKey" TEXT,
    "originalFilename" TEXT NOT NULL,
    "sanitizedFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "status" "FileStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArtworkFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "customerId" TEXT,
    "email" TEXT,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "couponCode" TEXT,
    "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
    "abandonedEmailSent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "savedForLater" BOOLEAN NOT NULL DEFAULT false,
    "unitPriceSnapshotCents" INTEGER NOT NULL,
    "totalSnapshotCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "company" TEXT,
    "phone" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockupRequest" (
    "id" TEXT NOT NULL,
    "requestNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "artworkFileId" TEXT,
    "patchTypeId" TEXT,
    "approxSize" TEXT,
    "quantity" INTEGER,
    "deadline" TIMESTAMP(3),
    "notes" TEXT,
    "status" "MockupStatus" NOT NULL DEFAULT 'NEW',
    "orderId" TEXT,
    "utm" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockupRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "customerId" TEXT,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'DRAFT',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "source" "OrderSource" NOT NULL DEFAULT 'CHECKOUT',
    "shippingAddress" JSONB,
    "billingAddress" JSONB,
    "shippingMethod" TEXT,
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "couponCode" TEXT,
    "estimatedShipDate" TIMESTAMP(3),
    "customerNotes" TEXT,
    "internalNotes" TEXT,
    "utm" JSONB,
    "crmOpportunityId" TEXT,
    "placedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "configurationId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "specSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerRef" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "idempotencyKey" TEXT NOT NULL,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhook" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proof" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileKey" TEXT NOT NULL,
    "fileMimeType" TEXT NOT NULL,
    "previewKey" TEXT,
    "specSnapshot" JSONB NOT NULL,
    "designerNotes" TEXT,
    "status" "ProofStatus" NOT NULL DEFAULT 'DRAFT',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "uploadedById" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proof_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofRevision" (
    "id" TEXT NOT NULL,
    "proofId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "artworkFileId" TEXT,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProofRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProofApproval" (
    "id" TEXT NOT NULL,
    "proofId" TEXT NOT NULL,
    "customerId" TEXT,
    "approvedByEmail" TEXT NOT NULL,
    "confirmationText" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProofApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "service" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'LABEL_CREATED',
    "shippedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "company" TEXT,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "photoUrl" TEXT,
    "videoUrl" TEXT,
    "patchTypeId" TEXT,
    "orderId" TEXT,
    "customerId" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 800,
    "height" INTEGER NOT NULL DEFAULT 800,
    "patchTypeId" TEXT,
    "industry" TEXT,
    "shape" "Shape",
    "sizeLabel" TEXT,
    "backingLabel" TEXT,
    "isPlaceholder" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FAQ" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "productId" TEXT,
    "showOnHome" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FAQ_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "authorName" TEXT NOT NULL DEFAULT 'Patch Gorilla Team',
    "categoryId" TEXT,
    "readingMinutes" INTEGER NOT NULL DEFAULT 5,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" INTEGER NOT NULL,
    "minSubtotalCents" INTEGER NOT NULL DEFAULT 0,
    "maxRedemptions" INTEGER,
    "redemptions" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "source" "LeadSource" NOT NULL,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "utm" JSONB,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CRMEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "leadId" TEXT,
    "orderId" TEXT,
    "payload" JSONB NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CRMEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "statusCode" INTEGER,
    "durationMs" INTEGER,
    "request" JSONB,
    "response" JSONB,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailEvent" (
    "id" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "orderId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "diff" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- CreateIndex
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE INDEX "Address_customerId_idx" ON "Address"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_patchTypeId_key" ON "Product"("patchTypeId");

-- CreateIndex
CREATE INDEX "Product_active_sortOrder_idx" ON "Product"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "ProductMedia_productId_sortOrder_idx" ON "ProductMedia"("productId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "PatchType_code_key" ON "PatchType"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PatchType_slug_key" ON "PatchType"("slug");

-- CreateIndex
CREATE INDEX "PatchType_active_sortOrder_idx" ON "PatchType"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "SizeTier_maxSizeIn_key" ON "SizeTier"("maxSizeIn");

-- CreateIndex
CREATE UNIQUE INDEX "QuantityTier_minQuantity_key" ON "QuantityTier"("minQuantity");

-- CreateIndex
CREATE INDEX "PriceMatrix_patchTypeId_idx" ON "PriceMatrix"("patchTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceMatrix_patchTypeId_sizeTierId_quantityTierId_key" ON "PriceMatrix"("patchTypeId", "sizeTierId", "quantityTierId");

-- CreateIndex
CREATE UNIQUE INDEX "BackingOption_code_key" ON "BackingOption"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BorderOption_code_key" ON "BorderOption"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ExtraOption_code_key" ON "ExtraOption"("code");

-- CreateIndex
CREATE INDEX "PatchConfiguration_customerId_isSaved_idx" ON "PatchConfiguration"("customerId", "isSaved");

-- CreateIndex
CREATE UNIQUE INDEX "ArtworkFile_storageKey_key" ON "ArtworkFile"("storageKey");

-- CreateIndex
CREATE INDEX "ArtworkFile_customerId_idx" ON "ArtworkFile"("customerId");

-- CreateIndex
CREATE INDEX "ArtworkFile_anonOwnerId_idx" ON "ArtworkFile"("anonOwnerId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_tokenHash_key" ON "Cart"("tokenHash");

-- CreateIndex
CREATE INDEX "Cart_status_updatedAt_idx" ON "Cart"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "Cart_email_idx" ON "Cart"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_configurationId_key" ON "CartItem"("configurationId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_quoteNumber_key" ON "Quote"("quoteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_orderId_key" ON "Quote"("orderId");

-- CreateIndex
CREATE INDEX "Quote_email_idx" ON "Quote"("email");

-- CreateIndex
CREATE INDEX "Quote_status_idx" ON "Quote"("status");

-- CreateIndex
CREATE INDEX "Quote_createdAt_idx" ON "Quote"("createdAt");

-- CreateIndex
CREATE INDEX "QuoteItem_quoteId_idx" ON "QuoteItem"("quoteId");

-- CreateIndex
CREATE UNIQUE INDEX "MockupRequest_requestNumber_key" ON "MockupRequest"("requestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MockupRequest_orderId_key" ON "MockupRequest"("orderId");

-- CreateIndex
CREATE INDEX "MockupRequest_email_idx" ON "MockupRequest"("email");

-- CreateIndex
CREATE INDEX "MockupRequest_status_idx" ON "MockupRequest"("status");

-- CreateIndex
CREATE INDEX "MockupRequest_createdAt_idx" ON "MockupRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE INDEX "Order_email_idx" ON "Order"("email");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx" ON "OrderStatusEvent"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerRef_key" ON "Payment"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedWebhook_provider_eventId_key" ON "ProcessedWebhook"("provider", "eventId");

-- CreateIndex
CREATE INDEX "Proof_status_idx" ON "Proof"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Proof_orderItemId_version_key" ON "Proof"("orderItemId", "version");

-- CreateIndex
CREATE INDEX "ProofRevision_proofId_idx" ON "ProofRevision"("proofId");

-- CreateIndex
CREATE UNIQUE INDEX "ProofApproval_proofId_key" ON "ProofApproval"("proofId");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX "Shipment_trackingNumber_idx" ON "Shipment"("trackingNumber");

-- CreateIndex
CREATE INDEX "Review_published_createdAt_idx" ON "Review"("published", "createdAt");

-- CreateIndex
CREATE INDEX "GalleryItem_published_sortOrder_idx" ON "GalleryItem"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "GalleryItem_industry_idx" ON "GalleryItem"("industry");

-- CreateIndex
CREATE INDEX "FAQ_published_sortOrder_idx" ON "FAQ"("published", "sortOrder");

-- CreateIndex
CREATE INDEX "FAQ_productId_idx" ON "FAQ"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ArticleCategory_slug_key" ON "ArticleCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_published_publishedAt_idx" ON "Article"("published", "publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_source_createdAt_idx" ON "Lead"("source", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CRMEvent_idempotencyKey_key" ON "CRMEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "CRMEvent_status_nextAttemptAt_idx" ON "CRMEvent"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "CRMEvent_email_idx" ON "CRMEvent"("email");

-- CreateIndex
CREATE INDEX "IntegrationLog_provider_createdAt_idx" ON "IntegrationLog"("provider", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailEvent_idempotencyKey_key" ON "EmailEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EmailEvent_to_idx" ON "EmailEvent"("to");

-- CreateIndex
CREATE INDEX "EmailEvent_orderId_idx" ON "EmailEvent"("orderId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_patchTypeId_fkey" FOREIGN KEY ("patchTypeId") REFERENCES "PatchType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMedia" ADD CONSTRAINT "ProductMedia_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceMatrix" ADD CONSTRAINT "PriceMatrix_patchTypeId_fkey" FOREIGN KEY ("patchTypeId") REFERENCES "PatchType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceMatrix" ADD CONSTRAINT "PriceMatrix_sizeTierId_fkey" FOREIGN KEY ("sizeTierId") REFERENCES "SizeTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceMatrix" ADD CONSTRAINT "PriceMatrix_quantityTierId_fkey" FOREIGN KEY ("quantityTierId") REFERENCES "QuantityTier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatchTypeBacking" ADD CONSTRAINT "PatchTypeBacking_patchTypeId_fkey" FOREIGN KEY ("patchTypeId") REFERENCES "PatchType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatchTypeBacking" ADD CONSTRAINT "PatchTypeBacking_backingOptionId_fkey" FOREIGN KEY ("backingOptionId") REFERENCES "BackingOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatchTypeBorder" ADD CONSTRAINT "PatchTypeBorder_patchTypeId_fkey" FOREIGN KEY ("patchTypeId") REFERENCES "PatchType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatchTypeBorder" ADD CONSTRAINT "PatchTypeBorder_borderOptionId_fkey" FOREIGN KEY ("borderOptionId") REFERENCES "BorderOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatchTypeExtra" ADD CONSTRAINT "PatchTypeExtra_patchTypeId_fkey" FOREIGN KEY ("patchTypeId") REFERENCES "PatchType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatchTypeExtra" ADD CONSTRAINT "PatchTypeExtra_extraOptionId_fkey" FOREIGN KEY ("extraOptionId") REFERENCES "ExtraOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatchConfiguration" ADD CONSTRAINT "PatchConfiguration_patchTypeId_fkey" FOREIGN KEY ("patchTypeId") REFERENCES "PatchType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatchConfiguration" ADD CONSTRAINT "PatchConfiguration_backingOptionId_fkey" FOREIGN KEY ("backingOptionId") REFERENCES "BackingOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatchConfiguration" ADD CONSTRAINT "PatchConfiguration_borderOptionId_fkey" FOREIGN KEY ("borderOptionId") REFERENCES "BorderOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatchConfiguration" ADD CONSTRAINT "PatchConfiguration_artworkFileId_fkey" FOREIGN KEY ("artworkFileId") REFERENCES "ArtworkFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatchConfiguration" ADD CONSTRAINT "PatchConfiguration_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationExtra" ADD CONSTRAINT "ConfigurationExtra_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "PatchConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfigurationExtra" ADD CONSTRAINT "ConfigurationExtra_extraOptionId_fkey" FOREIGN KEY ("extraOptionId") REFERENCES "ExtraOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArtworkFile" ADD CONSTRAINT "ArtworkFile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "PatchConfiguration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteItem" ADD CONSTRAINT "QuoteItem_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "PatchConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockupRequest" ADD CONSTRAINT "MockupRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockupRequest" ADD CONSTRAINT "MockupRequest_artworkFileId_fkey" FOREIGN KEY ("artworkFileId") REFERENCES "ArtworkFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockupRequest" ADD CONSTRAINT "MockupRequest_patchTypeId_fkey" FOREIGN KEY ("patchTypeId") REFERENCES "PatchType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockupRequest" ADD CONSTRAINT "MockupRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "PatchConfiguration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusEvent" ADD CONSTRAINT "OrderStatusEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proof" ADD CONSTRAINT "Proof_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proof" ADD CONSTRAINT "Proof_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofRevision" ADD CONSTRAINT "ProofRevision_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "Proof"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofRevision" ADD CONSTRAINT "ProofRevision_artworkFileId_fkey" FOREIGN KEY ("artworkFileId") REFERENCES "ArtworkFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofRevision" ADD CONSTRAINT "ProofRevision_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofApproval" ADD CONSTRAINT "ProofApproval_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "Proof"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProofApproval" ADD CONSTRAINT "ProofApproval_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_patchTypeId_fkey" FOREIGN KEY ("patchTypeId") REFERENCES "PatchType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_patchTypeId_fkey" FOREIGN KEY ("patchTypeId") REFERENCES "PatchType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FAQ" ADD CONSTRAINT "FAQ_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ArticleCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CRMEvent" ADD CONSTRAINT "CRMEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
