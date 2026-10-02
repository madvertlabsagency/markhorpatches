# Architecture

## Layers

```
UI (Server Components + small client islands)
  └─ Server Actions / Route Handlers      src/app/actions, src/app/api, src/app/admin/actions.ts
       └─ Domain services                 src/lib/domain   (cart, orders, mockups, proofs, configurations)
            ├─ Pure engines               src/lib/pricing, src/lib/configurator, src/lib/orders/status.ts
            ├─ Event bus                  src/lib/events   (emails + CRM, never throws)
            └─ Adapters                   src/lib/services (payments, storage, email, crm, shipping)
                 └─ Prisma (PostgreSQL)   src/lib/db.ts
```

- **Pure engines** (pricing, rules, delivery, state machine, patch finder) have no I/O and run identically in the browser (live estimates) and on the server (authoritative). They are covered by unit tests.
- **Domain services** contain business rules and are tested against a real database (integration tests). They take explicit context (cart id, owner, actor) instead of reading cookies, so they're testable outside Next.js.
- **Adapters** isolate providers. Swapping Stripe, storage, email or CRM means implementing one interface (`PaymentAdapter`, `StorageAdapter`, `EmailProvider`, `CrmAdapter`).

## Catalog & rule engine
`PatchType` rows define size range, minimum quantity, production days, allowed shapes and compatible backings/borders/extras (join tables). `BorderOption.allowedShapes` adds shape compatibility (e.g. merrowed borders aren't offered for custom shapes). `getCatalog()` loads it all into a serializable `Catalog` (cached with `unstable_cache`, tag `catalog`, invalidated on admin edits). Checkout paths use `getCatalogFresh()` — money is never computed from a stale cache.

`reconcile()` runs after every configurator change and resets only properties that became incompatible, returning a message per reset. `validateConfig()` is the single source of truth for whether a configuration can be ordered; the server re-runs it in `priceConfiguration()`.

## Money
Integer cents everywhere (`…Cents` columns), percentages in basis points. `formatUSD()` is the only formatter. Orders store totals; order items store a unit/total snapshot and a human-readable `specSnapshot`.

## Order lifecycle
`src/lib/orders/status.ts` defines every allowed transition. Key rule: `IN_PRODUCTION` requires all latest proofs approved **and** `paymentStatus = PAID`.

- Checkout path: `PAYMENT_PENDING → PAID → MOCKUP_PENDING → PROOF_READY ⇄ REVISION_REQUESTED → PROOF_APPROVED → IN_PRODUCTION → QUALITY_CHECK → SHIPPED → DELIVERED`
- Free-mockup path: `MOCKUP_PENDING → PROOF_READY ⇄ REVISION_REQUESTED → PROOF_APPROVED → PAYMENT_PENDING → PAID → IN_PRODUCTION → …`

Every transition writes an `OrderStatusEvent` (public or internal), which powers the customer timeline and admin history.

## Proofs
`Proof` is versioned per order item (`@@unique([orderItemId, version])`). New versions supersede un-approved ones; approved ones are `locked` and never modified. `ProofApproval` stores who/when/IP/user agent, the exact confirmation statement and a SHA-256 `contentHash` of file key + version + spec snapshot. Approval/revision only act on the latest version (race-safe via conditional `updateMany` inside a transaction).

## Events
Domain services call `emit(event)`. Handlers send templated emails (idempotent via `EmailEvent.idempotencyKey`) and enqueue CRM events (outbox `CRMEvent`, idempotent key). Handler failures are logged, never propagated.

## Auth & security
- Opaque session tokens (32 random bytes) in an `httpOnly`, `SameSite=Lax`, `Secure` cookie; only the SHA-256 hash is stored. bcrypt (cost 12) for passwords.
- Customer records (orders, artwork) link to a user account only after email verification — registering someone else's email can't expose their orders.
- RBAC: `SUPER_ADMIN, ADMIN, DESIGNER, SUPPORT, FULFILLMENT` mapped to permissions in `src/lib/auth/rbac.ts`. Admin pages call `requireStaff(permission)`; admin actions call `assertStaff(permission)`; every mutation is written to `AuditLog`.
- Guest order access uses an HMAC token bound to the order id (constant-time compare). Upload/download links are HMAC-signed and expire.
- Server Actions get Next.js' built-in origin (CSRF) checks; route handlers that mutate are either signature-verified (Stripe), bearer-protected (cron) or cookie-bound with ownership checks.
- Rate limiting on login, forms, uploads, checkout, coupons and tracking (in-memory fixed window — swap the store for Redis on multi-instance hosting).
- Zod validation on every input; Prisma prevents SQL injection; React escapes output; the Markdown renderer emits React elements only; JSON-LD is `<`-escaped.
- Security headers in `next.config.ts` (HSTS, nosniff, frame options, referrer and permissions policy).

## Rendering & performance
The site layout reads the session/cart cookie, so pages render dynamically; heavy catalog/content queries are cached with tags (`catalog`, `settings`, `gallery`, `reviews`, `content`) and invalidated by admin actions. Fonts are self-hosted via `next/font/local`. Images use `next/image` (AVIF/WebP). Video loads only on play. Motion respects `prefers-reduced-motion`.
