# Deployment Guide

## 0. Quick start: live demo on Vercel (Neon + Vercel Blob)
The demo deployment shows the fictional marketplace with live simulated activity and one-click role accounts.

1. In Vercel → Project → Settings → General, set **Root Directory** to the folder that contains `package.json`. Use `./` if the app is at the repository root, or `patchmatch-ai` inside the markhorpatches repository. The framework is detected from `vercel.json`.
2. Connect **Neon**, which provides `DATABASE_URL` / `DATABASE_URL_UNPOOLED`, and **Vercel Blob**, which provides `BLOB_READ_WRITE_TOKEN`, under Storage. Create the Blob store as **Private**. A public store only works with `BLOB_ACCESS=public`, which is not recommended.
3. Under Settings → Environment Variables (Production), add:
   ```
   APP_SECRET=<openssl rand -base64 48>
   DEMO_MODE=true
   PAYMENTS_PROVIDER=sandbox
   ALLOW_SANDBOX_PAYMENTS=true
   ADMIN_MFA_REQUIRED=false        # demo only, so the shared demo admin can sign in without an authenticator
   SEED_ADMIN_EMAIL=you@yourcompany.com
   SEED_ADMIN_PASSWORD=<strong password>
   NEXT_PUBLIC_SITE_URL=https://<your-project>.vercel.app
   ```
4. Redeploy. The build performs these steps in order:
   1. Applies the migrations.
   2. Runs the production-safe seed.
   3. Seeds the demo, because `DEMO_MODE=true`. This takes under a minute: 20 fictional manufacturers, 12 buyer personas and ~40 PM-DEMO requests, with brand-kit artwork in Blob. An older demo dataset is replaced automatically.
   4. Builds the app.
5. Open `/demo` (or go straight to `/demo/admin`, `/demo/manufacturer`, `/demo/buyer`). As admin, the **Demo control center** (`/admin/demo`) starts/pauses the simulation, sets rates, runs scenarios A–F and resets the demo. Optional: have any external scheduler call `GET /api/cron/demo` every minute with `Authorization: Bearer $CRON_SECRET` to keep activity flowing with no browser open (Hobby crons only run daily).
   Each account's password is shown on that page. While anyone has the site open, the live simulator adds new requests, applications, claims and offers every few seconds. It runs only on demo databases and prunes simulated rows after 6 hours.

**For the real launch**, use a new Neon database, remove `DEMO_MODE`, `ALLOW_SANDBOX_PAYMENTS` and `ADMIN_MFA_REQUIRED`, set `PAYMENTS_PROVIDER=manual`, and redeploy. Demo data never appears in production reporting (`isDemo`).

## 1. Provision
| Need | Recommended | Notes |
|---|---|---|
| App hosting | Vercel (Pro plan for 5-minute crons) or any Node 20+ host | `next start` works anywhere |
| Postgres 15+ | Neon, Vercel Postgres, Supabase, or RDS | Enable point-in-time recovery |
| Object storage | Cloudflare R2 or AWS S3 (private bucket) | Set CORS to allow `PUT` from your site origin |
| Email | Resend or Postmark | Verify the sending domain (SPF, DKIM, DMARC) |
| Payments | **Manual invoices** at launch. Safepay, PayFast or Faysal once approved. | See §6 |

## 2. Environment variables
`.env.example` lists every variable. The production minimum is:

```
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-domain
APP_SECRET=<openssl rand -base64 48>
DATABASE_URL=postgres://…?sslmode=require
SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=<strong, one-time>
PAYMENTS_PROVIDER=manual
STORAGE_DRIVER=s3  S3_BUCKET  S3_REGION  S3_ENDPOINT  S3_ACCESS_KEY_ID  S3_SECRET_ACCESS_KEY
EMAIL_PROVIDER=resend|postmark  EMAIL_FROM  RESEND_API_KEY|POSTMARK_SERVER_TOKEN
CRON_SECRET=<random>
```

