# Security Checklist

Legend: ✅ implemented and tested · ☑️ implemented, not covered by automated tests · ⚠️ open or partial · ⛔ blocked on an external dependency

## Authentication & sessions
- ✅ Passwords use bcrypt. Login failures are generic, and a dummy hash comparison equalises timing for unknown emails.
- ✅ DB-backed sessions sit in an httpOnly, SameSite=Lax cookie that is Secure in production. Sessions are revocable and expire.
- ✅ TOTP MFA follows RFC 6238. The secret is AES-256-GCM encrypted and the hashed recovery codes are single-use.
- ☑️ Admin MFA is enforced in production (`ADMIN_MFA_REQUIRED` defaults to true). The E2E run disables it explicitly.
- ☑️ Password reset and email verification tokens are single-use, time-limited and stored hashed.
- ☑️ Google OAuth uses the authorization-code flow with a signed, expiring `state`.
- ⚠️ Rate limiting covers login, forms, uploads and tracking, but it is **in-memory per instance**. Before running more than one instance, move it to Redis or Upstash.
- ⚠️ No CAPTCHA on public forms. The rate limit plus email verification is the only bot gate.

## Authorisation
- ✅ Every portal page, server action and API route checks the role and permission server-side. Platform roles are combined with RoleGrant rows and organisation roles.
- ✅ Resources outside the caller's scope return 404. E2E tests cover an outsider seller, another buyer, a seller opening admin pages, and anonymous users opening admin pages.
- ✅ Guest RFQ tracking requires a secret token, which is compared against a sha256 hash in constant time. E2E-tested.
- ✅ The AI cannot authorise payments, unlock data, verify sellers or change prices. These operations have no AI code path.

## Buyer data protection
- ✅ The locked seller view is produced by `projectRfqForSeller()`, and free text is redacted. An E2E test checks that the locked page HTML contains none of the buyer's name, company, phone or postal code.
- ✅ Contact details are released only after a verified unlock and only within the buyer's consent. A `DataDisclosureEvent` is recorded.
- ✅ In messaging-only mode, emails, phone numbers, URLs and handles typed into messages are masked. Integration-tested.
- ✅ Original artwork is never public. Downloads go through `/api/files/[id]`, which authorises the request before redirecting. The teaser is blurred and its metadata stripped.
- ✅ Contact-sharing consent is required to sell an RFQ. Marketing consent is separate and **unchecked by default**.
- ✅ No RFQ is sold without consent, and an exclusive RFQ is never sold twice. Both are integration-tested, including concurrency.

## Payments
- ✅ Payment initiation is never treated as confirmation. Only a verified webhook moves a payment to PAID.
- ✅ Webhook signatures are HMAC-SHA256 with a timestamp tolerance of 300 seconds and a constant-time compare. A forged webhook is rejected (integration and E2E tests).
- ✅ Duplicate webhooks are ignored via `WebhookEvent`. Replay is integration-tested.
- ✅ An amount or currency mismatch grants no access. The payment is marked DISPUTED and appears in the admin failed-payments queue. Integration-tested.
- ✅ No raw card numbers are stored anywhere. Checkout is hosted by the provider.
- ✅ Wallet balances cannot go negative (CHECK constraint plus a conditional decrement).
- ✅ Sandbox payments are refused in production unless `ALLOW_SANDBOX_PAYMENTS=true` is set explicitly.
- ⛔ Real gateways (Safepay, PayFast, Faysal) are not integrated and need merchant approval and API docs. Card payments are disabled.

## Files
- ✅ Uploads are checked against size and type allow-lists, then magic bytes are verified server-side. SVGs are checked for scripts, event handlers and external references. sha256 is stored. AI and EPS files are rejected.
- ✅ Previews are re-encoded with sharp, which strips EXIF and other metadata.
- ⚠️ **No malware scanner is configured.** Files are recorded with scan status `UNSUPPORTED`. Configure ClamAV or a cloud scanner before opening seller document uploads to the public.
- ⚠️ `STORAGE_DRIVER=local` logs a warning in production. S3 or R2 must be configured.

## Web
- ✅ Security headers are set: CSP, HSTS (preload), X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy and COOP. An E2E test checks them.
- ⚠️ The CSP allows `'unsafe-inline'` for scripts, for Next.js inline bootstrap and the optional analytics tags. Nonce-based CSP is a hardening follow-up.
- ✅ Server Actions use Next.js built-in origin checks. Mutating API routes verify signatures or a bearer secret (cron) or require a session.
- ✅ Cron endpoints require `CRON_SECRET`. E2E-tested.
- ✅ Every input is validated with Zod and every query goes through Prisma. Raw SQL is parameterised: tagged templates are used only for locking and the queue.

## Audit & privacy
- ✅ `AuditLog` records privileged actions, verification decisions, refunds, credits, flag changes and disclosures.
- ✅ `AIExecution` records every AI call: model, tokens, cost and fallback.
- ☑️ Analytics and ad tags (GA4, GTM, Meta Pixel) load only when configured **and** after the visitor opts in through the cookie banner. Nothing loads before consent.
- ⚠️ Data-subject requests (export and delete) are handled manually by an admin. There is no self-service flow yet.
- ⚠️ **Legal pages (terms, privacy, seller agreement, acceptable use, refund policy) are drafts and need review by counsel.** Compliance is **not** claimed to be complete.

## Operations
- ⚠️ No external error tracking (Sentry or similar) is wired in. Errors go to platform logs.
- ⚠️ No automated dependency or secret scanning in CI. Enable GitHub Dependabot and secret scanning.
- ☑️ Backups depend on the managed Postgres provider. See DEPLOYMENT_GUIDE.md.
- ☑️ `APP_SECRET` rotation invalidates sessions and MFA secrets. Plan rotation together with MFA re-enrolment.
