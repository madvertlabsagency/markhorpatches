# Markhor Patches

**Custom patches for brands that don’t follow the herd.** A production-grade custom-patch e-commerce platform: marketing site, interactive patch configurator with a server-authoritative pricing engine, artwork uploads, free-mockup flow, cart & Stripe checkout, versioned proof approval, customer accounts, order tracking, a full admin console, GoHighLevel CRM sync and an event-driven email lifecycle.

| | |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Server Components, Server Actions), TypeScript |
| Styling / motion | Tailwind CSS v4 (design tokens in `src/app/globals.css`), Motion (`motion/react`) |
| Data | PostgreSQL + Prisma 7 (driver adapter `@prisma/adapter-pg`) |
| Payments | Stripe Checkout (hosted — no card data touches the server); mock provider for dev/CI |
| Storage | S3-compatible (AWS S3, Cloudflare R2, MinIO, B2) via signed URLs; local driver for dev |
| Email | Resend / Postmark / console adapters, 13 branded templates |
| CRM | GoHighLevel (LeadConnector v2) adapter with an idempotent outbox + retry queue |
| Tests | Vitest (unit + DB integration), Playwright (E2E, desktop + mobile) |

More detail: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md) · [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

---

## Quick start

Requirements: Node 20.9+ (22 recommended), PostgreSQL 14+.

```bash
cd patch-gorilla
cp .env.example .env            # then edit DATABASE_URL, APP_SECRET, SEED_ADMIN_*
npm install
npx prisma migrate deploy       # create tables
npm run db:seed                 # catalog, demo prices, FAQs, articles, settings, super admin
npm run dev                     # http://localhost:3000
```

Sign in at `/login` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` → you land in `/admin`.

Out of the box everything runs locally with **no third-party accounts**: payments use the mock provider (`/checkout/mock-pay`), files go to `./.uploads`, emails are logged to the console and CRM sync is disabled.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` · `npm run typecheck` | ESLint (incl. React Compiler rules) · `tsc --noEmit` |
| `npm test` | Unit tests (pricing engine, sizes, compatibility, discounts, totals, delivery, order state machine, patch finder, upload validation, tokens, RBAC, email templates) |
| `npm run test:integration` | DB integration tests against `TEST_DATABASE_URL` (configurator→cart, mockup, checkout, proof approval, revisions) |
| `npm run test:e2e` | Playwright E2E against a production build (`npm run build` first) |
| `npm run db:migrate` | Create a new migration in development |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:seed` | Idempotent seed — safe to re-run, never overwrites admin edits |
| `npm run jobs:crm-retry` | Process the CRM retry queue from the CLI |

---

## Project map

```
prisma/              schema.prisma, migrations, seed.ts (+ seed-catalog.ts, seed-content.ts)
public/brand/        Official logos (supplied files, background removed — never redrawn)
public/placeholders/ Placeholder imagery cropped from the supplied brand mockups — replace before launch
src/app/(site)/      Public site, configurator, cart/checkout, order page, account, auth
src/app/admin/       Admin console (role-protected)
src/app/api/         Uploads, storage, Stripe webhook, cron jobs, search, artwork download
src/app/actions/     Server actions (cart, checkout, proofs, auth, account, leads)
src/components/      brand/ (logo, PatchArt, hand-drawn marks) · ui/ · motion/ · layout/ · home/ · product/ · configurator/ · cart/ · proof/ · admin/ …
src/lib/pricing/     Pure pricing engine (integer cents)
src/lib/configurator Rule engine, delivery estimates, input schemas
src/lib/domain/      Cart, orders, mockups, proofs, configurations (business logic)
src/lib/services/    Adapters: payments, storage, email, crm, shipping
src/lib/events/      Domain events → email + CRM side effects
tests/               unit/ and integration/
e2e/                 Playwright specs
```

---

## How to…

### Edit pricing
**Admin → Pricing & options** (`/admin/pricing`). Changes are live immediately — no deploy.

- **Price matrix:** unit price (USD/patch) for every *patch type × size tier × quantity tier*. Empty cell = that combination is unavailable.
- **Tiers:** add or deactivate size tiers (max inches) and quantity tiers (min quantity).
- **CSV:** *Export CSV* downloads the full matrix; *Import* accepts `patch_type_code,size_max_in,min_quantity,unit_price_usd[,active]`. The whole file is validated before anything is written.
- **Option modifiers:** each backing, border and extra (including rush) is a modifier: `$ per patch`, `$ fixed per line`, or `% of base unit price`.

Pricing formula (in `src/lib/pricing/engine.ts`, unit-tested):
`base unit price` + per-patch modifiers (incl. %) → × quantity → + fixed charges → − discount → + shipping → + tax. Quoted size = (width + height) / 2. All money is integer cents. **The server recomputes every total before checkout** — client prices are never trusted.

> The seeded prices are **demo market pricing** (3" anchors from the brief, other sizes/tiers extrapolated). Verify production economics before launch. This note is shown only in the admin.

### Add or change patch types
**Admin → Patch types** (`/admin/products`). *Add a patch type* creates it hidden with a matching product page. Then set:
- min/max size, minimum quantity, production & rush days, allowed shapes;
- compatible backings, borders (none = molded edge; the border step disappears) and extras;
- prices in the pricing matrix; then tick **Active**.

The configurator reads all of this from the database through the rule engine (`src/lib/configurator/rules.ts`) — there are no hard-coded compatibility rules in components. When a customer switches type, only incompatible selections are reset, with a message explaining why.

### Edit homepage content
- **Guarantee copy, 24-hour mockup promise, manufacturing statement:** Admin → Site settings → `promises`.
- **Homepage video:** Site settings → `home` (`videoUrl`, poster, title). With no URL, the section shows the still image only — the site never fakes a video.
- **Trust metrics (hero numbers):** Site settings → `trustMetrics` — hidden unless enabled *and* filled with real numbers.
- **Homepage FAQs:** Admin → Content → tick *Show on homepage*.
- **Gallery & reviews sections:** Admin → Gallery (*Featured*) and Admin → Reviews (*Published*).
- Section copy/layout lives in `src/app/(site)/page.tsx` and `src/components/home/*`.

### Replace images and videos
- **Logos:** `public/brand/` holds the official Markhor Patches assets, processed only for format (never redrawn or stretched):
  - `markhor-emblem*.png` — circular emblem with horns (supplied transparent PNG, trimmed) → nav lockup, hero, brand story, CTA, OG image, emails.
  - `markhor-badge*.png` — full badge with wordmark + tagline (white background removed by edge flood-fill, so the white letters stay intact) → footer, 404, invoice, schema logo.
  - `markhor-icon-*.png`, `/favicon.ico`, `markhor-icon-maskable-512.png` — from the supplied app icon (corners masked) → favicon, apple-touch, PWA.
  - The navigation lockup is the official emblem + a typeset "MARKHOR / PATCHES" wordmark (`src/components/brand/Logo.tsx`). If you produce an official horizontal lockup file, swap it in there.
  - Every placement keeps the asset's intrinsic aspect ratio (`h-auto` + `object-contain`), so the circle can never distort or be cropped.
- **Placeholders:** `public/placeholders/*` were cropped from the original supplied mockups (hero patch cutouts `cut-*.webp`, gallery `sample-*.webp`, video poster `macro-patches.webp`) and are labeled *“Sample — replace”*. Swap them for real photography (keep filenames, or update URLs in Admin → Gallery).
- **Patch type card images:** Admin → Patch types → *Card image URL*. Until set, a designed SVG illustration (`PatchArt`) is used.
- **Product page hero/gallery/video:** Admin → Patch types → product page section.
- Remote image hosts must be allowed in `next.config.ts → images.remotePatterns`.

### Configure Stripe
1. `PAYMENTS_PROVIDER=stripe`, `STRIPE_SECRET_KEY=sk_live_…`.
2. Create a webhook endpoint `https://YOUR_DOMAIN/api/webhooks/stripe` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
3. Enable Apple Pay / Google Pay in the Stripe dashboard (they appear automatically in Checkout; register your domain for Apple Pay).
4. Optional: Stripe Tax (`STRIPE_AUTOMATIC_TAX=true`, settings → tax `mode: "stripe"`).
5. List the accepted methods for the footer in Site settings → `payments.displayedMethods`.

Webhooks are signature-verified, de-duplicated (`ProcessedWebhook`) and amount-checked before an order is marked paid. Local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

### Configure object storage
`STORAGE_DRIVER=s3` + `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (and `S3_ENDPOINT` + `S3_FORCE_PATH_STYLE` for R2/MinIO). Keep the bucket **private** and add a CORS rule allowing `PUT` from your domain:

```json
[{ "AllowedOrigins": ["https://YOUR_DOMAIN"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["Content-Type"], "MaxAgeSeconds": 3000 }]
```

Uploads go straight from the browser to storage via short-lived signed URLs; the server then verifies size and magic bytes before accepting the file. Downloads use short-lived signed URLs. SVG/AI/EPS are never served inline. Upload limit: Site settings → `uploads.maxUploadMb`.

### Configure email
`EMAIL_PROVIDER=resend` + `RESEND_API_KEY`, or `EMAIL_PROVIDER=postmark` + `POSTMARK_SERVER_TOKEN`; set `EMAIL_FROM` (a verified sender) and optionally `EMAIL_REPLY_TO` and `OPS_NOTIFICATION_EMAIL` (internal alerts for new mockups, revisions and support messages). Preview every template at **Admin → Integrations → Email templates**. Templates: `src/lib/services/email/templates.ts`. Each email is sent at most once per idempotency key and logged in `EmailEvent`.

### Configure GoHighLevel
Set `GHL_API_KEY` (Private Integration token with contacts + opportunities scopes), `GHL_LOCATION_ID`, and optionally `GHL_PIPELINE_ID` plus `GHL_STAGE_*` stage IDs. Create these **custom fields** in GHL (keys must match): `patch_type, patch_size, quantity, backing, border, estimated_order_value, artwork_url, lead_source, utm_source, utm_medium, utm_campaign, utm_content, current_order_status`. Schedule the retry worker (`/api/cron/crm`, see Deployment). Monitor and retry at **Admin → Integrations**. If GHL is down, the site keeps working; events retry with exponential backoff and dead-letter after 6 attempts. Full event list in [`docs/INTEGRATIONS.md`](docs/INTEGRATIONS.md).

### Configure WhatsApp
Admin → Site settings → `brand.whatsappNumber` — digits only in international format (e.g. `15551234567`). Empty = the floating button is hidden (no fake numbers, ever). `NEXT_PUBLIC_WHATSAPP_NUMBER` is only a fallback. Inside the configurator, the WhatsApp message is prefilled with the current patch type, size, quantity, backing and estimate.

### Manage proofs
1. Orders needing a proof appear in **Admin → Proofs** (oldest first) and on the dashboard.
2. Open the order. For free-mockup orders, a designer can **edit the production spec** first (re-priced by the same engine; incompatible options are rejected).
3. Upload a PNG/JPG/PDF under *New proof version*, add designer notes, and send. The customer gets “Your Markhor Proof Is Ready”.
4. The customer approves (with the required confirmation statement) or requests a revision (with optional new artwork). Every version is kept (V1, V2…); older un-approved versions become *superseded*.
5. Approval records customer, version, timestamp, IP/user agent and a SHA-256 hash of the file key + spec. **Approved proofs are locked** and can't be overwritten.
6. Production is blocked by the order state machine until every item has an approved proof **and** the order is paid. Unpaid mockup orders move to *Awaiting payment* after approval; the customer pays from their order page.

### Deploy
See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) (Vercel or any Node host + managed Postgres, migrations, cron, checklist).

---

## Rebrand notes (Patch Gorilla → Markhor Patches)
- Customer-facing brand, logos, icons, OG image, emails, structured data and copy are Markhor Patches. Routes, database schema, pricing, configurator, checkout, proofs, auth, uploads and the GHL integration are unchanged.
- **Existing databases:** run `npm run db:rebrand` once after deploying. It updates stored copy (settings, product pages, FAQs, articles) and removes old placeholder gallery rows. It's idempotent and never touches orders, customers, payments or proofs. Then `npx prisma migrate deploy` applies the small `authorName` default change.
- **GHL:** contacts are now tagged `markhor-patches` (was `patch-gorilla`) with source `markhorpatches.com`. Update any GHL automations keyed on the old tag.
- The project folder (`patch-gorilla/`), local database names and CI workflow file keep their original names on purpose. They're internal only, and renaming them would break existing paths, deploy settings and connection strings.
- Brand tokens (`src/app/globals.css`) were sampled from the emblem: Markhor Navy `#081A36`, Cobalt `#0A4AD6`, Electric `#0A74F5`, Glacier Cyan `#0AD2F7`, Midnight `#050B18`. Signature gradient: `#0A2A6B → #0A6CF2 → #0AD2F7`.
- Brand devices (`src/components/brand/marks.tsx`): `HornMark` (paired horn strokes), `MountainContours` (topographic line art), `HornDivider`, `SummitTrail` (ascending process path), plus brush underline, arrows and sticker labels. Use them sparingly.

## Honesty rules baked in
- No fabricated reviews, customer counts, ratings, certifications or “Made in USA” claims. Seeded sample reviews and gallery images are visibly labeled and flagged in the admin dashboard until removed.
- `AggregateRating` structured data is emitted only from real, published, non-sample reviews.
- The 24-hour mockup promise only appears when enabled in settings.
- The manufacturing statement is admin-editable and defaults to transparent wording.

## Before launch checklist
- [ ] Replace placeholder images and remove sample reviews (dashboard warns until done)
- [ ] Verify all prices and option modifiers
- [ ] Configure Stripe (live keys + webhook), storage (S3/R2), email, GHL
- [ ] Set support email, WhatsApp number, socials and payment badges in settings
- [ ] Have legal pages reviewed (they ship as clearly marked templates)
- [ ] Set `CRON_SECRET` and schedule the cron endpoints
- [ ] Set a strong `APP_SECRET` (rotating it invalidates outstanding signed links)
