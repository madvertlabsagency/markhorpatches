# Production Readiness

## Verdict
**Ready for a controlled, invite-only beta that uses manual invoice-to-credit payments, once the pre-launch gates below are closed.**

**Not ready for public launch with card payments.** Card payments depend on an approved payment gateway, which does not exist yet.

The critical paths (RFQ intake, qualification, matching, anonymised marketplace, paid unlock, disclosure control, quotes and messaging) are implemented and covered by unit, integration and browser tests, and all of those tests pass on the latest run.

## Critical test evidence (latest run)
| Suite | Result |
|---|---|
| Typecheck / lint / production build | Clean / clean / succeeds |
| Unit (engines, redaction, crypto, TOTP, forecast) | 43/43 passed |
| Integration (real Postgres): end-to-end flow, failed→successful payment, forged webhook, amount mismatch, idempotent replay, 12 concurrent unlock attempts with no oversell, sold-out credit-back, unverified seller blocked, insufficient credits, messaging-only masking, dispute credit ledger | 7/7 passed |
| E2E (Playwright, desktop + mobile): public pages and headers, full guest RFQ with upload, locked page leaks no PII, declined card stays locked, paid card unlocks, quote reaches buyer, cross-tenant 404s, admin 403, guest-token tracking, file/webhook/cron rejection | 10/10 passed |

## Pre-launch gates (controlled beta)
- [ ] **Legal review** of the terms, privacy policy, seller terms, data-sharing policy and RFQ quality policy. The current pages are drafts, and compliance is not claimed.
- [ ] Production Postgres with point-in-time recovery, plus a completed restore drill.
- [ ] S3 or R2 private bucket with CORS (`STORAGE_DRIVER=s3`).
- [ ] Email provider with a verified domain (SPF, DKIM, DMARC).
- [ ] `APP_SECRET` and `CRON_SECRET` generated and stored in a secret manager. Admin MFA enrolled. `SEED_ADMIN_PASSWORD` removed.
- [ ] `PAYMENTS_PROVIDER=manual`, with bank-transfer details entered in Admin → Settings and an admin process for confirming receipts.
- [ ] Single app instance, or move the rate limiter to Redis or Upstash first.
- [ ] Sellers onboarded and verified manually. Seller document uploads should be limited to invited sellers until a malware scanner is configured.
- [ ] Error tracking (for example Sentry) and uptime monitoring on `/` and `/api/cron/jobs`.

## Gates for public launch with card payments
- [ ] Gateway merchant approval: Safepay, PayFast or Faysal.
- [ ] Gateway adapter implemented from the official docs and run through the payment test matrix in the gateway sandbox (DEPLOYMENT_GUIDE §6).
- [ ] Malware scanning on all uploads.
- [ ] Nonce-based CSP, removing script `'unsafe-inline'`.
- [ ] CAPTCHA or bot protection on public RFQ and registration forms.
- [ ] Self-service data export and deletion, or a documented SLA for manual requests.
- [ ] Load test of the unlock path and the job queue at the expected peak.

## Credentials needed
| Credential | Purpose | Required for |
|---|---|---|
| Postgres connection string | Database | Beta |
| S3/R2 bucket + access keys | Artwork and document storage | Beta |
| Resend API key or Postmark token + verified domain | Verification, notifications | Beta |
| `APP_SECRET`, `CRON_SECRET` | Signing, encryption, cron auth | Beta |
| Bank account details for invoices | Manual credit purchases | Beta |
| Safepay / PayFast / Faysal merchant credentials + webhook secret | Card payments | Card launch |
| Anthropic API key | Optional LLM drafting and summaries (`AI_PROVIDER=anthropic`) | Optional |
| Google OAuth client ID/secret | "Continue with Google" | Optional |
| GA4 / GTM / Meta Pixel IDs, Meta CAPI token | Marketing measurement (consent-gated) | Optional |
| Malware scanner endpoint or key | Upload scanning | Before public uploads |
| WhatsApp Business / SMS provider | Additional notification channels | Later |

## Remaining security issues
See SECURITY_CHECKLIST.md. In summary:
- in-memory rate limiting
- no malware scanner
- CSP allows inline scripts
- no CAPTCHA
- no external error tracking
- manual data-subject requests
- draft legal pages
