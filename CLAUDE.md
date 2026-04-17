# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`/backend`)
```bash
npm run dev                  # Start dev server (port 5001) — auto-migrates + seeds on boot
npm start                    # Production start
npm run db:seed              # Run seed manually
npm run db:studio            # Prisma Studio GUI (port 5555)
npm run test:backend         # Run e2e test suite (requires server running)
npm run test:backend:server  # Start server with rate limits disabled (for tests)
npm run cron:run             # Run background sync jobs
npm run billing:run          # Run billing/metering jobs
```

### Frontend (`/frontend`)
```bash
npm run dev    # Start Next.js dev server (port 3000)
npm run build  # Production build
npm run lint   # ESLint
```

### Mobile (`/mobile`)
```bash
npm start      # Start Expo dev server
npm run ios    # iOS simulator
npm run android
```

### Running Tests
```bash
# Terminal 1
cd backend && DISABLE_RATE_LIMIT=true npm run test:backend:server

# Terminal 2
cd backend && npm run test:backend
```

Tests are vanilla Node.js `http.request` (no framework). To run a subset, comment out test groups in `backend/src/scripts/test.js`.

---

## Architecture

OmniStock is a multi-tenant SaaS ERP for omnichannel inventory and order management (Amazon, Shopify, Flipkart, 50+ channels). It is a monorepo with three packages: `backend` (Express.js), `frontend` (Next.js 14), and `mobile` (Expo/React Native).

### Stack
- **Backend**: Node.js + Express, Knex.js query builder (not Prisma ORM), MySQL
- **Frontend**: Next.js 14 App Router, Zustand, React Query, Axios
- **Database**: MySQL (XAMPP locally). Schema bootstrap is raw SQL via `backend/src/config/schema.sql.js`

### Multi-Tenancy & RBAC
Every resource is scoped to a `tenant`. The middleware in `backend/src/middleware/auth.middleware.js` attaches `req.tenant`, `req.user`, `req.plan`, and `req.permissions` to every authenticated request. All DB queries must filter by `tenantId`.

Permission model: **User → Roles → Permissions** (e.g., `products.create`, `orders.view`). Wildcard `*` = full access. Platform admins (founders) can pass `x-tenant-id` header to impersonate any tenant. Permission checks are cached in-process with a 10s TTL; cache is invalidated on logout.

### Auth Flow
- JWT (7-day expiry, stored in `localStorage` on the client)
- Email/password (bcryptjs) or Google Identity Services (verified server-side via `OAuth2Client`)
- Dev bypass: set `DEV_AUTH_BYPASS=true` and use `Authorization: Bearer dev:<email>` — only works with seeded users

### Database Bootstrap
On every `npm run dev`, `backend/src/bootstrap/initDb.js` runs:
1. Executes all `CREATE TABLE IF NOT EXISTS` from `schema.sql.js`
2. Applies additive column migrations (`ALTER TABLE ADD COLUMN IF NOT EXISTS`)
3. Checks row counts in `plans`, `users` — if empty, runs `seed.js`

Seed is idempotent (upserts). To force a re-seed, delete `backend/.seed-state.json` and restart.

**Schema changes**: Edit `schema.sql.js` for new tables, or add `ALTER TABLE` statements to `initDb.js` for new columns. Restart dev server to apply.

### Plan & Billing
Plans define hard limits (max SKUs, warehouses, users, orders/month) and feature flags. Beyond limits, tenants with Pay-As-You-Go enabled draw from a wallet (funded via Razorpay). The `enforceLimit()` middleware in `auth.middleware.js` gates creation requests and checks wallet balance when the plan ceiling is hit. Feature flags gate entire modules via `requireFeature()`.

### Channel Integrations
Channels fall into categories: e-commerce (Amazon SP-API OAuth, Shopify OAuth), social (Instagram, WhatsApp), logistics (Shiprocket, Delhivery — tracking only), POS, and B2B. Channel API credentials are stored AES-256-GCM encrypted (`backend/src/utils/crypto.js`) using `ENCRYPTION_KEY`. Background jobs in `backend/src/jobs/cron.job.js` poll channels for orders and push inventory updates.

### Key Files
| File | Purpose |
|------|---------|
| `backend/src/index.js` | Express app entry, route registration, global error handler |
| `backend/src/middleware/auth.middleware.js` | JWT verify, permission/plan/limit enforcement |
| `backend/src/bootstrap/initDb.js` | DB auto-migrate + conditional seed |
| `backend/src/config/schema.sql.js` | All `CREATE TABLE` statements |
| `backend/src/scripts/seed.js` | Idempotent seeder (plans, admin user, sample data) |
| `backend/src/scripts/test.js` | e2e test suite |
| `backend/src/utils/db.js` | Knex.js instance |
| `backend/src/utils/crypto.js` | AES-256-GCM encrypt/decrypt for channel credentials |
| `frontend/store/auth.store.ts` | Zustand store: user, token, tenant, plan, permissions |
| `frontend/lib/api.ts` | Axios instance + all typed API methods |

### Adding a Route
1. Create `backend/src/routes/foo.routes.js` with `authenticate`, `requireTenant`, `requirePermission('foos.view')` middleware chain
2. Create `backend/src/controllers/foo.controller.js` — always filter by `req.tenant.id`
3. Register in `backend/src/index.js`: `app.use(\`${api}/foos\`, fooRoutes)`
4. Add table to `schema.sql.js` if needed

### Frontend Data Flow
- `frontend/lib/api.ts`: Axios instance auto-attaches JWT from `localStorage`; 401 responses redirect to `/login`; 402 responses trigger a plan-limit modal
- `frontend/store/auth.store.ts`: Populated after login via `/auth/me`; `hasPermission()` and `hasFeature()` are used throughout pages to conditionally render UI

---

## Environment Variables

### Backend (`.env`)
```
DATABASE_URL=mysql://root@localhost:3306/omnistock
PORT=5001
JWT_SECRET=<min 32 chars>
ENCRYPTION_KEY=<64 hex chars>
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FRONTEND_URL=http://localhost:3000
# Dev flags
DEV_AUTH_BYPASS=true
DISABLE_RATE_LIMIT=true
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
```

---

## Common Gotchas

- **Windows DLL lock**: If `npm install` fails with `EPERM rename query_engine-windows.dll.node`, stop the dev server first (it holds a file lock).
- **DB doesn't exist**: XAMPP creates the MySQL instance but not the `omnistock` database — create it once via phpMyAdmin; migrations handle the rest.
- **Prisma vs Knex**: The repo has Prisma installed (for `prisma generate` / Studio GUI) but the application code uses **Knex.js** for all queries. Do not add Prisma ORM queries to controllers.
- **Tenant isolation**: Never write a query without a `tenantId` filter unless the resource is explicitly global (plans, public content).
