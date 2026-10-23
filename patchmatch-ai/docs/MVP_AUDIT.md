# PatchMatch MVP Audit

Audit of the existing MVP against the "Final Master MVP Upgrade & Live Demo" brief, done before the upgrade (2026-10-23). The rule applied throughout was **preserve and extend, don't rebuild**.

## What already existed and was kept
| Area | State before upgrade | Decision |
|---|---|---|
| Stack | Next.js 16 App Router, Prisma 7 + Postgres, Tailwind v4, zod, Vitest, Playwright | Kept |
| Auth & RBAC | Email/password, DB sessions, TOTP MFA, platform + org roles, server-side checks | Kept |
| RFQ pipeline | Wizard → email verification → qualification (tier A–D) → matching (hard filters + score) → publication | Extended (intent, buying stage, privacy, tiers) |
| Paid unlock | Reservations, signed sandbox webhooks, credits, append-only ledger, exclusive anti-oversell | Kept; weekly capacity check added |
| Quotes & messaging | Itemised quotes, per-RFQ conversations, contact masking | Extended (revisions, proofs, 3-pane inbox) |
| Disputes / claims | Quality claims, admin decisions, credit/refund in the ledger | Window made configurable |
| Admin | Command center, review queues, verification, payments, pricing, settings, audit log | Extended (marketplace settings, badges, demo control) |
| Brand | Brand-kit palette, Poppins/Inter, embroidered emblem, real patch photography | Kept and not overwritten |
| Demo | Seeded fictional marketplace + live simulator | Rebuilt as demo system v2 (below) |

## Gaps found vs. the brief
| Gap | Severity | Resolution |
|---|---|---|
| Pricing at $15/$20/$25 | High (spec) | Pilot $10 / $12.50 / $15, admin-editable; untouched legacy rules migrated by seed |
| No buyer intent / buying stage | High | `intentStatus`, `intentConfirmedAt`, `buyingStage`; 3-answer confirmation question |
| Contact verification, intent and RFQ quality merged into one score | Medium | Kept as three separate states; tier computed from all three (`src/lib/rfq/tiers.ts`) |
| Only "full contact" or "messaging only" | High | Privacy A/B/C, default A, separate explicit consent for B/C |
| Shared RFQs flag-only, no buyer consent flow | High | Buyer opt-in (max 3, configurable), consent recorded, landing-page leads always exclusive |
| Messaging was a single list | Medium | 3-pane inbox, search, unread, quick actions, proofs, quote cards, report, contact sharing per consent |
| No reminders / follow-up automation | Medium | Buyer reminders (24h, 72h), seller reminder (24h), stop on close, opt-out |
| No manufacturer badge levels | Medium | Not Verified / Under Review / Identity Verified / Capability Reviewed — evidence-based, admin-set |
| No project/order tracking | Low | `Project` + `ProjectEvent`; buyer-only steps for proof approval and delivery |
| Homepage seller-first copy | Medium | Buyer-first hero, Buyer Protection, Compare Quotes and FAQ pages |
| Demo: no control panel, no scenarios, wrong labels, non-reserved emails | High | Demo system v2 |

## Risks still open (not fixable in code)
- Real payment gateway: Safepay / PayFast / Faysal need merchant approval and API docs. Sandbox only.
- Legal pages are drafts pending counsel review; compliance is **not** claimed complete.
- SMS/WhatsApp verification needs a provider; phone verification is a stored state only.
- Malware scanning needs a scanner service.
- Vercel Hobby crons run daily only; reminders and the demo heartbeat need an external per-minute scheduler for timely delivery (endpoints exist).
