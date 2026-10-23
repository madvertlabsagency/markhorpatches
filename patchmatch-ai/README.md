# PatchMatch AI

A B2B marketplace for custom patches. US buyers submit a request for quotation (RFQ). The platform verifies the RFQ, qualifies it and matches it to vetted manufacturers in Pakistan and the US. Sellers pay a one-time fee to unlock a qualified RFQ.

**Monetisation is locked to pay-per-qualified-RFQ-unlock.** The platform takes no buyer fees, commissions or escrow, has no mandatory subscriptions, and never processes order payments.

## Quick start (local)

```bash
cp .env.example .env            # fill APP_SECRET (≥32 chars), DATABASE_URL, SEED_ADMIN_*
npm install
npx prisma migrate deploy && npx prisma generate
npm run db:seed                 # production-safe: admin, pricing rules, feature flags
npm run dev                     # http://localhost:3000
```

To load the fictional demo environment, use a separate database:

```bash
DEMO_MODE=true DATABASE_URL=postgres://…/patchmatch_demo npm run db:seed:demo
DEMO_MODE=true DATABASE_URL=postgres://…/patchmatch_demo npm run dev
# sign in as demo-admin@patchmatch.demo / buyer1@… / seller1@…  (password DemoPass!2026)
```

## Checks

| Command | What it runs |
|---|---|
| `npx tsc --noEmit` | Type check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests: engines and security helpers |
| `npm run test:integration` | Critical-flow tests against a real Postgres (`TEST_DATABASE_URL`) |
| `npm run test:e2e` | Playwright browser tests. Run `npm run build` first. Set `PW_CHROMIUM_PATH` if browsers are preinstalled. |
| `npm run build` | Production build |

## Documentation

- [PROJECT_PLAN.md](PROJECT_PLAN.md): scope, milestones and launch phases
- [ARCHITECTURE.md](ARCHITECTURE.md): system design and the critical flows
- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md): entities, constraints and invariants
- [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md): tokens, components and charts
- [IMPLEMENTATION_PROGRESS.md](IMPLEMENTATION_PROGRESS.md): what is done, partial or blocked
- [DECISIONS.md](DECISIONS.md): architecture decision log
- [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md): controls and open issues
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md): environment variables, deploy, backups and rollback
- [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md): go/no-go assessment
