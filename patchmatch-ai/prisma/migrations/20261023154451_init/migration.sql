-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('NONE', 'SUPPORT', 'REVIEWER', 'FINANCE', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "OrgMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET', 'RFQ_EMAIL_VERIFY', 'ORG_INVITE', 'PHONE_VERIFY');

-- CreateEnum
CREATE TYPE "PatchType" AS ENUM ('EMBROIDERED', 'PVC', 'CHENILLE', 'WOVEN', 'SUBLIMATED', 'LEATHER', 'PRINTED', 'NOT_SURE');

-- CreateEnum
CREATE TYPE "IntendedUse" AS ENUM ('CLOTHING_BRAND', 'STREETWEAR', 'HATS', 'UNIFORMS', 'SPORTS_TEAMS', 'CLUBS', 'EVENTS', 'PROMOTIONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "BackingType" AS ENUM ('SEW_ON', 'IRON_ON', 'HOOK_AND_LOOP', 'ADHESIVE', 'NONE', 'OTHER');

-- CreateEnum
CREATE TYPE "BorderType" AS ENUM ('MERROWED', 'HOT_CUT', 'LASER_CUT', 'NONE', 'UNSURE');

-- CreateEnum
CREATE TYPE "DimensionUnit" AS ENUM ('IN', 'CM', 'MM');

-- CreateEnum
CREATE TYPE "RfqStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFICATION_PENDING', 'UNDER_REVIEW', 'CLARIFICATION_REQUIRED', 'QUALIFIED', 'MATCHING', 'MANUAL_SOURCING', 'SELLER_NOTIFIED', 'QUOTES_RECEIVED', 'SELLER_SELECTED', 'CLOSED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QualificationTier" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "DecisionSource" AS ENUM ('SYSTEM', 'AI', 'ADMIN');

-- CreateEnum
CREATE TYPE "DisclosureMode" AS ENUM ('FULL_CONTACT', 'PLATFORM_MESSAGING_ONLY');

-- CreateEnum
CREATE TYPE "DistributionMode" AS ENUM ('EXCLUSIVE', 'LIMITED_SHARED', 'PRIVATE_INVITATION', 'ADMIN_ASSIGNMENT');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('DRAFT', 'AVAILABLE', 'PAUSED', 'SOLD_OUT', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PricingTier" AS ENUM ('STANDARD', 'HIGH_INTENT', 'PREMIUM', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'NOTIFIED');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'CONVERTED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "UnlockMethod" AS ENUM ('CARD', 'CREDITS', 'INVOICE', 'COMPLIMENTARY');

-- CreateEnum
CREATE TYPE "UnlockStatus" AS ENUM ('ACTIVE', 'REFUNDED', 'CREDITED', 'REVOKED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING_REVIEW', 'INFO_REQUIRED', 'VERIFIED', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SellerAvailability" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "SellerDocumentKind" AS ENUM ('BUSINESS_REGISTRATION', 'TAX_CERTIFICATE', 'FACTORY_PHOTO', 'IDENTITY', 'OTHER');

-- CreateEnum
CREATE TYPE "AttachmentPurpose" AS ENUM ('RFQ_ARTWORK', 'SELLER_DOCUMENT', 'PORTFOLIO', 'QUOTE_ATTACHMENT', 'MESSAGE_ATTACHMENT', 'DISPUTE_EVIDENCE');

-- CreateEnum
CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING', 'READY', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('NOT_SCANNED', 'CLEAN', 'INFECTED', 'UNSUPPORTED');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VIEWED', 'CLARIFICATION_REQUESTED', 'REVISED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MessageSide" AS ENUM ('BUYER', 'SELLER', 'ADMIN', 'SYSTEM');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'REQUIRES_AUTHENTICATION', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('RFQ_UNLOCK', 'CREDIT_TOPUP');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('TOPUP', 'UNLOCK_DEBIT', 'REFUND_CREDIT', 'ADJUSTMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "RefundMethod" AS ENUM ('ORIGINAL_PAYMENT', 'CREDIT');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('REQUESTED', 'APPROVED', 'PROCESSED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "DisputeReason" AS ENUM ('INVALID_CONTACT', 'DUPLICATE', 'SPAM_OR_FRAUD', 'NOT_AS_DESCRIBED', 'BUYER_ALREADY_SOURCED', 'OTHER');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_CREDIT', 'RESOLVED_REFUND', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConsentKind" AS ENUM ('TERMS', 'SUPPLIER_MATCHING', 'DATA_SHARING', 'MARKETING', 'SELLER_TERMS');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'DEAD');

-- CreateEnum
CREATE TYPE "AIStatus" AS ENUM ('SUCCEEDED', 'FAILED', 'REJECTED_SCHEMA', 'SKIPPED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'ACTIONED', 'DISMISSED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "phoneVerifiedAt" TIMESTAMP(3),
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'NONE',
    "googleSub" TEXT,
    "mfaSecretEnc" TEXT,
    "mfaEnabledAt" TIMESTAMP(3),
    "mfaRecoveryHashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disabledAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "mfaVerifiedAt" TIMESTAMP(3),
    "activeOrgId" UUID,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "userId" UUID,
    "email" TEXT NOT NULL,
    "data" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "type" "OrgType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT,
    "website" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "OrgMemberRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrgMemberRole" NOT NULL DEFAULT 'MEMBER',
    "tokenHash" TEXT NOT NULL,
    "invitedById" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoleGrant" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "permission" TEXT NOT NULL,
    "grantedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuyerProfile" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "companyName" TEXT,
    "phone" TEXT,
    "preferredContact" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BuyerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerProfile" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradingName" TEXT,
    "publicSlug" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "addressLine1" TEXT,
    "city" TEXT,
    "region" TEXT,
    "postalCode" TEXT,
    "contactName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "registrationNumber" TEXT,
    "yearsOperating" INTEGER,
    "factoryLocation" TEXT,
    "exportMarkets" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "verifiedAt" TIMESTAMP(3),
    "availability" "SellerAvailability" NOT NULL DEFAULT 'ACTIVE',
    "backingOptions" "BackingType"[] DEFAULT ARRAY[]::"BackingType"[],
    "borderOptions" "BorderType"[] DEFAULT ARRAY[]::"BorderType"[],
    "shippingCountries" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "artworkSupport" BOOLEAN NOT NULL DEFAULT false,
    "sampleCapable" BOOLEAN NOT NULL DEFAULT false,
    "rushCapable" BOOLEAN NOT NULL DEFAULT false,
    "dailyRfqLimit" INTEGER NOT NULL DEFAULT 10,
    "maxDailySpendMinor" INTEGER NOT NULL DEFAULT 25000,
    "minBudgetMinor" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notificationPrefs" JSONB,
    "avgResponseMinutes" INTEGER,
    "quotesSubmitted" INTEGER NOT NULL DEFAULT 0,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerCapability" (
    "id" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "patchType" "PatchType" NOT NULL,
    "moq" INTEGER NOT NULL,
    "maxQuantity" INTEGER,
    "weeklyCapacity" INTEGER,
    "standardDays" INTEGER NOT NULL,
    "rushDays" INTEGER,
    "priceMinMinor" INTEGER,
    "priceMaxMinor" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SellerCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerVerification" (
    "id" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "fromStatus" "VerificationStatus" NOT NULL,
    "toStatus" "VerificationStatus" NOT NULL,
    "reason" TEXT,
    "requestedInfo" TEXT,
    "reviewerId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerDocument" (
    "id" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "kind" "SellerDocumentKind" NOT NULL,
    "attachmentId" UUID NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerPortfolioItem" (
    "id" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "patchType" "PatchType",
    "attachmentId" UUID NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerPortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerReview" (
    "id" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SellerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" UUID NOT NULL,
    "purpose" "AttachmentPurpose" NOT NULL,
    "status" "AttachmentStatus" NOT NULL DEFAULT 'PENDING',
    "storageKey" TEXT NOT NULL,
    "previewKey" TEXT,
    "teaserKey" TEXT,
    "originalFilename" TEXT NOT NULL,
    "sanitizedFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT,
    "scanStatus" "ScanStatus" NOT NULL DEFAULT 'NOT_SCANNED',
    "rejectionReason" TEXT,
    "uploaderUserId" UUID,
    "ownerOrgId" UUID,
    "guestOwnerHash" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "messageId" UUID,
    "quoteId" UUID,
    "disputeId" UUID,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rfq" (
    "id" UUID NOT NULL,
    "publicRef" TEXT NOT NULL,
    "status" "RfqStatus" NOT NULL DEFAULT 'DRAFT',
    "patchType" "PatchType" NOT NULL,
    "intendedUse" "IntendedUse" NOT NULL,
    "intendedUseOther" TEXT,
    "buyerOrgId" UUID,
    "buyerUserId" UUID,
    "contactName" TEXT NOT NULL,
    "contactCompany" TEXT,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "contactWebsite" TEXT,
    "preferredContact" TEXT NOT NULL DEFAULT 'EMAIL',
    "disclosureMode" "DisclosureMode" NOT NULL DEFAULT 'FULL_CONTACT',
    "maxRecipients" INTEGER NOT NULL DEFAULT 1,
    "emailVerifiedAt" TIMESTAMP(3),
    "guestAccessHash" TEXT,
    "submittedAt" TIMESTAMP(3),
    "qualifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closeReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "selectedQuoteId" UUID,
    "duplicateOfId" UUID,
    "submitIp" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rfq_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqStatusEvent" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "from" "RfqStatus",
    "to" "RfqStatus" NOT NULL,
    "note" TEXT,
    "actorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfqStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqSpecification" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "unit" "DimensionUnit" NOT NULL DEFAULT 'IN',
    "shape" TEXT,
    "borderType" "BorderType",
    "material" TEXT,
    "thickness" TEXT,
    "quantity" INTEGER NOT NULL,
    "minQuantity" INTEGER,
    "repeatPotential" BOOLEAN NOT NULL DEFAULT false,
    "sampleRequired" BOOLEAN NOT NULL DEFAULT false,
    "backing" "BackingType",
    "backingOther" TEXT,
    "colorCount" INTEGER,
    "specialFinishing" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "destinationCountry" TEXT NOT NULL DEFAULT 'US',
    "destinationState" TEXT,
    "destinationPostal" TEXT,
    "requiredBy" TIMESTAMP(3),
    "rush" BOOLEAN NOT NULL DEFAULT false,
    "sampleBeforeProduction" BOOLEAN NOT NULL DEFAULT false,
    "budgetTotalMinor" INTEGER,
    "targetUnitMinor" INTEGER,
    "budgetFlexibility" TEXT,
    "budgetUndisclosed" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "artworkNotes" TEXT,
    "aiSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RfqSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqArtwork" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "attachmentId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfqArtwork_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqQualification" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "tier" "QualificationTier" NOT NULL,
    "pricingTier" "PricingTier" NOT NULL DEFAULT 'STANDARD',
    "score" INTEGER NOT NULL,
    "completenessScore" INTEGER NOT NULL,
    "intentScore" INTEGER NOT NULL,
    "fraudScore" INTEGER NOT NULL,
    "source" "DecisionSource" NOT NULL,
    "reviewerId" UUID,
    "needsHumanReview" BOOLEAN NOT NULL DEFAULT true,
    "missingFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "clarificationQuestions" JSONB,
    "reasons" JSONB,
    "rulesVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfqQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqQualificationSignal" (
    "id" UUID NOT NULL,
    "qualificationId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "weight" INTEGER NOT NULL,
    "detail" TEXT,

    CONSTRAINT "RfqQualificationSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqMatch" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "eligible" BOOLEAN NOT NULL,
    "ineligibleReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "score" INTEGER NOT NULL,
    "breakdown" JSONB NOT NULL,
    "explanation" TEXT,
    "algorithmVersion" TEXT NOT NULL,
    "configId" UUID,
    "status" "MatchStatus" NOT NULL DEFAULT 'PROPOSED',
    "overriddenById" UUID,
    "overrideNote" TEXT,
    "notifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RfqMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqAssignment" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "kind" "DistributionMode" NOT NULL,
    "createdById" UUID NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfqAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'DRAFT',
    "distributionMode" "DistributionMode" NOT NULL DEFAULT 'EXCLUSIVE',
    "maxUnlocks" INTEGER NOT NULL DEFAULT 1,
    "unlockCount" INTEGER NOT NULL DEFAULT 0,
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "pricingTier" "PricingTier" NOT NULL,
    "pricingRuleId" UUID,
    "priceOverridden" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "publishedById" UUID,
    "expiresAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityPriceEvent" (
    "id" UUID NOT NULL,
    "opportunityId" UUID NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "pricingRuleId" UUID,
    "reason" TEXT NOT NULL,
    "actorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityPriceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqReservation" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paymentId" UUID,
    "releasedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RfqReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqUnlock" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "method" "UnlockMethod" NOT NULL,
    "status" "UnlockStatus" NOT NULL DEFAULT 'ACTIVE',
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentId" UUID,
    "receiptNumber" TEXT NOT NULL,
    "unlockedById" UUID,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfqUnlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "quantity" INTEGER NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "setupFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "sampleFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "toolingFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "artworkFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "shippingMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL,
    "productionDays" INTEGER NOT NULL,
    "deliveryEstimate" TEXT,
    "moq" INTEGER,
    "samplePolicy" TEXT,
    "paymentTerms" TEXT,
    "revisionPolicy" TEXT,
    "notes" TEXT,
    "validUntil" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "shortlisted" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteRevision" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuoteRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "buyerReadAt" TIMESTAMP(3),
    "sellerReadAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "side" "MessageSide" NOT NULL,
    "senderUserId" UUID,
    "body" TEXT NOT NULL,
    "redacted" BOOLEAN NOT NULL DEFAULT false,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "hiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "reporterId" UUID NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolvedById" UUID,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerRef" TEXT NOT NULL,
    "brand" TEXT,
    "last4" TEXT,
    "expMonth" INTEGER,
    "expYear" INTEGER,
    "offSessionApproved" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "provider" TEXT NOT NULL,
    "providerRef" TEXT,
    "checkoutUrl" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "rfqId" UUID,
    "invoiceId" UUID,
    "failureReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "initiatedById" UUID,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "fromStatus" "PaymentStatus",
    "toStatus" "PaymentStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "providerRef" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" UUID NOT NULL,
    "orgId" UUID NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "balanceMinor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletLedgerEntry" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentId" UUID,
    "unlockId" UUID,
    "refundId" UUID,
    "invoiceId" UUID,
    "memo" TEXT,
    "createdById" UUID,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "orgId" UUID NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "createdById" UUID NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" UUID NOT NULL,
    "unlockId" UUID NOT NULL,
    "paymentId" UUID,
    "disputeId" UUID,
    "method" "RefundMethod" NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'REQUESTED',
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "providerRef" TEXT,
    "decidedById" UUID,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" UUID NOT NULL,
    "unlockId" UUID NOT NULL,
    "sellerId" UUID NOT NULL,
    "reason" "DisputeReason" NOT NULL,
    "description" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "decision" TEXT,
    "decidedById" UUID,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "template" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "providerId" TEXT,
    "error" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" UUID NOT NULL,
    "kind" "ConsentKind" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "email" TEXT NOT NULL,
    "userId" UUID,
    "rfqId" UUID,
    "textVersion" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "maxRecipients" INTEGER,
    "disclosureMode" "DisclosureMode",
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataDisclosureEvent" (
    "id" UUID NOT NULL,
    "rfqId" UUID NOT NULL,
    "sellerId" UUID,
    "unlockId" UUID,
    "actorId" UUID,
    "fields" TEXT[],
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataDisclosureEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "diff" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIExecution" (
    "id" UUID NOT NULL,
    "feature" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "status" "AIStatus" NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "inputHash" TEXT NOT NULL,
    "output" JSONB,
    "confidence" DOUBLE PRECISION,
    "latencyMs" INTEGER NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "costMicros" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "actorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchingConfiguration" (
    "id" UUID NOT NULL,
    "version" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "minScore" INTEGER NOT NULL DEFAULT 40,
    "maxNotified" INTEGER NOT NULL DEFAULT 5,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchingConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "PricingTier" NOT NULL,
    "patchType" "PatchType",
    "distributionMode" "DistributionMode",
    "priceMinor" INTEGER NOT NULL,
    "minMinor" INTEGER NOT NULL DEFAULT 500,
    "maxMinor" INTEGER NOT NULL DEFAULT 50000,
    "discountBps" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdById" UUID,
    "supersededById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "userId" UUID,
    "orgId" UUID,
    "rfqId" UUID,
    "anonId" TEXT,
    "props" JSONB,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingAttribution" (
    "id" UUID NOT NULL,
    "rfqId" UUID,
    "sellerOrgId" UUID,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "utmTerm" TEXT,
    "gclid" TEXT,
    "fbclid" TEXT,
    "landingPage" TEXT,
    "referrer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingAttribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdSpendEntry" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "channel" TEXT NOT NULL,
    "campaign" TEXT,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "leads" INTEGER,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdSpendEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "signatureValid" BOOLEAN NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundJob" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "lockedAt" TIMESTAMP(3),
    "dedupeKey" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BackgroundJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "updatedById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- CreateIndex
CREATE INDEX "User_platformRole_idx" ON "User"("platformRole");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_tokenHash_key" ON "VerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "VerificationToken_email_purpose_idx" ON "VerificationToken"("email", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_type_idx" ON "Organization"("type");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_orgId_userId_key" ON "OrganizationMember"("orgId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_orgId_idx" ON "Invitation"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "RoleGrant_userId_permission_key" ON "RoleGrant"("userId", "permission");

-- CreateIndex
CREATE UNIQUE INDEX "BuyerProfile_orgId_key" ON "BuyerProfile"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_orgId_key" ON "SellerProfile"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerProfile_publicSlug_key" ON "SellerProfile"("publicSlug");

-- CreateIndex
CREATE INDEX "SellerProfile_verificationStatus_availability_idx" ON "SellerProfile"("verificationStatus", "availability");

-- CreateIndex
CREATE INDEX "SellerCapability_patchType_idx" ON "SellerCapability"("patchType");

-- CreateIndex
CREATE UNIQUE INDEX "SellerCapability_sellerId_patchType_key" ON "SellerCapability"("sellerId", "patchType");

-- CreateIndex
CREATE INDEX "SellerVerification_sellerId_createdAt_idx" ON "SellerVerification"("sellerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SellerDocument_attachmentId_key" ON "SellerDocument"("attachmentId");

-- CreateIndex
CREATE INDEX "SellerDocument_sellerId_idx" ON "SellerDocument"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerPortfolioItem_attachmentId_key" ON "SellerPortfolioItem"("attachmentId");

-- CreateIndex
CREATE INDEX "SellerPortfolioItem_sellerId_idx" ON "SellerPortfolioItem"("sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerReview_rfqId_sellerId_key" ON "SellerReview"("rfqId", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Attachment_storageKey_key" ON "Attachment"("storageKey");

-- CreateIndex
CREATE INDEX "Attachment_guestOwnerHash_idx" ON "Attachment"("guestOwnerHash");

-- CreateIndex
CREATE INDEX "Attachment_ownerOrgId_idx" ON "Attachment"("ownerOrgId");

-- CreateIndex
CREATE UNIQUE INDEX "Rfq_publicRef_key" ON "Rfq"("publicRef");

-- CreateIndex
CREATE UNIQUE INDEX "Rfq_selectedQuoteId_key" ON "Rfq"("selectedQuoteId");

-- CreateIndex
CREATE INDEX "Rfq_status_idx" ON "Rfq"("status");

-- CreateIndex
CREATE INDEX "Rfq_contactEmail_idx" ON "Rfq"("contactEmail");

-- CreateIndex
CREATE INDEX "Rfq_buyerOrgId_idx" ON "Rfq"("buyerOrgId");

-- CreateIndex
CREATE INDEX "Rfq_isDemo_createdAt_idx" ON "Rfq"("isDemo", "createdAt");

-- CreateIndex
CREATE INDEX "RfqStatusEvent_rfqId_createdAt_idx" ON "RfqStatusEvent"("rfqId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RfqSpecification_rfqId_key" ON "RfqSpecification"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "RfqArtwork_attachmentId_key" ON "RfqArtwork"("attachmentId");

-- CreateIndex
CREATE INDEX "RfqArtwork_rfqId_idx" ON "RfqArtwork"("rfqId");

-- CreateIndex
CREATE INDEX "RfqQualification_rfqId_isCurrent_idx" ON "RfqQualification"("rfqId", "isCurrent");

-- CreateIndex
CREATE INDEX "RfqQualification_tier_idx" ON "RfqQualification"("tier");

-- CreateIndex
CREATE INDEX "RfqQualificationSignal_qualificationId_idx" ON "RfqQualificationSignal"("qualificationId");

-- CreateIndex
CREATE INDEX "RfqMatch_sellerId_status_idx" ON "RfqMatch"("sellerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RfqMatch_rfqId_sellerId_key" ON "RfqMatch"("rfqId", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "RfqAssignment_rfqId_sellerId_key" ON "RfqAssignment"("rfqId", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "Opportunity_rfqId_key" ON "Opportunity"("rfqId");

-- CreateIndex
CREATE INDEX "Opportunity_status_idx" ON "Opportunity"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RfqReservation_paymentId_key" ON "RfqReservation"("paymentId");

-- CreateIndex
CREATE INDEX "RfqReservation_rfqId_status_idx" ON "RfqReservation"("rfqId", "status");

-- CreateIndex
CREATE INDEX "RfqReservation_sellerId_status_idx" ON "RfqReservation"("sellerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RfqUnlock_paymentId_key" ON "RfqUnlock"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "RfqUnlock_receiptNumber_key" ON "RfqUnlock"("receiptNumber");

-- CreateIndex
CREATE INDEX "RfqUnlock_sellerId_createdAt_idx" ON "RfqUnlock"("sellerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RfqUnlock_rfqId_sellerId_key" ON "RfqUnlock"("rfqId", "sellerId");

-- CreateIndex
CREATE INDEX "Quote_sellerId_status_idx" ON "Quote"("sellerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Quote_rfqId_sellerId_key" ON "Quote"("rfqId", "sellerId");

-- CreateIndex
CREATE UNIQUE INDEX "QuoteRevision_quoteId_version_key" ON "QuoteRevision"("quoteId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_rfqId_sellerId_key" ON "Conversation"("rfqId", "sellerId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_provider_providerRef_key" ON "PaymentMethod"("provider", "providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_orgId_createdAt_idx" ON "Payment"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_provider_providerRef_key" ON "Payment"("provider", "providerRef");

-- CreateIndex
CREATE INDEX "PaymentAttempt_paymentId_idx" ON "PaymentAttempt"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_orgId_key" ON "Wallet"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletLedgerEntry_idempotencyKey_key" ON "WalletLedgerEntry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WalletLedgerEntry_walletId_createdAt_idx" ON "WalletLedgerEntry"("walletId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_number_key" ON "Invoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_disputeId_key" ON "Refund"("disputeId");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationTemplate_key_channel_key" ON "NotificationTemplate"("key", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationDelivery_dedupeKey_key" ON "NotificationDelivery"("dedupeKey");

-- CreateIndex
CREATE INDEX "ConsentRecord_email_kind_idx" ON "ConsentRecord"("email", "kind");

-- CreateIndex
CREATE INDEX "ConsentRecord_rfqId_idx" ON "ConsentRecord"("rfqId");

-- CreateIndex
CREATE INDEX "DataDisclosureEvent_rfqId_idx" ON "DataDisclosureEvent"("rfqId");

-- CreateIndex
CREATE INDEX "DataDisclosureEvent_sellerId_idx" ON "DataDisclosureEvent"("sellerId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AIExecution_feature_createdAt_idx" ON "AIExecution"("feature", "createdAt");

-- CreateIndex
CREATE INDEX "AIExecution_entityType_entityId_idx" ON "AIExecution"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchingConfiguration_version_key" ON "MatchingConfiguration"("version");

-- CreateIndex
CREATE INDEX "PricingRule_tier_active_idx" ON "PricingRule"("tier", "active");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingAttribution_rfqId_key" ON "MarketingAttribution"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingAttribution_sellerOrgId_key" ON "MarketingAttribution"("sellerOrgId");

-- CreateIndex
CREATE INDEX "MarketingAttribution_utmSource_utmCampaign_idx" ON "MarketingAttribution"("utmSource", "utmCampaign");

-- CreateIndex
CREATE INDEX "AdSpendEntry_date_idx" ON "AdSpendEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundJob_dedupeKey_key" ON "BackgroundJob"("dedupeKey");

-- CreateIndex
CREATE INDEX "BackgroundJob_status_runAt_idx" ON "BackgroundJob"("status", "runAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationToken" ADD CONSTRAINT "VerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuyerProfile" ADD CONSTRAINT "BuyerProfile_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerProfile" ADD CONSTRAINT "SellerProfile_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerCapability" ADD CONSTRAINT "SellerCapability_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerVerification" ADD CONSTRAINT "SellerVerification_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerDocument" ADD CONSTRAINT "SellerDocument_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerDocument" ADD CONSTRAINT "SellerDocument_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPortfolioItem" ADD CONSTRAINT "SellerPortfolioItem_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerPortfolioItem" ADD CONSTRAINT "SellerPortfolioItem_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerReview" ADD CONSTRAINT "SellerReview_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerReview" ADD CONSTRAINT "SellerReview_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_buyerOrgId_fkey" FOREIGN KEY ("buyerOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rfq" ADD CONSTRAINT "Rfq_selectedQuoteId_fkey" FOREIGN KEY ("selectedQuoteId") REFERENCES "Quote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqStatusEvent" ADD CONSTRAINT "RfqStatusEvent_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqSpecification" ADD CONSTRAINT "RfqSpecification_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqArtwork" ADD CONSTRAINT "RfqArtwork_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqArtwork" ADD CONSTRAINT "RfqArtwork_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqQualification" ADD CONSTRAINT "RfqQualification_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqQualificationSignal" ADD CONSTRAINT "RfqQualificationSignal_qualificationId_fkey" FOREIGN KEY ("qualificationId") REFERENCES "RfqQualification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqMatch" ADD CONSTRAINT "RfqMatch_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqMatch" ADD CONSTRAINT "RfqMatch_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqAssignment" ADD CONSTRAINT "RfqAssignment_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqAssignment" ADD CONSTRAINT "RfqAssignment_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityPriceEvent" ADD CONSTRAINT "OpportunityPriceEvent_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqReservation" ADD CONSTRAINT "RfqReservation_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqReservation" ADD CONSTRAINT "RfqReservation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqReservation" ADD CONSTRAINT "RfqReservation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqUnlock" ADD CONSTRAINT "RfqUnlock_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqUnlock" ADD CONSTRAINT "RfqUnlock_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqUnlock" ADD CONSTRAINT "RfqUnlock_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteRevision" ADD CONSTRAINT "QuoteRevision_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletLedgerEntry" ADD CONSTRAINT "WalletLedgerEntry_unlockId_fkey" FOREIGN KEY ("unlockId") REFERENCES "RfqUnlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_unlockId_fkey" FOREIGN KEY ("unlockId") REFERENCES "RfqUnlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_unlockId_fkey" FOREIGN KEY ("unlockId") REFERENCES "RfqUnlock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "SellerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentRecord" ADD CONSTRAINT "ConsentRecord_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataDisclosureEvent" ADD CONSTRAINT "DataDisclosureEvent_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataDisclosureEvent" ADD CONSTRAINT "DataDisclosureEvent_unlockId_fkey" FOREIGN KEY ("unlockId") REFERENCES "RfqUnlock"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingAttribution" ADD CONSTRAINT "MarketingAttribution_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "Rfq"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ───────────── Integrity constraints Prisma cannot express ─────────────
-- An opportunity can never be sold beyond its allocation (exclusive = 1).
ALTER TABLE "Opportunity" ADD CONSTRAINT "opportunity_unlocks_within_allocation" CHECK ("unlockCount" >= 0 AND "unlockCount" <= "maxUnlocks");
ALTER TABLE "Opportunity" ADD CONSTRAINT "opportunity_max_unlocks_positive" CHECK ("maxUnlocks" >= 1 AND "maxUnlocks" <= 10);
ALTER TABLE "Opportunity" ADD CONSTRAINT "opportunity_price_positive" CHECK ("priceMinor" > 0);
-- Credit wallets can never go negative.
ALTER TABLE "Wallet" ADD CONSTRAINT "wallet_balance_non_negative" CHECK ("balanceMinor" >= 0);
-- A seller can hold at most one active reservation per RFQ.
CREATE UNIQUE INDEX "rfq_reservation_one_active_per_seller" ON "RfqReservation" ("rfqId", "sellerId") WHERE "status" = 'ACTIVE';
-- Only one current qualification per RFQ.
CREATE UNIQUE INDEX "rfq_qualification_one_current" ON "RfqQualification" ("rfqId") WHERE "isCurrent" = true;
-- Money columns are non-negative.
ALTER TABLE "Payment" ADD CONSTRAINT "payment_amount_positive" CHECK ("amountMinor" > 0);
ALTER TABLE "Refund" ADD CONSTRAINT "refund_amount_positive" CHECK ("amountMinor" > 0);
ALTER TABLE "RfqUnlock" ADD CONSTRAINT "unlock_price_non_negative" CHECK ("priceMinor" >= 0);
ALTER TABLE "SellerReview" ADD CONSTRAINT "review_rating_range" CHECK ("rating" BETWEEN 1 AND 5);
