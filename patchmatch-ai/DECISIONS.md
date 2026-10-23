# Decision Log

Each entry lists the decision, the context behind it, and its consequences.

### D1: Monetisation locked to pay-per-qualified-RFQ unlock
The platform charges sellers only, once per unlocked qualified RFQ. Buyers pay nothing, there is no commission or escrow, and the platform never touches order money. Optional prepaid credits are an invoice that becomes wallet credit, not a subscription. The schema still has `Invoice` and `Wallet`, but neither is used for anything else.

### D2: Exclusive RFQs at launch; limited-shared behind a flag
Exclusive distribution keeps buyer contact limited to one seller and is the simplest to reason about. Limited-shared mode (up to 3 sellers) is implemented in the data model and the engine, but the `limited_shared_rfqs` flag is off. Turning it on requires a tested buyer-consent workflow for sharing with multiple sellers.

### D3: Webhook-only payment confirmation
Redirect or return URLs never grant access. Before an unlock is granted, a payment must pass all of these checks:
- a signed, timestamped, deduplicated webhook arrives
- the amount and currency match the payment record
- the payment moves through the state machine to PAID

If the opportunity sold out between reservation and payment, the paid amount is automatically **credited to the seller's wallet**. A card refund would need provider integration, which is unavailable, so credit is used instead.

### D4: Row locking and database constraints for overselling, not application checks alone
`SELECT … FOR UPDATE` on `Opportunity` serialises unlock grants. The CHECK `unlockCount <= maxUnlocks` is a backstop if any code path ever skips the lock. Integration tests cover parallel attempts.

### D5: Payment provider abstraction with honest stubs
The `PaymentProvider` interface has `createCheckout`, `verifyWebhook` and `parseEvent`. The current providers are:
- `sandbox`: a test-only hosted page that sends HMAC-signed webhooks. It is refused in production without an explicit override.
- `manual`: invoices that become credits after an admin confirms the bank transfer.
- `safepay` / `payfast` / `faysal`: stubs that throw `ProviderNotIntegratedError`.

We did not invent endpoints or capabilities for these providers. Real adapters will be written against the merchant documentation once accounts are approved. Stripe and PayPal eligibility for a Pakistani entity is not assumed.

### D6: Postgres job queue instead of Redis
The queue has a single dependency. It uses `FOR UPDATE SKIP LOCKED` and is transactional with business writes, so a job is enqueued only if the business transaction commits. It runs inline after the response, from Vercel Cron every 5 minutes, and from a CLI. It can be replaced behind the same `enqueue` API later.

### D7: Custom DB sessions instead of a third-party auth service
We need server-side revocation, MFA step-up, platform roles combined with organisation roles, and audit hooks. A small, audited implementation (bcrypt, rotated session ids, TOTP per RFC 6238, recovery codes) avoids vendor lock-in. Google OAuth uses the standard authorization-code flow with `state`.

### D8: Deterministic rules first, LLM optional
The qualification, matching, pricing and redaction engines are pure deterministic code and are unit-tested. The AI handles drafting and summarisation and must produce schema-valid output. It falls back to rules on any failure. The AI can never authorise payments, disclose data, verify sellers, or rate sellers.

### D9: Disclosure through a single projection function
Every seller-facing RFQ read goes through `projectRfqForSeller()`. This means a new page cannot leak contact details by selecting the wrong columns. Each unlock records a `DataDisclosureEvent`, so we can answer "who saw this buyer's data".

### D10: Files are never public
Uploads go to private storage. Downloads pass through an authorisation route and then receive a short-lived signed URL. Sellers see blurred, metadata-free teasers before unlocking. Originals are available only after unlocking, or to the owner and admins. AI and EPS formats are rejected because we cannot safely validate or preview them server-side.

### D11: The demo environment is a separate database
Demo data is seeded through the real domain pipeline, so it exercises real code paths. It is flagged `isDemo`, labelled "Fictional" everywhere, and excluded from production metrics. The demo seed refuses to run without `DEMO_MODE=true`. Payments in the demo use the sandbox only.

### D12: Integer minor units for money
All money is stored as integer cents with a currency, and formatting happens at the edge. This avoids floating-point drift in ledgers and reports.

### D13: Vercel Cron frequency
The 5-minute and hourly crons require a paid Vercel plan. On the Hobby plan, the inline `after()` kick and an external scheduler hitting `/api/cron/*` with `CRON_SECRET` provide the same behaviour.