The following are optional: `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `NEXT_PUBLIC_GA4_ID` / `GTM_ID` / `META_PIXEL_ID`, `MALWARE_SCANNER`, and `OPS_ALERT_EMAILS=true`.

**Never set these in production:**
- `DEMO_MODE=true`
- `ALLOW_SANDBOX_PAYMENTS=true`
- `ADMIN_MFA_REQUIRED=false`

## 3. Deploy (Vercel)
1. Import the repository and set the **root directory** to `patchmatch-ai`.
2. Add the environment variables to Production (and to Preview, pointing at a separate database).
3. The build command comes from `vercel.json`: `npm run vercel-build`. It runs these steps in order:
   1. `prisma generate`
   2. `prisma migrate deploy`: applies pending migrations and never resets data
   3. `tsx prisma/seed.ts`: idempotent; creates the admin if missing, plus pricing rules, flags and settings
   4. `next build`
4. The crons in `vercel.json` call `/api/cron/jobs` every 5 minutes and `/api/cron/maintenance` hourly. Vercel sends `Authorization: Bearer $CRON_SECRET`. On the Hobby plan, use an external scheduler to call the same URLs with that header.
5. After the first deploy:
   1. Sign in as the seed admin and **enrol MFA**.
   2. Remove `SEED_ADMIN_PASSWORD` from the environment.

### Other hosts
```
npm ci && npx prisma generate && npx prisma migrate deploy && npm run db:seed && npm run build && npm start
# plus a scheduler: */5 * * * * curl -H "Authorization: Bearer $CRON_SECRET" https://host/api/cron/jobs
```

## 4. Smoke test after a deploy
1. `GET /`, `/get-quotes` and `/manufacturers` return 200, and the response headers include a CSP and HSTS.
2. Submit a test RFQ with your own email. Confirm the verification email arrives and the RFQ appears in Admin → RFQ review.
3. Upload a PNG in the wizard. The preview renders and the original URL returns 404/403 without a session.
4. Admin → Settings shows the payment provider, storage, email and scanner status.
5. Remove the test RFQ, or mark it cancelled.

## 5. Backups & disaster recovery
- **Database:** enable the provider's point-in-time recovery, with at least 7 days of retention. Also take a nightly `pg_dump` to separate storage:
  `pg_dump --format=custom --no-owner "$DATABASE_URL" > patchmatch-$(date +%F).dump`
- **Restore drill (quarterly):** restore into a scratch database, run `npx prisma migrate status`, and boot the app against it.
- **Object storage:** enable bucket versioning and a lifecycle policy. Artwork originals are business records; keep them for as long as the privacy policy states.
- **Secrets:** keep `APP_SECRET` in a secret manager. Losing it invalidates sessions and MFA enrolment, though no data is lost.

## 6. Enabling a real payment gateway (when approved)
1. Obtain the merchant account, API credentials, webhook signing secret and the **official API documentation**.
2. Implement `src/lib/services/payments/<provider>.ts` against the `PaymentProvider` interface:
   - `createCheckout`: hosted checkout; never collect card data ourselves
   - `verifyWebhook`: signature and timestamp
   - `parseEvent`: map the provider's statuses to `PAID` / `FAILED` / `REFUNDED`
3. Point the provider's webhook at `/api/webhooks/payments/<provider>`.
4. Run the payment test matrix against the provider's sandbox:
   - success
   - decline
   - 3DS required
   - duplicate webhook
   - delayed webhook
   - amount mismatch
   - refund
5. Set `PAYMENTS_PROVIDER=<provider>`, then turn on the `card_payments` flag in Admin → Settings.

## 7. Rollback
- **App:** in Vercel, use "Instant Rollback" to promote the previous deployment. On other hosts, redeploy the previous git SHA.
- **Migrations are forward-only.** Before a migration that drops or rewrites data:
  1. Take a `pg_dump`.
  2. Ship it as expand → migrate → contract across two deploys, so the previous app version still runs against the new schema.
- If a migration fails mid-deploy, `prisma migrate deploy` leaves it marked as failed. Fix it, then run `prisma migrate resolve --rolled-back <name>` and redeploy.
- **Feature kill-switches:** in Admin → Settings, you can turn off auto-qualify or auto-publish, pause the opportunity marketplace by pausing opportunities, or switch `PAYMENTS_PROVIDER=manual`. None of these need a deploy, except the provider switch, which is an env change plus a redeploy.

## 8. Demo environment
Use a **separate** database and deployment:
```
DEMO_MODE=true PAYMENTS_PROVIDER=sandbox ALLOW_SANDBOX_PAYMENTS=true
npm run db:seed:demo
```
The demo shows a "Fictional demo data" banner everywhere. Its data is `isDemo=true` and never appears in production reporting.

## 9. Running the test suites
```
npm test                                  # unit
TEST_DATABASE_URL=… npm run test:integration   # truncates that DB — never point at production
npm run build && E2E_DATABASE_URL=… npm run test:e2e   # migrates + seeds that DB, starts next on :3100
```
