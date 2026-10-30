# EPCF custom patch funnel

Fast landing page and configurator for EPCF (Excellence Punch Custom Factory, ep-cf.com), built for paid ads.
It asks the same questions as the configurators on ep-cf.com/products/category/2, for all 17 patch types,
with EP-CF's own options, images and price tiers, and shows a live estimate on every tap. It ends with the
contact step (name, business name, email, WhatsApp number) and the same lead pipeline as the Markhor funnel.

Next.js (App Router, TypeScript) on Vercel, Supabase, WhatsApp Cloud API, Meta Pixel plus Conversions API,
Cloudflare Turnstile, optional GoHighLevel sync.

## Ad links
- `/` landing page with the patch type grid
- `/?p=<slug>` opens a patch type straight away, for example `/?p=pvc-patches` or `/?p=embroidered-patches`.
  Slugs are in `lib/catalog.json`. Browser Back closes the configurator.

## Flow
1. Visitor picks a patch type, then answers that type's questions. Single choice steps advance on tap.
2. Price per piece and estimated total update live (`lib/catalog.ts`, same formula as ep-cf.com).
3. Artwork uploads go straight to a private Supabase bucket through signed URLs, or "send it later".
4. Submit: rate limit, Turnstile, zod validation, every answer checked against the catalog and the estimate
   recalculated on the server (`lib/order.ts`), then saved to `quote_requests` with `product_slug`,
   `answers` and `estimate`.
5. Thank you page asks the customer to verify on WhatsApp (quote code prefix `EPC`).
6. Owner works leads on `/admin`; funnel numbers by step are on the funnel dashboard.

## Docs
- `docs/EPCF-CATALOG.md`: where the patch data comes from and how to refresh prices
- `docs/DEPLOY.md`: Vercel, Supabase, Meta, Turnstile and email setup
- `docs/WHATSAPP-AUTOMATION.md`, `docs/GHL-WORKFLOWS.md`, `docs/FUNNEL-ANALYTICS.md`
- `supabase/schema.sql`: run once in Supabase (safe to re-run, it adds the new columns)
- `.env.example`: every environment variable

## Commands
```
npm install
npm run dev
npm test
npm run lint
npm run build
```
