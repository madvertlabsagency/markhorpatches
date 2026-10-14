# Deployment

## Option A — Vercel + managed Postgres (recommended)
1. Create a Postgres database (Neon, Supabase, RDS, Railway…). Use a pooled connection string for `DATABASE_URL`.
2. Import the repo in Vercel, set **Root Directory** to `patch-gorilla`.
3. Add environment variables from `.env.example` (at minimum `DATABASE_URL`, `APP_SECRET`, `NEXT_PUBLIC_SITE_URL`, Stripe, S3, email, `CRON_SECRET`).
4. Build command: `npm run build` (runs `prisma generate`). Run migrations on deploy: add `npx prisma migrate deploy &&` before the build command, or run it from CI.
5. First deploy only: `npm run db:seed` from your machine against the production `DATABASE_URL` (creates catalog, settings and the super admin; it never overwrites edits on later runs).
6. `vercel.json` schedules the cron jobs once a day each (CRM retry, abandoned carts, cleanup) so it works on the Vercel Hobby plan; on Pro you can tighten CRM to `*/10 * * * *` and abandoned carts to hourly. Vercel sends `Authorization: Bearer $CRON_SECRET` automatically.
7. Point the Stripe webhook to `https://YOUR_DOMAIN/api/webhooks/stripe`.

## Option B — Any Node host (Docker, Render, Fly, a VM)
```bash
npm ci
npx prisma migrate deploy
npm run build
NODE_ENV=production npm start -- -p 3000
```
Schedule the cron endpoints with any scheduler:
```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/crm
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/abandoned-carts
curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://YOUR_DOMAIN/api/cron/cleanup
```
Running more than one instance? Move the rate limiter store (`src/lib/rate-limit.ts`) to Redis/Upstash and use S3 storage (the local driver is single-machine only).

## Production checklist
- `NODE_ENV=production`, `PAYMENTS_PROVIDER=stripe` (mock payments are refused in production).
- `STORAGE_DRIVER=s3` with a private bucket and PUT-only CORS for your domain.
- Strong `APP_SECRET` (48+ random bytes). Rotating it invalidates signed links (upload links, guest order links, reset/verify emails).
- HTTPS everywhere (session cookies are `Secure` in production).
- Verified email sender domain (SPF/DKIM).
- Remove sample reviews and placeholder gallery items; replace placeholder imagery.
- Review legal templates with counsel.
- Back up the database (point-in-time recovery recommended).

## CI
`.github/workflows/patch-gorilla-ci.yml` runs lint, typecheck, unit tests, DB integration tests (Postgres service), a production build and the Playwright E2E suite.
