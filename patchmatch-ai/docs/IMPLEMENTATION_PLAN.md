# Implementation Plan — Master MVP Upgrade

Executed in this order; each step was typechecked before moving on. Status is the state at the end of this upgrade.

| # | Work package | Key files | Status |
|---|---|---|---|
| 1 | Schema: intent, buying stage, privacy B, message kinds, quote inclusions/revisions, badges, projects | `prisma/schema.prisma`, migration `20261023223627_buyer_trust_messaging` | Done |
| 2 | Pilot pricing $10 / $12.50 / $15 and tier rules | `src/lib/pricing/engine.ts`, `src/lib/rfq/tiers.ts`, `prisma/seed.ts` | Done |
| 3 | Marketplace settings (shared limit, intent expiry, reminders, claim window, weekly capacity, waitlist) | `src/lib/settings.ts`, admin Settings page | Done |
| 4 | 11-step wizard with buying stage and privacy A/B/C | `src/lib/rfq/schema.ts`, `src/components/rfq/RfqWizard.tsx` | Done |
| 5 | Intent confirmation, privacy change, reminder opt-out, contact sharing (signed links + dashboard) | `src/lib/domain/engagement.ts`, `src/app/actions/intent.ts`, `/rfq/intent` | Done |
| 6 | Seller preview: readiness, intent timestamp, artwork, slots, price; quality policy before checkout | `BuyerReadiness.tsx`, `OpportunityCard.tsx` | Done |
| 7 | Messaging: 3-pane inbox, quick actions, proofs, quote cards, report, masking per consent | `Inbox.tsx`, `Composer.tsx`, `ConversationTools.tsx`, `lib/domain/messages.ts` | Done |
| 8 | Quotes: inclusions/exclusions, revision request, select → project, decline | `lib/domain/quotes.ts`, `QuoteBuilder.tsx`, `QuoteActions.tsx` | Done |
| 9 | Automations: reminders, intent expiry, unclaimed nudges | `jobs/handlers.ts`, `api/cron/maintenance` | Done |
| 10 | Manufacturer badges and admin controls | `VerificationBadge.tsx`, `admin/actions.ts` | Done |
| 11 | Project/order status foundation | `lib/domain/projects.ts`, `ProjectTracker.tsx` | Done |
| 12 | Buyer-first public site: hero, Buyer Protection, Compare Quotes, FAQ | `app/(site)/page.tsx`, `buyer-protection`, `compare-quotes`, `faq` | Done |
| 13 | Demo system v2: baseline (20 makers, 12 personas, ~40 PM-DEMO RFQs), engine, scenarios A–F, control center, persona routes, cron heartbeat, isolation | `src/lib/demo/*`, `app/admin/demo`, `app/(site)/demo/[role]`, `api/cron/demo`, `prisma/seed-demo.ts` | Done |
| 14 | Tests: integration (privacy, messaging, intent/pricing, reminders, claim window, demo isolation), E2E wizard, demo acceptance journey | `tests/integration/trust-and-demo.test.ts`, `e2e/`, `e2e-demo/` | Done |
| 15 | Deploy: push branch, subtree-push to the patchmatch repo, verify Vercel status | — | See IMPLEMENTATION_PROGRESS.md |

## Demo isolation design
- `DEMO_MODE=true` is the only switch (environment variable; never inferred). Every demo mutation calls `assertDemo()`.
- `queueEmail` returns early in demo mode and for reserved addresses (`example.com`, `.test`, `.invalid`, …). No SMS provider is wired.
- Demo unlocks use demo wallet credits through the real ledger; no payment provider is called.
- All demo rows carry `isDemo=true`; simulator rows also `simulated=true`. Production reporting filters `isDemo=false`; demo analytics are only shown at `/admin/analytics?demo=1` under the "SIMULATED DEMO METRICS — NOT ACTUAL BUSINESS PERFORMANCE" label.
- Demo pipelines run inline (`inline: true`) so background workers never process the same RFQ concurrently.
