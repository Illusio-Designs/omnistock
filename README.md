# Omnistock — Omnichannel ERP

A full-stack ERP (EasyEcom-style) for D2C brands, marketplaces and warehouses:
inventory, orders, purchases, invoices, returns, shipments and reconciliation
across every sales channel.

**Stack**
- **Backend**: Node.js + Express + Prisma (JavaScript, CommonJS)
- **Database**: MySQL (runs on XAMPP locally)
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + Zustand
- **Auth**: JWT + Google Identity Services

---

## Project Structure

```
e:/omnistock/
├── backend/                    ← Express API (port 5001)
│   ├── src/
│   │   ├── index.js            ← Entry point — runs initDb then listens
│   │   ├── bootstrap/
│   │   │   └── initDb.js       ← Auto migrate + seed on boot
│   │   ├── routes/             ← Route files per module
│   │   ├── controllers/        ← Business logic
│   │   ├── middleware/         ← Auth, validation, rate limit
│   │   └── utils/              ← Prisma client, helpers
│   ├── prisma/
│   │   ├── schema.prisma       ← DB schema (source of truth)
│   │   ├── migrations/         ← Prisma migration history
│   │   └── seed.js             ← Idempotent seed (upserts)
│   ├── .env                    ← DATABASE_URL, JWT_SECRET, etc.
│   └── .seed-state.json        ← Auto-generated, tracks last seed
│
├── frontend/                   ← Next.js app (port 3000)
│   ├── app/                    ← App Router pages
│   ├── components/             ← Layout, UI components
│   ├── lib/                    ← API client
│   └── store/                  ← Zustand auth store
│
└── docs/                       ← Design notes, specs
```

---

## Prerequisites

- **Node.js** 18+
- **XAMPP** (for MySQL on `localhost:3306`)
- **npm**

---

## Quick Start

### 1. Start MySQL (XAMPP)

Open the XAMPP control panel → start **Apache** + **MySQL**.

Open phpMyAdmin at `http://localhost/phpmyadmin` and create an empty database
named **`omnistock`** (one time only).

### 2. Backend

```bash
cd e:/omnistock/backend
npm install         # runs `prisma generate` via postinstall
npm run dev
```

On first boot, `initDb` will automatically:
1. apply all Prisma migrations to your `omnistock` DB
2. run the seed (permissions, plans, roles, admin user, sample data)

API runs on `http://localhost:5001`.

### 3. Frontend

```bash
cd e:/omnistock/frontend
npm install
npm run dev
```

App runs on `http://localhost:3000`.

**Default login:** `admin@omnistock.com` / `admin123`

---

## Environment Variables — `backend/.env`

