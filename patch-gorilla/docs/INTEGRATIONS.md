# Integrations

All providers are optional and isolated behind adapters. Missing credentials fall back to safe behavior (mock payments in dev, console email, CRM disabled).

## GoHighLevel (CRM)
Adapter: `src/lib/services/crm/ghl.ts` (LeadConnector API v2, `Version: 2021-07-28`).

| Site event | CRM event type | Opportunity stage env |
|---|---|---|
| Free mockup submitted | `free_mockup_submitted` | `GHL_STAGE_MOCKUP` (falls back to `GHL_STAGE_NEW_LEAD`) |
| Quote submitted | `quote_submitted` | `GHL_STAGE_NEW_LEAD` |
| Configurator/cart abandoned after email captured | `configurator_abandoned` | — |
| Checkout started | `checkout_started` | `GHL_STAGE_NEW_LEAD` |
| Order paid | `order_placed` | `GHL_STAGE_WON` (status `won`) |
| Proof sent | `proof_ready` | `GHL_STAGE_PROOF_READY` |
| Proof approved | `proof_approved` | `GHL_STAGE_APPROVED` |
| Support message | `support_request` | — |

Each delivery upserts the contact (first/last name, email, phone, company, tags `markhor-patches` + event) with custom fields `patch_type, patch_size, quantity, backing, border, estimated_order_value, artwork_url, lead_source, utm_source, utm_medium, utm_campaign, utm_content, current_order_status`. One opportunity per order is created and then moved through stages (its id is stored on `Order.crmOpportunityId`).

Reliability: events are written to the `CRMEvent` outbox with a unique idempotency key (e.g. `proof_ready:<proofId>`), processed by `/api/cron/crm` (or `npm run jobs:crm-retry`), retried with exponential backoff (2m → 6h) and marked `DEAD` after 6 attempts. Every API call is logged to `IntegrationLog` (no secrets). Retry from Admin → Integrations.

## Email lifecycle
| Trigger (domain event) | Template | Subject |
|---|---|---|
| `mockup.submitted` | `mockup_received` | We've got your artwork 👀 |
| `proof.sent` | `proof_ready` | Your Markhor Proof Is Ready |
| `proof.revision_requested` | `revision_received` | We're making the changes. |
| `proof.approved` | `proof_approved` | Approved. Let's make it real. |
| `order.paid` | `payment_confirmation` | Payment received (PG-…) |
| status → `IN_PRODUCTION` | `production_started` | Your patches are in production |
| status → `QUALITY_CHECK` | `quality_check` | Quality check in progress |
| `order.shipped` | `shipped` | Your patches are on the move. |
| status → `DELIVERED` | `delivered` + `review_request` | Delivered / How did your patches turn out? |
| `configurator.abandoned` (consent only) | `abandoned_cart` | Your patch design is saved |
| registration / reset | `verify_email`, `password_reset` | — |

Internal alerts (`ops_new_lead`) go to `OPS_NOTIFICATION_EMAIL` for new mockups, revisions and support messages.

## Analytics
`src/lib/analytics.ts` — provider-neutral `track()` that pushes to `window.dataLayer` (GTM/GA4), `gtag` and PostHog if present. Events: `view_product, start_configurator, select_patch_type, upload_artwork, select_size, select_quantity, complete_configurator, request_mockup, add_to_cart, begin_checkout, purchase, open_whatsapp, submit_support, view_proof, approve_proof, request_revision`. First-touch UTM parameters persist 30 days in the `pg_utm` cookie and are attached to leads, orders and CRM fields. Add your GTM/GA/PostHog snippet in `src/app/layout.tsx` (respect your consent requirements).

## Shipping & tax
`src/lib/services/shipping` — flat-rate standard/expedited with a free-shipping threshold (Site settings → `shipping`), carrier tracking URL builders (UPS, USPS, FedEx, DHL), and tax modes `none | flat_by_state | stripe`. Replace `shippingRates()` with a carrier API (Shippo/EasyPost) without touching checkout.
