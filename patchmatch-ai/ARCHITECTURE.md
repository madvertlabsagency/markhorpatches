# Architecture

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router (React 19, Server Components, Server Actions). Middleware lives in `src/proxy.ts`. |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 with semantic CSS-variable tokens, Radix UI primitives, lucide icons, motion |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`). The client is generated into `src/generated/prisma`. |
| Validation | zod v4. Every server action and API route validates its input. |
| Storage | S3-compatible signed URLs (local driver for development). sharp generates previews. |
| Email | Resend or Postmark, behind a provider interface (`console` in development) |
| AI | Provider-agnostic `runAITask`: a Zod output schema plus a deterministic fallback. The adapters are `rules` and Anthropic. |
| Jobs | Postgres-backed queue (`BackgroundJob`, `FOR UPDATE SKIP LOCKED`) |
| Hosting | Vercel (or any Node host) plus managed Postgres and S3/R2 |

## Code layout

```
src/
  app/(site)        public marketing, SEO, RFQ wizard, guest tracking, legal
  app/(auth)        login, MFA, register, password reset, email verification
  app/buyer|seller|admin   role portals (server components + server actions)
  app/api           uploads, file proxy, payment webhooks, cron, Google OAuth
  lib/domain        business logic (rfq, matching, access, unlock, quotes, messages, finance, …)
  lib/rfq           schema, qualification engine, disclosure/redaction
  lib/matching      matching engine (pure)
  lib/pricing       pricing engine (pure)
  lib/services      provider adapters: payments, storage, email, ai
  lib/auth          sessions, RBAC, TOTP, passwords
  lib/jobs          queue + handlers
  lib/state-machines.ts   allowed transitions for RFQ / opportunity / payment / quote / verification
```

The pure engines (qualification, matching, pricing, forecast, redaction) contain no I/O and are unit-tested directly. The domain modules own every transaction and every state change.

## Critical flows

### 1. RFQ intake
The 11-step wizard submits an `Rfq` in the `SUBMITTED` state. Each step saves to the server; there is no localStorage database.

1. If the buyer is a guest, an email verification token is sent and the RFQ moves to `VERIFICATION_PENDING`.
2. Once verified, the qualification engine scores completeness, intent and fraud, and assigns a tier from A to D plus a pricing tier. The result is stored in a `RfqQualification` row; a partial unique index allows only one current qualification per RFQ.
3. Tier A can be auto-qualified only if the feature flag is on. Every other RFQ moves to `UNDER_REVIEW` for an admin.

Consent is recorded per purpose in `ConsentRecord`:
- contact sharing, required to sell the RFQ
- marketing, which is a separate checkbox, unchecked by default

### 2. Matching
Matching runs in two stages:

1. Hard filters remove any seller that fails one of these checks:
   - verification status
   - paused
   - patch-type capability
   - MOQ and maximum quantity
   - deadline feasibility
   - export ability
2. Each remaining seller gets a weighted score: capability 25, capacity 20, delivery 20, quality 15, budget 10, responsiveness 5, logistics 5.

Results are stored as `RfqMatch` rows, including the reasons for exclusions. The weights are versioned in `MatchingConfiguration`. Quality uses only real review and performance data; ratings are never fabricated. Publishing creates an `Opportunity` with the mode, the price from the `PricingRule`, and `maxUnlocks` (exclusive means 1). The top matches are then notified.

### 3. Paid unlock (the money path)
```
seller clicks Unlock
  → reserve(): tx { SELECT Opportunity FOR UPDATE; check status/eligibility/remaining;
                    create RfqReservation (15 min, partial-unique per seller) }
  → createPayment(): Payment(CREATED) + provider.createCheckout() → redirect
  … buyer data still locked …
provider webhook → /api/webhooks/payments/[provider]
  → verify signature (HMAC, timestamped) → dedupe WebhookEvent(provider,eventId)
  → amount + currency must equal Payment → PAID
  → grantUnlock(): tx { lock Opportunity; re-check remaining & reservation;
                        RfqUnlock ACTIVE; unlockCount++ (CHECK ≤ maxUnlocks);
                        DataDisclosureEvent; audit }
  → if no longer fulfillable: unlock REVOKED + automatic wallet credit for the amount
```
- Returning from the checkout redirect never grants access. Only a verified webhook does.
- Paying with credits uses a conditional decrement (`balanceMinor >= price`) inside the same transaction as the unlock grant.
- A database CHECK constraint and row locking together prevent an exclusive RFQ from being sold twice. The integration test runs 12 concurrent attempts and confirms there is never an oversell.

### 4. Disclosure
`projectRfqForSeller()` is the only function that shapes RFQ data for sellers:
- **Locked view:** patch type, size, quantity, region, deadline band, budget band, and a blurred teaser. Free text goes through `redactContactInfo` first.
- **Unlocked view:** adds the full specification and the original artwork. Buyer contact details are included only within the buyer's consent; "platform messaging only" withholds them.

When messaging-only mode is on, email addresses, phone numbers, URLs and social handles typed into messages are masked.

### 5. Files
1. The client requests a signed upload URL (rate-limited, with size and type allow-lists).
2. The browser sends the file directly to storage.
3. `/api/uploads/complete` verifies the file server-side: magic bytes, an SVG safety check, sha256, and a page/pixel check. It then generates previews with sharp, without metadata, and blurred teasers.

Every download goes through `/api/files/[id]`. That route authorises the request against the role, ownership and unlock state, then redirects to a URL signed for a short time. Original artwork is never public.

### 6. Background jobs
Jobs are enqueued inside the business transaction. They are processed in three ways:
1. inline after the response (`after()`)
2. the `/api/cron/jobs` endpoint every 5 minutes, authenticated with `CRON_SECRET`
3. `npm run jobs:run`

Failed jobs retry with exponential backoff and are dead-lettered after the maximum number of attempts. Dead-lettered jobs appear in the admin queue. Maintenance runs hourly. It expires reservations, removes stale uploads that were never completed, and expires RFQs still unverified after 14 days.

### 7. AI
`runAITask(task, input)` works as follows:
1. Validates the output against a Zod schema.
2. Falls back to deterministic rules on any error, refusal or schema mismatch.
3. Logs an `AIExecution` row with the model, tokens, cost and latency.

The AI can draft, summarise, suggest and flag. It **cannot** approve payments, unlock data, verify sellers or change prices. Those actions require a human or a deterministic rule.

## Security boundaries
- Authentication uses database sessions in an httpOnly, SameSite=Lax, Secure cookie. Sessions rotate on login and are revocable.
- Authorisation runs server-side on every page, action and route:
  - `requireRole` / `requirePermission`
  - ownership checks in the domain functions
  - `notFound()` for resources outside the caller's scope, so their existence does not leak
- The CSP, HSTS and frame-ancestors headers are set in `next.config.ts`.
- Audit logging covers every privileged action and disclosure.
