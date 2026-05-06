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

✅ **All 6 items in this category have shipped.** See "Already shipped" section below.

---

## 💰 Revenue-critical

✅ **All 5 items in this category have shipped.** See "Already shipped" section below.

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
- ✅ Cookie consent banner gating GA / FB Pixel / Clarity — `frontend/components/CookieConsent.tsx`
- ✅ Account deletion endpoint + Settings UI — `POST /auth/me/delete`, soft-delete with PII scrub
- ✅ Data export endpoint + Settings UI — `GET /auth/me/export` returning JSON bundle
- ✅ 2FA / TOTP end-to-end — schema (`users.totpSecret`, `users.mfaEnabled`), `/auth/2fa/setup|verify|disable|login`, login page MFA challenge step, settings card with QR setup
- ✅ Webhook signature verification fixed — uses `req.rawBody` (HMAC over re-stringified JSON would never match)
- ✅ Idempotency middleware (`middleware/idempotency.middleware.js`) + `idempotency_keys` table, applied to `/billing/wallet/topup`, `/invoices/:id/pay`, `/payments/checkout`, `/payments/verify`, `/payments/wallet-checkout`, `/payments/wallet-verify`
- ✅ Trial-expiry banner — `frontend/components/TrialBanner.tsx` mounted in `DashboardLayout`, polls `/billing/usage`, shows when trial ≤ 7 days, escalates colour at ≤ 3 days, dismissible per-day
- ✅ Tenant usage page — `frontend/app/usage/page.tsx`, sidebar entry under Operations. Reads existing `/billing/usage` endpoint (now also returns `trialEndsAt`/`currentPeriodStart`/`billingCycle`) and renders progress bars per metric with over-limit and near-limit pills
- ✅ Plan upgrade / downgrade proration — `/billing/subscription/change` now computes daysRemaining × dailyRate delta. Upgrades debit the wallet (returns 402 with shortfall if low); downgrades credit a refund. Trial / 0-day / free transitions skip proration. Audit log records `proration` metadata
- ✅ Dunning cadence — `billing.job.js` adds `sendDunningEmails` step that fires the email at exactly day 1, 3, 7, 14 since first PAST_DUE. New cols `subscriptions.lastDunningStage` and `subscriptions.pastDueSince` track the ladder; reset on recovery
- ✅ Email templates — added `sendDunningReminder`, `sendPasswordReset`, `sendUserInvite`, `sendPaymentFailed`, `sendPlanLimitAlert`, `sendTicketReply`. Wired into call sites:
  - Invite: `users.routes.js POST /users` after create
  - Ticket reply: `admin.routes.js POST /admin/tickets/:id/reply` after staff reply
  - Plan-limit alert: `auth.middleware.js enforceLimit` at 80% threshold (throttled 1/day per metric/tenant)
  - Payment failed: `payment.routes.js` Razorpay webhook handler on `payment.failed`
  - Password reset: new `POST /auth/forgot-password` + `POST /auth/reset-password` (60-min JWT token, no DB row needed)
- ✅ Email diagnostics — `POST /admin/email/test { to }` fires every template at a chosen address and returns per-template ok/stub/error status, confirming whether SMTP is actually configured vs running in console-stub mode
