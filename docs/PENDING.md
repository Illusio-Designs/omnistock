# Kartriq — Pending Items (SaaS Production Readiness Audit)

> Snapshot taken: 2026-05-06
> Branch: `main`
> Scope: backend (`/backend`), web (`/frontend`), mobile (`/mobile`)

This document tracks gaps between the current codebase and a production-grade
multi-tenant SaaS. It is a living punch-list — tick items off as they ship and
add new ones as scope expands.

The platform is fairly complete on **core features** (multi-tenancy, RBAC,
billing limits, channel integrations, founder admin, public marketing site).
What is missing is mostly the **trust, compliance, growth, and ops** layer
that distinguishes a working app from a sellable SaaS.

---

## Legend

- 🚨 **Compliance / legal** — must ship before scaling user base
- 💰 **Revenue-critical** — directly impacts MRR or churn
- 🏢 **Enterprise** — gating factor for higher-tier plans
- 📊 **Trust & ops** — reliability, security, observability
- 📱 **Mobile** — Expo app gaps
- 🌱 **Growth & UX** — funnel, activation, retention
- 🧹 **Code debt** — no user-facing impact, but slows future work

---

## 🚨 Compliance / Legal — must-haves

| # | Item | Notes |
|---|------|-------|
| 1 | **Cookie consent banner** | GA + FB Pixel + Microsoft Clarity now load on every public visit (see `components/Analytics.tsx`). India's DPDP Act and EU GDPR require explicit consent before any non-essential script runs. Suggest: `frontend/components/CookieConsent.tsx` that gates `<Analytics />` mounting. |
| 2 | **Account deletion endpoint + UI** | DPDP/GDPR right-to-erasure. Should soft-delete tenant + user, queue hard delete after retention window, log to audit. |
| 3 | **Data export ("Download my data")** | DPDP/GDPR portability. Bundles tenant rows (orders, products, customers, invoices) into a JSON/CSV zip. |
| 4 | **2FA / MFA** | Table-stakes for any B2B SaaS. TOTP at minimum, optional SMS. Schema needs `users.totpSecret`, `users.mfaEnabled`. |
| 5 | **Webhook signature verification** | `webhook.routes.js` accepts payloads but does not validate Razorpay / Shopify / Amazon HMAC signatures. Anyone with the URL can post forged events. |
| 6 | **Idempotency keys** on payment writes | `POST /payments/*`, `POST /invoices/:id/pay`, `POST /billing/wallet/topup`. Prevents double-charge on network retries; standard practice. |

---

## 💰 Revenue-critical

| # | Item | Notes |
|---|------|-------|
| 7 | **Trial-expiry banner** | `tenants.trialEndsAt` exists; no UI banner counting down. Surface on every authenticated page header when `trialEndsAt` < 7 days away. |
| 8 | **Dunning flow** | Failed Razorpay charges should retry on a 3 / 7 / 14-day cadence with email reminders before suspending. `autopay.job.js` exists — verify it covers retry + suspension logic. |
| 9 | **Tenant usage page** | Tenants currently can't see their own usage vs plan limits (SKUs, users, orders this month). Server-side enforcement exists in `auth.middleware.js`; add `/usage` page that reads same numbers. |
| 10 | **Plan upgrade / downgrade with proration** | Only "select a plan" exists today. Mid-cycle changes need pro-rated invoicing or wallet adjustments. |
| 11 | **Email templates QA** | Verify these actually send via SMTP (not just console-stub): welcome, password reset, invite, invoice, receipt, payment-failed, plan-limit alert, trial-expiry, ticket reply. |

---

## 🏢 Enterprise tier

| # | Item | Notes |
|---|------|-------|
| 12 | **SSO (SAML / OIDC)** | Only Google OAuth today. Enterprise prospects will ask for Okta / Azure AD. Stick this behind a feature flag on the Enterprise plan. |
| 13 | **Tenant API keys** | So customers can call your API from their own tools / scripts. Schema: `apiKeys` table with hashed secret, scopes, last-used-at. |
| 14 | **Tenant-visible audit log** | Founder admin has audit; tenants currently can't see their own. Reuse `audit.service.js`, add `/audit` page filtered by `req.tenant.id`. |
| 15 | **Team invitations via email** | Magic-link signup so a tenant admin can invite teammates by email without them needing to register first. |
| 16 | **Custom roles UI** | `role.routes.js` exists; verify there is a UI for tenants to define their own roles + assign permission strings. |

---

## 📊 Trust & operations

