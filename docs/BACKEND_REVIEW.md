# Senior Backend Review — Kartriq

> Honest architecture / database / flow / security audit by a senior backend engineer
> Date: 2026-05-04
> Scope: backend only (frontend & mobile reviewed separately)
> Prior work: the 20 audit fixes already shipped in commits `8370558` and `6f6643c`

This document is a **production-readiness review** beyond the bug audits. It covers architecture, schema design, operational readiness, security posture, and code hygiene — the things that don't show up as bugs but will hurt later.

---

## TL;DR

Kartriq is **architecturally well-organised for its size** (clean route/service split, multi-tenancy enforced via middleware, pluggable channel adapters, plan-based limit middleware). The recent payment + autopay work is now reasonably bug-free.

But it is **not yet production-grade** for a SaaS handling real money. The biggest gaps are:

1. **No queue / no background job durability** — webhooks, autopay, channel sync run in-process. Backend restart = lost work.
2. **No structured logging / metrics / error tracking** — when something breaks at 3am you have `console.log` in a terminal.
3. **No retry / circuit breaker / timeout** on outbound API calls — one slow Razorpay or Amazon = wedged event loop.
4. **Tenant isolation is enforced at app layer only** — one missing `where: { tenantId }` = cross-tenant leak. PG RLS or query middleware would be defence-in-depth.
5. **Schema lives as a JS string** in `schema.sql.js` with an ad-hoc `migrations` array — hard to review, fragile, no rollback. A real migration tool is overdue.
6. **No automated tests for payment flows** — the e2e runner exists but doesn't cover Razorpay/autopay.
7. **No CI** — every push could break main and you wouldn't know.

None of these are show-stoppers for a beta. All of them are show-stoppers for "we charge real money and have customers".

---

## 1. Architecture

### What's good

- **Clean layering** — routes / services / utils / jobs / middleware. Most files have one job.
- **Multi-tenancy via middleware** — `req.tenant`, `req.user`, `req.permissions` populated once and consumed everywhere.
- **Channel adapter pattern** — `getAdapter(channel)` factory + per-channel files. Adding a new channel is mechanical.
- **Plan-based gating in middleware** — `enforceLimit('orders')` at route level, no leakage of plan logic into business code.
- **Wallet abstraction** — overage debits go through a single `wallet.debit()` path with row-level locking.
- **Razorpay seam** — `payment.service.js` hides SDK details, supports stub mode for dev.

### What needs work

| Concern | Why it matters | Suggested fix |
|---|---|---|
| **No queue** for webhooks / autopay / channel sync | Webhook arrives during a deploy = lost. Cron job retry = manual. | Add BullMQ or similar (Redis-backed). Webhook handler enqueues, ACKs in <50ms; worker processes. |
| **No service layer** for orders/products/customers | Business logic lives in 200-line route handlers. Hard to unit-test, hard to share between routes/cron. | Extract `order.service.js` etc. — routes become thin controllers. |
| **No caching layer** | Every request hits DB; plan/permissions/catalog reads are repeated work. | Redis (`get/set` with TTLs); start with permissions cache (already in-process — just promote to Redis for multi-instance). |
| **Single-instance assumption** | `CRON_LEADER=true` env flag is a bandaid for ensuring only one node runs cron. Not safe under restart races. | Distributed lock via Redis SETNX or DB advisory lock (`SELECT GET_LOCK('cron-orders', 0)`). |
| **The "prisma" shim** | Clever — Knex behind a Prisma-like API — but locks you out of real Prisma's relations, transaction batching, type safety. Future feature work fights the shim. | Two paths: (a) commit to Prisma proper, run `npx prisma db pull` and migrate; (b) stop pretending to be Prisma and call it `db.js` with Knex APIs. The current half-state is technical debt accruing interest. |
| **Channels: 119 adapters loaded eagerly at boot** | Every route + cron startup loads every adapter file. Memory + startup time scales linearly. | Lazy-load by type via dynamic `require()` inside `getAdapter()` switch. |
| **No API versioning beyond `/v1` prefix** | When you ship v2 you have no story. | Mount `/v2` routes alongside; deprecate `/v1` with a sunset header. |
| **No rate limit per tenant** | Global limiter means a noisy tenant can hit the cap and starve others. | Key the limiter by `req.tenant.id` not just IP. |
| **No graceful shutdown** | SIGTERM kills in-flight requests. | `server.close()` + drain knex pool + finalize in-flight jobs. |