```env
# MySQL on XAMPP — default root password is empty
DATABASE_URL="mysql://root@localhost:3306/omnistock"

PORT=5001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# JWT — change in production, min 32 chars
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_min_32_chars

# AES-256-GCM (64 hex chars) — for encrypting channel credentials
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=0000000000000000000000000000000000000000000000000000000000000000

# Hours to wait after delivery before triggering review requests
REVIEW_REQUEST_DELAY_HOURS=72

# Google Sign-In (Google Identity Services — ID tokens, no redirect URI)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## Database Workflow

The backend uses **Prisma** with an auto-bootstrap step in
[backend/src/bootstrap/initDb.js](backend/src/bootstrap/initDb.js).

### What happens on every `npm run dev`

1. `npx prisma migrate deploy` — applies any pending migration files (no-op if none).
2. Reads the latest applied migration from `_prisma_migrations`.
3. Compares it to `backend/.seed-state.json`:
   - **same** → skip seed (logs `seed up-to-date`)
   - **different / missing** → runs `prisma/seed.js` then writes new state.
4. Starts Express on `PORT`.

The seed uses `upsert` everywhere, so it's safe to re-run any time.

### Changing the schema

```bash
# 1. Stop the dev server (Ctrl+C) — frees the Prisma query engine DLL on Windows
# 2. Edit backend/prisma/schema.prisma
cd backend
npx prisma migrate dev --name describe_change
# 3. Start again — initDb applies the migration and re-seeds
npm run dev
```

Teammates just `git pull && npm install && npm run dev` — migrations apply
and the seed re-runs automatically because their `.seed-state.json` is behind.

### Useful scripts — `backend/package.json`

| Script             | Purpose                                  |
|--------------------|------------------------------------------|
| `npm run dev`      | nodemon + auto migrate + seed            |
| `npm start`        | `node src/index.js` (same init flow)     |
| `npm run db:migrate` | `prisma migrate dev` (new migration)   |
| `npm run db:push`  | Push schema without creating migration   |
| `npm run db:seed`  | Run seed manually                        |
| `npm run db:studio`| Prisma Studio GUI                        |
| `npm run db:generate` | Regenerate Prisma client              |

---

## API Endpoints (v1)

All routes live under `/api/v1`.

| Module           | Base path                 |
|------------------|---------------------------|
| Auth             | `/auth` (login, register, google) |
| Products         | `/products`               |
| Inventory        | `/inventory`              |
| Orders           | `/orders`                 |
| Purchases        | `/purchases`              |
| Vendors          | `/vendors`                |
| Warehouses       | `/warehouses`             |
| Channels         | `/channels`               |
| Customers        | `/customers`              |
| Invoices         | `/invoices`               |
| Dashboard        | `/dashboard`              |
| Reports          | `/reports`                |
| Shipments        | `/shipments`              |
| Plans            | `/plans`                  |
| Billing          | `/billing`                |
| Admin            | `/admin`                  |
| Roles            | `/roles`                  |
| Public           | `/public` (SEO, blog, pricing) |

Health check: `GET /health`.

---

## Modules

- **Inventory** — Real-time stock across warehouses, low-stock alerts, adjustments
- **Orders** — Omnichannel order management, fulfillment, cancellation
- **Purchase Orders** — Vendor POs, approval, receiving, cost tracking
- **Warehouses** — Multi-warehouse, per-warehouse stock
- **Channels** — Amazon, Flipkart, Shopify, offline; sync + credential encryption
- **Customers** — Profiles, order history
- **Invoices** — Billing, payment recording, GST
- **Shipments** — Courier tracking
- **Returns** — Return requests, approvals, restocking
- **Reports** — Sales analytics, inventory valuation, top products
- **Dashboard** — KPIs, recent orders, revenue trends
- **RBAC** — Tenant-scoped roles + permission catalog (module × action)
- **Plans & Billing** — Standard/Professional/Enterprise + pay-as-you-go
- **Public site** — SEO settings, blog, pricing page

---

## Troubleshooting

**`EPERM: operation not permitted, rename query_engine-windows.dll.node`**
The running Node process holds the Prisma query engine DLL on Windows. Stop
the dev server before running `prisma generate` or `prisma migrate dev`.
`npm run dev` itself does **not** run `generate` — that's handled by the
`postinstall` hook on `npm install`.

**`Can't reach database server at localhost:3306`**
XAMPP MySQL isn't running. Start it from the XAMPP control panel.

**`Access denied for user 'root'@'localhost'`**
XAMPP's default MySQL root password is empty. In `backend/.env`, use
`mysql://root@localhost:3306/omnistock` (no password), **not**
`mysql://root:password@localhost:3306/omnistock`.

**`Database 'omnistock' doesn't exist`**
Create it once in phpMyAdmin — Prisma migrations create tables, not the database.

**Prisma `Update available 5.22.0 -> 7.7.0` notice**
Ignore it. v7 is a major upgrade with breaking changes — stay on 5.x.

**Seed didn't re-run after schema change**
Delete `backend/.seed-state.json` and restart — it will re-seed on next boot.

---

## License

Proprietary — internal project.