| # | Item | Notes |
|---|------|-------|
| 17 | **Public status page** | `status.kartriq.com` with component-level health (API, DB, payments, channels). Link from footer. Tools: BetterStack, Statuspage, or self-hosted Cachet. |
| 18 | **`/healthz` and `/readyz` endpoints** | Required for k8s / load balancer probes. `/healthz` = process alive; `/readyz` = DB + critical deps reachable. |
| 19 | **Automated DB backups** | Verify MySQL is backed up nightly with point-in-time restore tested. Document restore procedure in `docs/RUNBOOK.md`. |
| 20 | **Test coverage** | Backend: 1 e2e file (`scripts/test.js`). Frontend: 3 component tests + 1 smoke spec. Target: ~60-70% line coverage on auth, billing, webhooks before scaling. |
| 21 | **Background job queue** | `jobs/` are cron-driven scripts. No retry, no dead-letter queue. Migrate to BullMQ + Redis for outbound webhooks, channel sync, email sending. |
| 22 | **CI pipeline** | Verify GitHub Actions run `lint` + `typecheck` + `test` + `next build` on every PR. Recent build failures suggest pushes to `main` aren't gated. |

---

## 📱 Mobile (Expo)

| # | Item | Notes |
|---|------|-------|
| 23 | **Audit stub vs functional screens** | `ScreenStub.tsx` exists. Catalog which `(app)/*.tsx` screens are real vs placeholders. |
| 24 | **Push notifications** | Expo Notifications not wired. Need server-side device token registration + send on order events. |
| 25 | **Biometric auth** | Face ID / fingerprint via `expo-local-authentication` after first login. |
| 26 | **Offline cache** | At least read-only inventory + order list should survive no-connection. SQLite or AsyncStorage cache. |
| 27 | **App-store assets** | Icons, splash, screenshots, store listings, privacy nutrition labels (iOS), data safety form (Play). |
| 28 | **Deep linking** | Opening an order URL from email should land directly in the app's order detail. |

---

## 🌱 Growth & UX

| # | Item | Notes |
|---|------|-------|
| 29 | **Cmd+K command palette** | Standard SaaS pattern. Search across orders, products, customers, settings. Tools: cmdk library. |
| 30 | **In-app changelog / "What's new"** | Drawer accessible from topbar that shows recent releases — drives feature discovery. |
| 31 | **Public docs site** | API reference, integration guides, FAQs. Tools: Mintlify, Docusaurus, or extend the existing `/help` page. |
| 32 | **Referral / affiliate program** | Track referrer codes on signup, credit wallet on conversion. |
| 33 | **Empty-state illustrations + first-run tips** | Some pages have them; audit each list page (orders, products, channels) for a polished empty state with a clear primary CTA. |
| 34 | **Dark mode** | No theme toggle today. Implement via Tailwind `dark:` classes + a Zustand-stored preference. |

---

## 🧹 Code debt — low priority

| # | Item | Notes |
|---|------|-------|
| 35 | **`no-explicit-any` cleanup** | ~750 ESLint warnings across the frontend. Mostly `lib/api.ts`, page handlers. Non-blocking but slows refactors. |
| 36 | **`react-hooks/exhaustive-deps`** | ~20 warnings. Each one is potentially a stale-closure bug. |
| 37 | **Prisma shim vs real Prisma** | `utils/prisma.js` is a Knex-backed Prisma-like API. Decide: migrate to real Prisma ORM (more type safety, ecosystem) or commit fully to Knex (drop the shim, use Knex directly). |
| 38 | **Stale branch `claude/ftp-deploy-script-wFZIi`** | Safe to delete on origin once FTP work resumes or is abandoned. |
| 39 | **FTP deploy script** | Started in `backend/scripts/ftp-test.js` (currently deleted from main). Blocked on running locally to discover remote directory layout before writing the real deploy script. |

---

## Suggested next 5 to ship

If we tackle these in order, the platform crosses the line from "working app"
to "sellable SaaS":

1. **Cookie consent banner** (#1) — legal exposure today
2. **Webhook signature verification + idempotency keys** (#5, #6) — financial safety
3. **Trial-expiry banner + tenant usage page** (#7, #9) — directly drives upgrades
4. **2FA** (#4) — table-stakes security
5. **CI pipeline running `next build` on PR** (#22) — stops broken `main` deployments

Each of the five is 1-3 days of focused work.

---

## Already shipped — for reference

These were closed during the audit / cleanup pass:

- ✅ Vercel build blockers (ESLint + TS) — `b28e063`, `f8f1871`, `0c799bc`
- ✅ Region flags use Twemoji + sticker-style wrapper — `e74d957`
- ✅ Loading shimmers across 7 pages now use `react-loading-skeleton` with content-shaped placeholders — `8901393`, `890c09d`
- ✅ `/admin/analytics` page + Tracking & Maintenance tabs in `/admin/settings` — `0d0ce96`