---

## 2. Database

### What's good

- **Foreign keys present** with appropriate ON DELETE behaviour.
- **`tenantId` indexes** on every multi-tenant table.
- **AES-256-GCM encryption** for stored channel credentials.
- **Recent unique constraints** on `wallet_transactions(tenantId, paymentRef)` and `tenant_payment_methods(tenantId, providerTokenId)` (Round 1 fix).
- **`utf8mb4`** charset throughout — supports emoji + full Unicode.
- **`json_valid()` CHECK** on JSON columns — at least the JSON is well-formed.

### What needs work

| Concern | Why it matters | Suggested fix |
|---|---|---|
| **Schema is a JS string** in `backend/src/config/schema.sql.js` | Hard to review in PRs (one giant string), no diff hygiene, no rollback. | Move to `backend/migrations/*.sql` with Knex Migrations or Atlas. Each migration tracked in `_migrations` table. |
| **`migrations` array in `initDb.js`** | Idempotent only because each entry checks `information_schema` first. Not a real migration system — you can't roll back, can't replay history, can't detect skipped migrations. | Same — switch to Knex Migrations. |
| **No row-level security (RLS)** | Tenant isolation is 100% app-layer. One missed `where: { tenantId }` and it's a P0 cross-tenant leak. | Either: (a) move to PG and use RLS; (b) add a Knex middleware that auto-injects `tenantId` based on a `db.withTenant(id)` helper. Today's reliance on manual filtering is a footgun. |
| **No retention policy** on `audit_logs`, `wallet_transactions`, `usage_meters` | These grow forever. At 1k tenants × 10 events/day = 3.6M rows/year on `audit_logs` alone. | Partition by `createdAt` (monthly), or a nightly job that archives rows > 365 days to S3. |
| **No partitioning** on `orders` | Becomes a problem around 50M rows. | RANGE partition on `createdAt` once you cross ~10M. |
| **`channels.credentials` is `longtext` JSON** | Single field stores wildly different shapes per channel type. Plus side: flexible. Minus: no schema. | OK for now — but make sure the encryption check + redaction is bulletproof (see security #2). |
| **No soft delete** | `DELETE FROM customers WHERE id = ?` cascades and is gone forever. Customers calling support saying "I deleted by mistake" = unrecoverable. | Add `deletedAt` to user-facing entities (orders, customers, invoices, products). Routes filter `WHERE deletedAt IS NULL`. |
| **Database connection pool defaults** | Knex defaults are min 2, max 10. At any real load you'll hit pool starvation. | Tune via env; production min ~5, max ~25 for a single instance. |
| **No DB backup story documented** | If the host disappears, data is gone. | Daily automated pg_dump (or mysqldump) to S3 with 30-day retention; tested restore quarterly. |
| **MySQL not PostgreSQL** | MySQL works but PG has better JSON, RLS, partial indexes, listen/notify, advisory locks. For a SaaS this size moving early is cheap; later it's a project. | Migrate now while you're <100 tenants. After 1000 it's a 6-month project. |
| **`UNIQUE pm_provider_token_unique (tenantId, providerTokenId)` retrofit** | Migration de-dupes existing duplicates by deleting the higher `id`. If duplicates have different `lastUsedAt` etc., the chosen survivor may not be the right one. | Cosmetic — flag in the runbook so the operator can sanity-check post-migration. |

---

## 3. Flow / Operational

### What's good

- **Auto-audit middleware** logs every authenticated mutation (excellent for forensics).
- **Express error handler** at end of chain catches uncaught exceptions.
- **Stub-mode fallbacks** in payment.service let dev work without Razorpay.
- **Idempotent webhook handlers** (Round 1 fix).

### What needs work

| Concern | Why it matters | Suggested fix |
|---|---|---|
| **No structured logging** | `console.log('[cron]', x, y)` is everywhere. Searching logs for "what happened to tenant abc on day X" is grep + tears. | Pino with `level`, `traceId`, `tenantId`, `userId` keys. Pipe to JSON stdout, ship to Loki/Datadog/whatever. |
| **No request ID / trace propagation** | Distributed trace impossible. Two webhook deliveries ↔ which one credited? | Express middleware sets `req.id = uuidv7()`; included in every log line; returned as `x-request-id` header. |
| **No timeouts on outbound axios** | Razorpay or Amazon hanging = your event loop hangs. Confirmed: `_base.js`'s `bearerClient`/`basicClient` have no `timeout`. | `axios.create({ timeout: 10_000 })` everywhere. Per-call override for slow endpoints. |
| **No retry policy** on transient failures | Razorpay 503 = autopay row marked failed forever. | Exponential backoff with jitter on 5xx + connection errors. `axios-retry` handles this. |
| **No circuit breaker** | One slow third-party API can starve all your workers. | `opossum` library; trip after N failures, half-open after cooldown. |
| **Webhook ack-then-process pattern not used** | Razorpay webhook waits for full DB processing before getting 200. Slow DB = Razorpay retries + duplicate processing. | Receive → enqueue → 200 in <50ms → worker processes from queue. |
| **Cron jobs run in-process** | Backend OOM = cron cycle skipped, no visibility, no retry. | Move to BullMQ/Inngest/a separate worker process. |
| **No health endpoints beyond `/health`** | Kubernetes-style deployments need separate `/live` (process up) and `/ready` (DB reachable + migrations applied). | Add `/ready` that pings DB + checks migration version. |
| **No metrics endpoint** | Can't graph p99 latency, error rates, queue depth. | Prom-client; `GET /metrics`. |
| **No error tracking** | Errors disappear into stdout. | Sentry. 5 min to install, lifetime of value. |
| **No graceful shutdown** | Deploy = SIGTERM = in-flight requests dropped. | `server.close()` + wait for connections to drain (with timeout). |
| **No deploy strategy / runbook documented** | How do you roll back? How do you rotate JWT_SECRET? Who's on call? | A `RUNBOOK.md` with deploy steps, common fix recipes, escalation. |
| **`enforceLimit` does N+1 queries** on every create | Each metric is a separate `count()` query. At 10 metrics × 100 req/s = 1000 count queries/s. | Cache counts in `usage_meters` table (already exists), only count at meter rollover. |

---

## 4. Security

### What's good

- Helmet enabled.
- Rate limiting on auth + payment endpoints (Round 2 fix).
- AES-256-GCM credential encryption.
- HMAC webhook signature verification with raw body + timing-safe compare (Round 2 fix).
- Multi-tenant isolation enforced.

### What needs work

| Concern | Severity | Notes |
|---|---|---|
| **Frontend XSS surface unaudited** | HIGH | Backend audits don't cover the React app. Look for `dangerouslySetInnerHTML`, unsafe `innerHTML`, unsanitised user input rendered as HTML. |
| **OAuth `renderPage()` HTML-injects raw error strings** | MEDIUM | Documented as deferred in `SECURITY_FIXES.md`. Need to wrap error strings with HTML escape. ~10 min fix. |
| **No CSP headers** beyond Helmet defaults | MEDIUM | Strict CSP with nonces would harden against any future XSS. |
| **JWT with no revocation** | MEDIUM | Logout clears in-process cache only. Stolen JWT works for 7 days. Add a `token_blacklist` table or move to short-lived access + refresh tokens. |
| **No 2FA for platform admins** | MEDIUM | Most-privileged role secured by a single password. |
| **No password reset flow visible** | MEDIUM | Confirm what happens if a user forgets their password. |
| **Email verification not enforced** | MEDIUM | `users.emailVerified` column exists but I didn't see any route gate on it. New tenant can use the system without proving email ownership. |
| **No 2FA on Razorpay test-config** | LOW | Platform-admin endpoint that swaps payment gateway creds — should require step-up auth. |
| **Channel credentials masked at API but not at log** | LOW | If `console.error(err)` ever gets a Razorpay/Amazon error with the body in it (bypassing `safeErrLog`), creds leak. Audit all `console.error` paths for `err.config`. |
| **No `npm audit` in CI** | LOW | Vulnerabilities in deps go unnoticed. Run `npm audit --audit-level=moderate` weekly. |
| **No security.txt / vuln disclosure** | LOW | When researchers find issues, where do they report? |
| **No SCA / Dependabot** | LOW | Wire Dependabot to PR weekly dep bumps. |
| **No DELETE-my-account / GDPR data export** | MEDIUM (regulatory) | Required if you serve EU customers. |
| **No CSRF protection** | n/a | JWT in localStorage, not cookies — no CSRF surface. Just don't move to cookies without adding it. |

---

## 5. Code quality / Testing

### What's good

- Vanilla Node E2E test runner at `backend/src/scripts/test.js` — covers auth, multi-tenant isolation, and core CRUD. **Better than nothing, often better than half-broken Jest setups.**
- Most routes follow the same shape (find/create/update/delete + permission gate).
- CLAUDE.md exists and is genuinely useful for context.

### What needs work

| Concern | Why it matters | Fix |
|---|---|---|
| **No tests for payment flows** | Razorpay checkout, verify, webhook, autopay, plan auto-renew — all untested | Add e2e cases to `test.js` that mock the Razorpay SDK |
| **No tests for autopay job** | The `failureCount` backoff, `customerId` skip, candidate selection — untested | Unit-test `findCandidates()` + `chargeOne()` with fixtures |
| **No CI** | Tests don't run on push. Lint doesn't run. Type errors slip in. | GitHub Actions: `npm run test:backend`, `npm run lint`, `npm run build` (frontend) on every PR |
| **No ESLint config** | Style drift, dead code, `console.log` left behind — nothing flags it | Install `eslint` with `eslint:recommended` + `no-console` warning. |
| **No Prettier config** | Whitespace wars in PRs | Install `prettier`, enforce in pre-commit. |
| **No TypeScript on backend** | The 119 channel adapters return `any` — refactoring is dangerous | Long-term: migrate. Short-term: add JSDoc types on hot-path services. |
| **Routes are 200+ lines** | `payment.routes.js` is now ~400 lines. Hard to review, hard to test. | Extract handlers into `routes/payment/checkout.handler.js` etc. |
| **`backend/src/scripts/test.js` is one giant file** | Adding tests = scrolling 500+ lines | Split into `tests/{auth,billing,channels,payments}.test.js`; runner walks the dir |

---

## 6. The 119 channel adapters

This is its own conversation. None of those adapters have been:

- Tested against real seller credentials
- Audited for security (each one calls a third-party API with creds — mistakes are exfiltration vectors)
- Validated against the platforms' real API shapes (most were written from API docs / training-data knowledge)

Treat the 119 as a **roadmap document**, not as 119 working integrations. Mark them clearly in the UI (`comingSoon: true` for the 113 untested ones is correct — keep that). The 6 with confirmed sandbox testing are the ones you can ship.

---

## Action plan — what's pending, prioritized

### P0 — must-do before paying customers

1. **Test the Razorpay flow with a real test account** end-to-end. The 10-scenario plan in `docs/SECURITY_FIXES.md` is your checklist.
2. **Add timeouts** on every outbound axios call — one hung HTTP request can kill the server.
3. **Add structured logging** (Pino) with request ID + tenant ID. Without this you can't debug production.
4. **Add Sentry** (or any error tracker). Free tier is fine. 5 min to install.
5. **Set up CI** that runs the existing `test.js` on every PR. Even just GitHub Actions with one job.
6. **Document a deploy / rollback runbook**. Even one page is enough.
7. **Database backup strategy** — daily automated dump to S3, tested restore.
8. **Fix the deferred OAuth `renderPage` XSS** (Round 2 deferred item).
9. **Webhook ack-then-process** for Razorpay — receive, enqueue, 200 in <50ms.

### P1 — within 1 month

10. **Extract a real service layer** for `orders`, `products`, `customers` so logic isn't trapped in route handlers.
11. **Move schema to a real migration tool** (Knex Migrations or Atlas). Stop maintaining the `migrations` array.
12. **Add metrics endpoint** (`/metrics` Prometheus format).
13. **Write tests for payment flows** — checkout, verify, webhook idempotency, autopay, plan auto-renew.
14. **Per-tenant rate limiting** so noisy tenants can't starve others.
15. **Email verification gate** on routes that mutate.
16. **Add `axios-retry` + circuit breakers** for outbound channel APIs.
17. **Frontend security audit** (dangerouslySetInnerHTML, CSP, localStorage exposure).
18. **`npm audit` + Dependabot** in CI.

### P2 — within 3 months

19. **Move webhooks/autopay/channel sync to a queue** (BullMQ).
20. **Distributed cron lock** (Redis SETNX or DB advisory lock) instead of `CRON_LEADER`.
21. **JWT revocation** via blacklist or short-lived access + refresh.
22. **2FA for platform admins**.
23. **Soft delete** on user-facing tables.
24. **DELETE-my-account / GDPR data export endpoints**.
25. **Audit log retention policy** (archive >365d to S3).
26. **Switch to Postgres** while still small. RLS for tenant isolation; partial indexes for `isDefault=1` partial uniques.

### P3 — within 6 months

27. **Lazy-load channel adapters** by type to cut startup memory.
28. **TypeScript on backend** (or at least JSDoc types on services).
29. **Extract real per-feature service layer** for the rest of the codebase.
30. **Decide the `prisma` shim's future** — commit to real Prisma or rename to `db`.
31. **Database partitioning** on `orders` and `audit_logs` once they grow.

### P-deferred (already documented, low risk)
- JWT short-lived access + refresh model
- Webhook reconciliation by `payment.order_id` instead of trusting `notes.tenantId`
- Move to Postgres for RLS

---

## What I'm NOT recommending you do

- **Don't rewrite the channel adapters from scratch** — incrementally smoke-test the 6 most-used ones (Amazon, Flipkart, Shopify, Razorpay, Shiprocket, Delhivery). Leave the rest as roadmap.
- **Don't add Kubernetes** unless you actually need horizontal scale. A single VM + Postgres + Redis covers thousands of tenants.
- **Don't switch from MySQL to Postgres in a panic** — it's worth doing eventually but not before the P0 list is done.
- **Don't add tracing (OpenTelemetry) yet** — wait until you have multiple services. Logging + metrics first.

---

## Risk summary

| Risk | Likelihood | Impact | Status |
|---|---|---|---|
| Webhook lost during deploy → uncredited payment | HIGH (every deploy) | MEDIUM | Mitigated by Razorpay's retry, but no queue means we depend on retries |
| Cross-tenant data leak | LOW | CRITICAL | App-layer enforcement only; one missing where clause = breach |
| Payment endpoint outage from hung HTTP | MEDIUM | HIGH | No timeouts on axios — fix is 1 line per file |
| Lost data from missing backups | LOW | CRITICAL | Need backup story documented |
| Customer says "I didn't pay for this" | MEDIUM | MEDIUM | Auto-audit covers it but no easy report |
| Slow channel API stalls all syncs | HIGH | MEDIUM | Sequential cron — one slow tenant = everyone late |
| Forgotten password / 2FA bypass | MEDIUM | MEDIUM | Reset flow not audited; no 2FA |
| Vuln in `axios` / `razorpay` package | MEDIUM | HIGH | No `npm audit` in CI |

---

## Bottom line

You have a **solid foundation** for a SaaS at this stage. The architecture is good, the tenant isolation is real (just not defence-in-depth), the payment plumbing now works correctly, and the codebase is readable.

To go from "it works" to "we charge real money and have customers", the biggest wins by effort:

| Effort | Impact | Item |
|---|---|---|
| **30 min** | HIGH | Add Sentry, structured logging, axios timeouts |
| **2 hours** | HIGH | Set up CI with the existing test runner |
| **1 day** | HIGH | Run the Razorpay test plan + fix anything that breaks |
| **2 days** | MEDIUM | Extract service layer for orders/products/customers |
| **1 week** | HIGH | Move webhook + autopay + cron to a queue |

Skip the migrations to Postgres / TypeScript / queue / RLS until those quick wins are in. They unblock you on day-2 ops; the bigger items unblock you on scale.

If you want me to start on the P0 list, pick any item and I'll execute. The Sentry + Pino + axios timeouts trio is probably the highest-leverage 30-minute commit you can ship.

---

# Scalability Analysis

How far can the current system go before it breaks? Honest numbers based on the current architecture (single Node.js + MySQL, no queue, no cache, no horizontal scaling).

## Current ceiling per dimension

| Resource | Comfortable | Strained | Will fail |
|---|---:|---:|---:|
| **Tenants (active)** | up to ~500 | 500 – 2,000 | 2,000+ |
| **Concurrent connected users** | up to 200 | 200 – 500 | 500+ (Node single-threaded saturates) |
| **Orders/day across all tenants** | 50,000 | 50,000 – 200,000 | 200,000+ |
| **Channel sync (per cron run)** | 100 channels in 5 min | 100 – 500 channels | 500+ (sync is sequential) |
| **Webhook events/min** | 200/min | 200 – 600/min | 600+/min (rate limit + sync handling) |
| **DB connections** | 10 default pool | tune to 25 | 50+ saturates default MySQL config |
| **Audit log writes/sec** | 50 | 50 – 200 | 200+ (no batching) |

The honest read: **good for 50–500 tenants with normal volume**. Beyond that the bottlenecks below kick in one at a time.

## Top bottlenecks in order of severity

### 1. Sequential channel sync (HIGH impact at 100+ channels)
`cron.job.js:syncChannelOrders` walks every channel in a `for` loop, awaiting each. One slow seller portal stalls every other tenant's sync. With the new `axios.defaults.timeout = 15s` + retries (just shipped), worst case ≈ `(15s × 3 retries) × N channels = 45s × N`.

- 100 channels worst case ≈ 75 min per cycle, but cron interval is 5 min → falls behind permanently
- **Fix**: parallelise with `Promise.allSettled` + concurrency cap (e.g. `p-limit` at 10 in flight)
- **Fix v2**: move to BullMQ — one job per channel, worker processes 50 in parallel

### 2. No queue for webhooks/autopay (HIGH at any volume)
Webhook handler runs synchronously: parse → verify HMAC → DB writes → response. A slow DB write or a third-party callback retry storm = the Express thread is busy = subsequent requests queue up.

- At ~100 webhooks/min with avg 200ms processing = 20 requests/sec ≈ fine
- At 500/min = 100/sec with the same processing = queue grows unboundedly until Node OOMs
- **Fix**: receive → push to BullMQ → 200 in <50ms → worker drains the queue at its own pace

### 3. enforceLimit middleware does N+1 queries (MEDIUM at 100+ req/s)
Every order/product/channel create hits `prisma.X.count()` for warehouses, products, users, channels, orders. That's ~5 count queries per create. At 50 creates/sec across tenants = 250 queries/sec = MySQL is busy with limit checks instead of real work.

- **Fix**: cache counts in `usage_meters` (table already exists), increment on insert, only re-count at meter rollover

### 4. Full catalog reload per `/channels/catalog` request (LOW but visible)
The 169-entry catalog loads at module import (good) but every request walks 169 entries to compute connection status. For tenants with 100+ channels this is 169 × 100 = 17k object inspections per request.

- **Fix**: memoize the per-tenant catalog view with a 60s TTL keyed by `(tenantId, hash(channels.lastSyncAt))`

### 5. JWT verified on every request (LOW)
`authenticate` middleware verifies the JWT signature + decodes claims. Cheap (~50µs) but unnecessary repeated work for the same user across requests.

- **Fix**: a 5-minute Redis cache of `(jwt) → { userId, tenantId, perms }` cuts verification cost to one-per-five-minutes per user

### 6. MySQL connection pool defaults (MEDIUM at 200+ concurrent users)
Knex defaults to min 2, max 10 connections. With 200 concurrent users each holding a connection during a route, you'll get pool starvation.

- **Fix**: bump to `max: 25` in dev, `max: 50–100` in prod via `DATABASE_POOL_MAX` env

### 7. No read replicas (MEDIUM beyond ~200 r/w QPS)
All reads + writes hit the same MySQL primary. Most reads (catalog, plan info, dashboard stats) are cacheable AND replicable.

- **Fix v1**: Redis cache for hot reads (plans, permissions, catalog) — buys 5–10x
- **Fix v2**: a read replica + read/write router in Knex — buys 3–5x more

### 8. `audit_logs` grows unbounded (LOW but inevitable)
Every authenticated mutation writes a row. At 1k tenants × 100 events/day = 100k rows/day = 36M/year on a single table with no partitioning.

- **Fix**: partition by `createdAt` (monthly), or ship rows >90 days to S3/Glacier and drop from MySQL

### 9. `channels.credentials` decryption per request (LOW)
`getAdapter()` decrypts AES-GCM credentials every time it's called. Cheap (~100µs) but adds up under sync load.

- **Fix**: cache the decrypted creds + adapter instance per channel for 5 min (invalidate on `/channels/:id/connect`)

## Horizontal scale path (when you outgrow one box)

The current code can run on **one VM** scaling vertically up to ~16 vCPU / 64 GB RAM. Beyond that you need horizontal. Order of operations:

| Step | Effort | Headroom unlocked |
|---|---|---|
| 1. Add Redis (cache + queue) | 1 day | 5–10× read throughput |
| 2. Move webhooks/cron to BullMQ workers | 2 days | unbounded webhook throughput; predictable cron |
| 3. Distributed cron lock (Redis SETNX) | 1 hour | safe to run multiple API instances |
| 4. Stateless API → put 2–4 instances behind a load balancer | 1 day | horizontal CPU/RAM scale |
| 5. MySQL read replica + r/w split | 2 days | 3–5× read throughput |
| 6. Move cron workers to a separate process | 1 day | API never starves on cron work |
| 7. Switch to PostgreSQL with RLS | 2 weeks | tenant-isolation defence in depth + better JSON/partial indexes |
| 8. Database sharding (by `tenantId`) | 1 month+ | 10×+ scale |

Steps 1–4 collectively buy you **10–20× current capacity** for ~1 week of work. That's the path.

## Memory characteristics

- **Cold start**: ~120 MB (Node + 169 channel adapters loaded eagerly)
- **Idle**: ~150 MB
- **Under load (100 concurrent reqs)**: ~400–600 MB
- **Worst case**: a webhook handler that fetches a large adapter response (Amazon SP-API order list with 5k items × full payload) can spike to ~1 GB transient — fine on a 4 GB host, dangerous on a 1 GB one.

**Fix**: lazy-load adapters by type (drop ~80 MB cold start), stream-parse large API responses instead of buffering.

## Database growth curve

| Tenants | Avg orders/tenant/month | Total rows/month | DB size after 1 year |
|---|---:|---:|---:|
| 50 | 500 | 25,000 | ~3 GB |
| 500 | 1,000 | 500,000 | ~60 GB |
| 5,000 | 2,000 | 10,000,000 | ~1.2 TB |
| 50,000 | 5,000 | 250,000,000 | ~30 TB → sharding required |

Below ~500 tenants, single-instance MySQL on a t3.medium handles it. Above 5,000 tenants you need partitioning + replica + likely Postgres. **Plan to migrate before hitting 1,000 tenants** — easier than after.

## Single points of failure

Today, all of these are SPOFs:
- The single API process (no multi-instance)
- The single MySQL primary (no failover)
- The local cron scheduler (`CRON_LEADER` flag is voluntary, not enforced)
- The `.env` file (no secret manager)

For real production resilience: 2+ API instances behind LB, MySQL primary + replica with automatic failover, Redis-backed distributed lock for cron, AWS Secrets Manager / Vault for secrets.

## Bottom-line capacity statement

> **The system as-is can comfortably serve 50–500 tenants** doing typical D2C e-commerce volume (up to 50k orders/day across all tenants). With the structured logging + Sentry + axios timeouts shipped today, it now degrades gracefully under load instead of going dark.
>
> **To go past 500 tenants** you need: Redis cache, BullMQ workers, distributed cron lock, MySQL connection-pool tuning, and a read replica. That's 1–2 weeks of work, not a rewrite.
>
> **Past 5,000 tenants** you'll need a real conversation about Postgres + sharding + a separate worker fleet. Plan for it but don't pre-build it.

The single most leveraged scaling investment right now is **Redis + BullMQ for webhooks and cron** — it removes the two biggest bottlenecks (sequential sync, synchronous webhook handling) in one project and unblocks horizontal API scaling.
