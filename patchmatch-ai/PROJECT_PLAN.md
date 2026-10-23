# Project Plan: PatchMatch AI

## Product

PatchMatch AI is a two-sided B2B marketplace for custom patches: embroidered, woven, PVC, chenille, leather, printed and similar types.

- **Buyers** are US brands, teams, agencies and businesses. They submit a structured RFQ through an 11-step wizard and receive quotations from vetted manufacturers. Buyers are never charged.
- **Sellers** are verified manufacturers in Pakistan and the US. They browse anonymised, qualified opportunities and pay once to unlock a qualified RFQ: $15 Standard, $20 High intent, $25 Premium, Enterprise priced individually. After unlocking, a seller can see the specification, the original artwork, and the buyer contact details the buyer consented to share. The seller can then quote and message the buyer.
- **Admins** run the review, qualification, matching, verification, finance and dispute queues from the command center.

### Locked monetisation

Pay per qualified RFQ unlock is the only revenue line. The platform has none of the following:

- buyer fees
- commissions
- escrow
- order payments
- mandatory subscriptions

Sellers can pay per unlock or buy optional prepaid credits, which are an invoice that turns into wallet credit. Credits are not a subscription.

## Launch defaults

| Setting | Default | Reason |
|---|---|---|
| RFQ distribution | **Exclusive**: one unlock per RFQ | The buyer-consent workflow for limited shared RFQs is not yet tested. The `limited_shared_rfqs` flag is off. |
| Auto-qualify Tier A | Off | Humans review RFQs until the qualification rules are calibrated. |
| Auto-publish matched opportunities | Off | Admins publish after reviewing the matches. |
| Card payments | Off | No approved Pakistani gateway yet. Manual invoices and credits are used instead. |
| WhatsApp / SMS | Off | Not integrated. |
| AI provider | `rules` (deterministic) | Anthropic can be enabled with `AI_PROVIDER=anthropic`. |
| Admin MFA | Required in production | |

## Milestones

| # | Milestone | Status |
|---|---|---|
| M1 | Scaffold, schema, auth (sessions, TOTP MFA, Google OAuth), RBAC, design system | Done |
| M2 | Public site, SEO pages, 11-step RFQ wizard, secure uploads, buyer portal, guest tracking | Done |
| M3 | Seller onboarding and verification, qualification engine (A–D), matching engine (hard filters + weighted score) | Done |
| M4 | Opportunity marketplace, reservations, paid unlock, payment provider abstraction, webhooks, wallet ledger | Done (gateway blocked; see below) |
| M5 | Quotes (line items, revisions, accept/reject), messaging with contact masking, notifications and email | Done |
| M6 | Admin command center (23+ screens), finance, refunds and disputes, audit log, AI admin assistant | Done |
| M7 | Analytics, financial metrics, forecast simulator, marketing attribution, demo environment | Done (Meta CAPI is status-only) |
| M8 | Unit, integration and E2E tests, hardening, docs | Done |

## Launch phases

1. **Controlled beta (now possible).** A small set of invited, manually verified sellers. Payments run only through **manual invoices that become prepaid credits**, and an admin confirms receipt of the bank transfer. RFQs are exclusive. Admins review every RFQ. The legal pages must be reviewed by counsel before any public traffic.
2. **Gateway launch.** Integrate the approved Pakistani gateway (Safepay, PayFast or Faysal) once merchant approval and API documentation are obtained. Run the payment test matrix against the gateway's sandbox, then enable `card_payments`.
3. **Scale.** Add a shared rate-limit store (Redis/Upstash), a malware scanner, the Meta Conversions API, and WhatsApp/SMS. Consider limited shared RFQs only after the consent workflow has been tested.
