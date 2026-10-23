# Feature Acceptance Checklist

✅ = verified by an automated test that was run and passed on 2026-10-23. ☑️ = implemented and checked manually/visually or by typecheck/build only. ⛔ = blocked externally.

## Buyer
| Requirement | Status | Evidence |
|---|---|---|
| Buyer-first homepage: "Your Patch. Your Specs. The Right Manufacturer.", "Get Free Patch Quotes", "How PatchMatch Works", trust benefits | ✅ | `e2e/public.spec.ts`, `e2e-demo/demo-journey.spec.ts` |
| Buyer Protection & Privacy, Compare Quotes, FAQ pages | ✅ | `e2e/public.spec.ts` (render, no client errors) |
| 11-step wizard incl. buying stage and privacy | ✅ | `e2e/rfq-wizard.spec.ts` |
| Privacy default A; B/C need separate explicit consent | ✅ | wizard E2E + `trust-and-demo.test.ts` |
| Marketing consent separate and unchecked | ✅ | wizard E2E |
| Intent question (ready / later / found a supplier) recorded with timestamp | ✅ | `trust-and-demo.test.ts` |
| Reminders 24h / 72h, stop on close, opt-out | ✅ | `trust-and-demo.test.ts` |
| Compare, request revision, select, decline quotes | ☑️ | QuoteActions UI; select covered by scenario A/D in demo E2E |
| Project status tracker | ☑️ | Scenario A creates a project; tracker visible on request page |

## Manufacturer
| Requirement | Status | Evidence |
|---|---|---|
| Anonymised preview; no PII before unlock | ✅ | `e2e/unlock.spec.ts`, integration |
| Preview shows verification, intent timestamp, buying stage, artwork, slots, price; policy before checkout | ☑️ | `BuyerReadiness.tsx` on the opportunity page |
| Exclusive RFQ cannot be sold twice | ✅ | integration concurrency test, scenario E |
| Shared RFQ max 3 (configurable), only with buyer consent | ✅ | integration |
| Cannot message before unlock; cannot see another maker's buyer details | ✅ | `trust-and-demo.test.ts` |
| Contact masking in chat per privacy choice | ✅ | `trust-and-demo.test.ts` (A, B before/after sharing) |
| Pilot prices $10 / $12.50 / $15 | ✅ | unit + integration (intent upgrade 1000 → 1250) |
| Quality claim within configurable 7-day window | ✅ | `trust-and-demo.test.ts` |
| Weekly capacity limit | ☑️ | `assertSpendingLimits` |
| Badges: Not Verified / Under Review / Identity Verified / Capability Reviewed | ☑️ | admin seller-verification page |

## Admin
| Requirement | Status | Evidence |
|---|---|---|
| Settings: shared limit, intent expiry, reminders, claim window, capacity, waitlist | ☑️ | admin Settings form |
| Demo control center: start/pause, rates & presets, generate buyer/manufacturer/quote, simulate unlock/reply/no response/claim/order, seed 10/50, reset (confirmed), full reset ("RESET" + confirm) | ✅ | demo E2E (scenario A, generate, pause/start); every action smoke-tested via `scripts/demo-smoke.ts` |
| Scenarios A–F | ✅ | `scripts/demo-smoke.ts` run: all OK |
| Persona switching `/demo/buyer`, `/demo/manufacturer`, `/demo/admin` | ✅ | demo E2E |

## Demo isolation
| Requirement | Status | Evidence |
|---|---|---|
| Banner "DEMO MODE — SIMULATED ACTIVITY" on every page | ✅ | demo E2E |
| PM-DEMO-#### IDs, example.com emails, 555-01xx phones, fictional companies | ✅ | demo E2E (ref match); seed |
| No real email in demo / for synthetic addresses | ✅ | `trust-and-demo.test.ts`; smoke run queued 0 email jobs |
| Demo tools refuse outside DEMO_MODE | ✅ | `trust-and-demo.test.ts` |
| Demo metrics labelled "SIMULATED DEMO METRICS — NOT ACTUAL BUSINESS PERFORMANCE" | ✅ | demo E2E |

## Blocked
| Item | Status |
|---|---|
| Live card payments (Safepay / PayFast / Faysal) | ⛔ merchant approval + API docs |
| SMS / WhatsApp phone verification | ⛔ provider account |
| Legal review of policies | ⛔ counsel |
