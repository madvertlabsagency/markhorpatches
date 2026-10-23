# Implementation Progress

Status as of 2026-10-23. "Tested" means an automated test exercises the feature and that test was run and passed.

## Fully implemented
| Area | What exists | Automated coverage |
|---|---|---|
| Public site | Home, how-it-works, get-quotes, patch types and category SEO pages, manufacturers, become-a-seller, seller pricing, verification, policies, blog, help, contact, sitemap/robots, cookie-consent-gated analytics | E2E: 14 pages render without client errors, mobile overflow check, security headers |
| RFQ wizard | 11 steps, server-saved drafts, artwork upload, consent (contact sharing required; marketing separate and unchecked), guest email verification, confirmation, private tracking link | E2E: full guest submission with upload |
| Auth | Email/password, email verification, reset, DB sessions, TOTP MFA with recovery codes, admin MFA enforcement, Google OAuth (code flow) | Unit: TOTP, password, signing/encryption. E2E: login and role redirects |
| RBAC | Platform roles combined with RoleGrant and organisation roles; server-side checks everywhere; 404 outside scope | E2E: outsider seller, other buyer, seller→admin 403, anonymous→login |
| Qualification | Completeness, intent and fraud scores → tier A–D + pricing tier; human review queue | Unit |
| Matching | Hard filters + weighted score (25/20/20/15/10/5/5), versioned config, exclusion reasons, admin override | Unit + integration |
| Pricing | Pilot $10 Standard Verified / $12.50 Contact-Ready / $15 Premium Production-Ready / Enterprise, admin-editable, price history; unsold listings reprice when the tier changes | Unit + integration |
| Buyer trust | Buying stage, intent confirmation, privacy A/B/C with separate consent, buyer-selected contact sharing, reminders with opt-out, Buyer Protection / Compare Quotes / FAQ pages | Integration + E2E |
| Projects | Selection starts a project; status tracker; buyer-only proof approval and delivery | Demo scenario A |
| Opportunity marketplace | Anonymised cards, blurred teasers, 15-minute reservations, exclusive default | E2E: locked page contains no buyer PII |
| Paid unlock | Reserve → hosted checkout → signed webhook → grant; credits path; automatic credit-back if sold out | Integration: happy path, failed→success, forged webhook, mismatch, replay, concurrency (no oversell), credit-back, insufficient credits, unverified seller. E2E: declined card stays locked, paid card unlocks |
| Wallet & finance | Append-only ledger, invoices → credits (manual provider), refunds/credits, disputes, receipts | Integration: dispute credit hits the ledger |
| Quotes | Line items, MOQ/lead time/shipping, revisions, accept/reject/clarify, buyer comparison | E2E: seller quote ($495.00) reaches the buyer |
| Messaging | 3-pane inbox, search, unread, quick actions, proofs, quote cards, report, contact masking per privacy choice | Integration: masking A/B, no messaging before unlock |
| Notifications | In-app + email (templates), dedupe, admin alerts, jobs-backed delivery | Indirect (integration) |
| Admin command center | KPIs, queues, RFQ review, matching, sellers and verification, opportunities, payments, refunds, disputes, pricing, matching config, AI usage (analytics), audit log, marketing, financials, forecast simulator, settings/flags, inbox, AI assistant | Typecheck/build; access via E2E |
| AI service | Provider-agnostic tasks with Zod schemas, deterministic fallback, execution and cost logging; Anthropic adapter | Unit (rules path) |
| Background jobs | Postgres queue, retries, dead letters, cron + inline + CLI | Integration (indirect) |
| Files | Signed uploads, magic-byte/SVG validation, sha256, metadata-free previews, teasers, authorised download proxy | E2E: upload; unauthenticated file 404 |
| Analytics | Funnel events, attribution, ad spend, CPL, cost per sold RFQ, contribution, forecast simulator | Unit: forecast |
| Demo environment | `db:seed:demo`: 20 manufacturers, 12 buyer personas, ~40 PM-DEMO RFQs; Demo control center (`/admin/demo`) with scenarios A–F, rates, seed, reset; persona routes `/demo/{buyer,manufacturer,admin}` | E2E demo acceptance journey; every control smoke-tested |

## Partially implemented
| Item | State |
|---|---|
| Limited shared RFQs | Buyer-consent workflow built and tested (max 3, configurable). **Flag off in production** until the policy is approved; on in demo. |
| Phone verification | Stored state only; needs an SMS provider. |
| Meta Conversions API | Configuration status only; no server-side event sending. |
| Anthropic AI adapter | Implemented. **Not exercised against the live API**: no key in this environment, so the default is `rules`. |
| Resend/Postmark, S3/R2, Google OAuth | Adapters implemented. **Not exercised against the live services**: no credentials here. |
| Data-subject requests | Admin-handled manually; no self-service export or delete. |
| Seller reviews | Model and constraints exist (rating 1–5, one per RFQ+seller). **No review collection UI yet.** Seller ratings show "No reviews yet" rather than invented scores. |

## Blocked (external)
| Item | Blocker |
|---|---|
| Card / wallet payments | Safepay, PayFast or Faysal merchant approval and API docs. Stubs throw `ProviderNotIntegratedError`. Stripe/PayPal eligibility not assumed. |
| Malware scanning | Needs a scanner service (ClamAV or a cloud scanner). |
| WhatsApp / SMS | Needs WhatsApp Business API / SMS provider accounts. Flags off. |
| Legal pages | Drafts; need review by counsel. |

## Test results (latest run, 2026-10-23)
- `tsc --noEmit`: clean
- `eslint .`: clean
- Unit (vitest): **43/43 passed**
- Integration (vitest + Postgres): **19/19 passed**
- E2E (Playwright, Chromium, desktop + mobile): **10/10 passed**
- E2E demo acceptance journey (`npm run test:e2e:demo`, DEMO_MODE=true): **1/1 passed**
- `next build`: succeeds
