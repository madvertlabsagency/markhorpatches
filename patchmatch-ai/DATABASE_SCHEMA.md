# Database Schema

The source of truth is `prisma/schema.prisma`, together with the SQL in `prisma/migrations/*`. This document covers the model and the invariants that the database enforces.

## Conventions
- IDs are UUIDs.
- Money is stored as **integer minor units** (`*Minor`) with an explicit `currency`. Floats are never used for money.
- Every business table has an `isDemo` flag. Production metrics always filter on `isDemo = false`. The demo seed refuses to run unless `DEMO_MODE=true`.
- Timestamps are `createdAt` / `updatedAt`, plus explicit event timestamps such as `qualifiedAt`, `emailVerifiedAt` and `paidAt`.
- Status history is kept in append-only event tables (`RfqStatusEvent`, `OpportunityPriceEvent`) and in `AuditLog`.

## Entities (55 models)

| Area | Models |
|---|---|
| Identity & access | `User`, `Session`, `VerificationToken`, `RoleGrant`, `Organization`, `OrganizationMember`, `Invitation` |
| Buyers | `BuyerProfile` |
| Sellers | `SellerProfile`, `SellerCapability`, `SellerVerification`, `SellerDocument`, `SellerPortfolioItem`, `SellerReview` |
| RFQ | `Rfq`, `RfqStatusEvent`, `RfqSpecification`, `RfqArtwork`, `Attachment` |
| Qualification & matching | `RfqQualification`, `RfqQualificationSignal`, `RfqMatch`, `RfqAssignment`, `MatchingConfiguration` |
| Marketplace | `Opportunity`, `OpportunityPriceEvent`, `RfqReservation`, `RfqUnlock`, `PricingRule` |
| Quotes & messaging | `Quote`, `QuoteLineItem`, `QuoteRevision`, `Conversation`, `Message`, `Report` |
| Money | `PaymentMethod` (provider token reference only), `Payment`, `PaymentAttempt`, `Wallet`, `WalletLedgerEntry`, `Invoice`, `Refund`, `Dispute`, `WebhookEvent` |
| Notifications | `Notification`, `NotificationTemplate`, `NotificationDelivery` |
| Privacy & compliance | `ConsentRecord`, `DataDisclosureEvent`, `AuditLog` |
| AI, analytics & ops | `AIExecution`, `AnalyticsEvent`, `MarketingAttribution`, `AdSpendEntry`, `BackgroundJob`, `FeatureFlag`, `PlatformSetting` |

## Key relationships
- `Rfq` belongs to a buyer `Organization`. Guest RFQs have none and are found through `contactEmail` plus a hashed tracking token.
- An `Rfq` has one `RfqSpecification`, many `RfqArtwork` → `Attachment` (original, preview and teaser variants), and many `RfqQualification` rows, of which exactly one is current.
- An `Rfq` has many `RfqMatch` rows, at most one per seller.
- An `Rfq` has at most one `Opportunity`. The opportunity holds the mode, price, `maxUnlocks`, `unlockCount` and status.
- `RfqReservation` and `RfqUnlock` link an `Rfq` to a `SellerProfile`. An `RfqUnlock` references its `Payment` or wallet ledger entry.
- `Payment` has many `PaymentAttempt` rows and many `Refund` rows. `Dispute` can link to an unlock, a payment or a quote.
- `Wallet` has many `WalletLedgerEntry` rows, an append-only ledger. The balance is denormalised and kept in sync inside the same transaction.

## Database-enforced invariants

| Invariant | Mechanism |
|---|---|
| An exclusive RFQ is never sold twice, and no RFQ is sold beyond its allocation | `CHECK (unlockCount >= 0 AND unlockCount <= maxUnlocks)` plus `SELECT … FOR UPDATE` on the `Opportunity` row in the unlock transaction |
| `maxUnlocks` stays within 1..10 and the price is positive | CHECK constraints |
| A seller unlocks a given RFQ at most once | `@@unique([rfqId, sellerId])` on `RfqUnlock` |
| A seller has at most one active reservation per RFQ | Partial unique index `WHERE status = 'ACTIVE'` |
| An RFQ has exactly one current qualification | Partial unique index `WHERE isCurrent = true` |
| A wallet can never go negative | `CHECK (balanceMinor >= 0)` plus a conditional decrement |
| Payment and refund amounts are positive | CHECK constraints |
| A webhook is processed once | `WebhookEvent` unique on (provider, eventId) |
| A provider reference cannot map to two payments | `@@unique([provider, providerRef])` |
| Review ratings fall within 1..5 | CHECK. Reviews can only exist for RFQs the seller quoted on, and none are seeded in production. |

## State machines
These live in `src/lib/state-machines.ts`, and every status write calls `assertTransition`.

- **RFQ:** DRAFT → SUBMITTED → VERIFICATION_PENDING → UNDER_REVIEW ⇄ CLARIFICATION_REQUIRED → QUALIFIED → MATCHING / MANUAL_SOURCING → SELLER_NOTIFIED → QUOTES_RECEIVED → SELLER_SELECTED → CLOSED. CANCELLED and EXPIRED are terminal states.
- **Opportunity:** DRAFT → AVAILABLE ⇄ PAUSED → SOLD_OUT / EXPIRED / WITHDRAWN
- **Payment:** CREATED → PENDING → (REQUIRES_AUTHENTICATION) → PROCESSING → PAID / FAILED / CANCELLED. A PAID payment can become REFUNDED or DISPUTED. **Initiating a payment is never treated as PAID.**
- **Quote:** DRAFT → SUBMITTED → VIEWED → CLARIFICATION_REQUESTED → REVISED → ACCEPTED / REJECTED / EXPIRED / WITHDRAWN
- **Seller verification:** UNVERIFIED → PENDING_REVIEW → INFO_REQUIRED / VERIFIED / REJECTED. A VERIFIED seller can become SUSPENDED.

## Sensitive data
- Passwords are stored as bcrypt hashes. TOTP secrets are AES-256-GCM encrypted with a key derived from `APP_SECRET`. Recovery codes are hashed.
- No raw card data is stored anywhere. `PaymentMethod` holds only a provider token reference, brand and last4, and only if a provider returns them.
- Buyer contact fields live on `Rfq`. They are projected to sellers only through `projectRfqForSeller()`, and every disclosure writes a `DataDisclosureEvent`.
- Guest tracking tokens and guest upload ownership are stored as hashes.

## Migrations
- `20261023154451_init`: the full schema plus the integrity constraints listed above, written as hand-appended SQL.
- `20261023170008_ad_spend_demo_flag`: adds `AdSpendEntry.isDemo`.

Apply them with `npx prisma migrate deploy`, then run `npx prisma generate`. In Prisma 7, migrate does not regenerate the client.
