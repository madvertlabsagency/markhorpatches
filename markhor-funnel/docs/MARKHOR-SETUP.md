# Markhor Patches: what to fill in before launch

This folder is a copy of the Custom Patch Lab quote funnel, rebranded for Markhor Patches.
Everything works the same way (form, uploads, PDF, WhatsApp verification, GoHighLevel, Meta
tracking, Funnel Health dashboard). Markhor gets its own accounts: never reuse Custom Patch Lab's
Supabase, Vercel project, GHL sub account, Pixel or keys.

## 1. Business details (one file)
`lib/options.ts`, `BUSINESS`:

| Field | Now | Fill in |
|---|---|---|
| `name`, `nameUpper`, `tagline`, `codePrefix` | Markhor Patches, MKP | done |
| `phoneDisplay`, `phoneTel` | empty | phone shown on the page, thank you page, emails and PDF |
| `email` | empty | public contact email |
| `address` | empty | business address (footer, PDF, legal pages) |
| `trustpilotUrl` | empty | only once real reviews exist |

Empty fields are hidden everywhere, so the page is already safe to show.

## 2. Copy that makes promises
These came from Custom Patch Lab's offer. Keep them only if Markhor offers the same:
free mockup in 24 hours, no minimum order, $0 setup, $0 digitizing, $0 mold fee, unlimited
revisions, free backing and shipping. They are in `app/page.tsx` (announcement bar, hero, trust
cards, FAQ, final banner) and `lib/pdf.ts`.

## 3. Reviews
`REVIEWS` in `app/page.tsx` is empty, so the reviews section is hidden. Add only real customer
reviews. Do not reuse Custom Patch Lab's reviews or rating.

## 4. Address: madvertlabs.com/markhorpatches
The funnel is built with `basePath` `/markhorpatches` (`next.config.mjs`), and the madvertlabs.com
Vercel project (repo `madvertlabsagency/madvert-labs`) forwards `/markhorpatches` to it with a rewrite.

* Funnel Vercel project: name it `markhor-funnel` (so its address is `https://markhor-funnel.vercel.app`),
  Root Directory `markhor-funnel`. On its own domain it answers at `https://markhor-funnel.vercel.app/markhorpatches`.
* If the project gets a different address, set `MARKHOR_FUNNEL_URL` in the **madvertlabs.com** Vercel
  project to it (no trailing slash) and redeploy that project.
* In the funnel project set `NEXT_PUBLIC_SITE_URL=https://madvertlabs.com` (the code adds `/markhorpatches`).
* Owner pages: `https://madvertlabs.com/markhorpatches/admin` and `/markhorpatches/admin/funnel`.
* GHL WhatsApp webhook: `https://madvertlabs.com/markhorpatches/api/whatsapp/inbound?secret=...`
* cron-job.org retry: `https://madvertlabs.com/markhorpatches/api/cron/retry`
* To serve it from the root of its own domain instead, set `NEXT_PUBLIC_BASE_PATH` to an empty value
  and change the cron path in `vercel.json` back to `/api/cron/retry`.

## 5. Accounts and settings
Follow `docs/DEPLOY.md` with Markhor's own:
* Domain, for example `quote.markhorpatches.com` (the docs use this as a placeholder)
* Supabase project (run `supabase/schema.sql`)
* Vercel project with Root Directory `markhor-funnel`
* GoHighLevel sub account, pipeline `Markhor Patches Sales Pipeline` with first stage `New RFQ`
* WhatsApp Business number connected in GHL (`NEXT_PUBLIC_WHATSAPP_NUMBER`)
* Meta Pixel (`NEXT_PUBLIC_META_PIXEL_ID`), Conversions API token, ad account id and system user token
* Email sending domain in GHL (`GHL_EMAIL_FROM`, e.g. `Markhor Patches <quotes@markhorpatches.com>`)

Quote codes look like `MKP-482913`; customers send them on WhatsApp to verify.
