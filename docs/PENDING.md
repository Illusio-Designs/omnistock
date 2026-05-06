# Kartriq — Pending Items (SaaS Production Readiness Audit)

> Snapshot taken: 2026-05-06 · Last updated: 2026-05-06
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

## Progress

- ✅ Shipped: **15 of 39** numbered items + 4 build/UX fixes
- ⛔ Deferred: **1 item** (#13 Tenant API keys)
- 🔄 Remaining: **23 items**

---

## Legend

- ✅ **Shipped** — landed on `main`
- ⛔ **Deferred** — explicitly out of scope; left here for context
- 🚨 **Compliance / legal** — must ship before scaling user base
- 💰 **Revenue-critical** — directly impacts MRR or churn
- 🏢 **Enterprise** — gating factor for higher-tier plans
- 📊 **Trust & ops** — reliability, security, observability
- 📱 **Mobile** — Expo app gaps
- 🌱 **Growth & UX** — funnel, activation, retention
- 🧹 **Code debt** — no user-facing impact, but slows future work

---

## 🚨 Compliance / Legal — must-haves

| # | Status | Item | Notes |
|---|---|------|-------|
| 1 | ✅ | **Cookie consent banner** | `frontend/components/CookieConsent.tsx` — gates GA / FB Pixel / Clarity behind explicit consent (DPDP + GDPR). Mounted from `app/layout.tsx`; choice persisted in localStorage. Shipped in `c6ec06a`. |
| 2 | ✅ | **Account deletion endpoint + UI** | `POST /auth/me/delete` with password confirmation (or email-typed-back for OAuth users). Soft-deletes user, scrubs PII, cascades to tenant if owner. Settings → Data & Privacy → Delete button. Shipped in `c6ec06a`. |
| 3 | ✅ | **Data export ("Download my data")** | `GET /auth/me/export` — JSON bundle of every tenant-scoped row (products, orders, customers, invoices, shipments, vendors, warehouses, channels, wallet) with `Content-Disposition: attachment`. Settings → Data & Privacy → Export button. Shipped in `c6ec06a`. |
| 4 | ✅ | **2FA / MFA** | `utils/totp.js` — RFC 6238 TOTP using only Node's `crypto`. Schema: `users.totpSecret`, `users.mfaEnabled`. Routes: `/auth/2fa/setup|verify|disable|login`. Login flow returns `mfaToken` instead of session JWT when enabled. Settings → Security → TwoFactorCard with QR setup. Shipped in `c6ec06a`. |
| 5 | ✅ | **Webhook signature verification** | `webhook.routes.js` now uses `req.rawBody` (captured by `express.json` verify hook) for HMAC. The previous `JSON.stringify(req.body)` could never round-trip and would reject every legitimate signed event. Shipped in `c6ec06a`. |
| 6 | ✅ | **Idempotency keys on payment writes** | `middleware/idempotency.middleware.js` + `idempotency_keys` table. Caches response keyed by `(Idempotency-Key, tenantId, path)` for 24h. Applied to `/billing/wallet/topup`, `/invoices/:id/pay`, `/payments/checkout`, `/payments/verify`, `/payments/wallet-checkout`, `/payments/wallet-verify`. Shipped in `c6ec06a`. |

---

## 💰 Revenue-critical

| # | Status | Item | Notes |
|---|---|------|-------|
| 7 | ✅ | **Trial-expiry banner** | `frontend/components/TrialBanner.tsx`, mounted in `DashboardLayout`. Polls `/billing/usage` hourly, surfaces when trial ≤ 7 days, escalates to red at ≤ 3 days, dismissible per-day via localStorage. Shipped in `4e3abc1`. |
| 8 | ✅ | **Dunning flow (1 / 3 / 7 / 14-day cadence)** | `billing.job.js sendDunningEmails()` walks PAST_DUE subs and emails the matching stage exactly once each. New cols `subscriptions.lastDunningStage` and `pastDueSince` track the ladder; reset on recovery. Suspension after 14 days handled by existing `suspendOverdueTenants`. Shipped in `4e3abc1`. |
| 9 | ✅ | **Tenant usage page** | `frontend/app/usage/page.tsx` reads existing `/billing/usage` endpoint (now also returns `trialEndsAt` / `currentPeriodStart` / `billingCycle`) and renders progress bars per metric with over-limit and near-limit pills. Sidebar gains a Usage link with `Gauge` icon. Shipped in `4e3abc1`. |
| 10 | ✅ | **Plan upgrade / downgrade with proration** | `POST /billing/subscription/change` computes `daysRemaining × (newDaily - oldDaily)`. Upgrades debit the wallet (returns 402 with `shortfall` if balance is low). Downgrades credit a refund. Trial / 0-day / free transitions skip proration. Audit log records the proration metadata. Shipped in `4e3abc1`. |
| 11 | ✅ | **Email templates QA** | Added `sendDunningReminder` (4-stage), `sendPasswordReset`, `sendUserInvite`, `sendPaymentFailed`, `sendPlanLimitAlert`, `sendTicketReply`. Wired into all call sites (invite on user create, ticket-reply on staff reply, plan-limit alert at 80% throttled 1/day, payment-failed on Razorpay webhook, password-reset via new `/auth/forgot-password` + `/auth/reset-password`). `POST /admin/email/test { to }` fires every template at a chosen address and reports per-template ok/stub/error to confirm SMTP delivery. Shipped in `4e3abc1`. |

---

## 🏢 Enterprise tier

| # | Status | Item | Notes |
|---|---|------|-------|
| 12 | 🔄 | **SSO (SAML / OIDC)** | Only Google OAuth today. Enterprise prospects will ask for Okta / Azure AD. Stick this behind a feature flag on the Enterprise plan. |
| 13 | ⛔ | ~~**Tenant API keys**~~ | Deferred — not on the roadmap. Tenants will use the existing JWT session for any programmatic access. |
| 14 | ✅ | **Tenant-visible audit log** | `frontend/app/audit/page.tsx` — backed by `GET /billing/audit` (tenant-scoped server-side, gated by `settings.read`). Endpoint enriched with `limit`, `action`, and `before` query params plus a `total` count and a top-30 distinct-actions list for the filter dropdown. UI mirrors the admin audit page (verb/method colour pills, status colours, click-to-expand metadata) but drops cross-tenant fields. Sidebar gains an "Activity log" entry; Cmd+K palette adds a shortcut. Shipped in this commit. |
| 15 | 🔄 | **Team invitations via email** | Magic-link signup so a tenant admin can invite teammates by email without them needing to register first. (Email template `sendUserInvite` is already shipped in #11 — needs the magic-link accept flow.) |
| 16 | 🔄 | **Custom roles UI** | `role.routes.js` exists; verify there is a UI for tenants to define their own roles + assign permission strings. |

---

## 📊 Trust & operations

| # | Status | Item | Notes |
|---|---|------|-------|
| 17 | 🔄 | **Public status page** | `status.kartriq.com` with component-level health (API, DB, payments, channels). Link from footer. Tools: BetterStack, Statuspage, or self-hosted Cachet. |
| 18 | 🔄 | **`/healthz` and `/readyz` endpoints** | Required for k8s / load balancer probes. `/healthz` = process alive; `/readyz` = DB + critical deps reachable. |
| 19 | 🔄 | **Automated DB backups** | Verify MySQL is backed up nightly with point-in-time restore tested. Document restore procedure in `docs/RUNBOOK.md`. |
| 20 | 🔄 | **Test coverage** | Backend: 1 e2e file (`scripts/test.js`). Frontend: 3 component tests + 1 smoke spec. Target: ~60-70% line coverage on auth, billing, webhooks before scaling. |
| 21 | 🔄 | **Background job queue** | `jobs/` are cron-driven scripts. No retry, no dead-letter queue. Migrate to BullMQ + Redis for outbound webhooks, channel sync, email sending. |
| 22 | 🔄 | **CI pipeline** | Verify GitHub Actions run `lint` + `typecheck` + `test` + `next build` on every PR. Recent build failures suggest pushes to `main` aren't gated. |

---

## 📱 Mobile (Expo)

| # | Status | Item | Notes |
|---|---|------|-------|
| 23 | 🔄 | **Audit stub vs functional screens** | `ScreenStub.tsx` exists. Catalog which `(app)/*.tsx` screens are real vs placeholders. |
| 24 | 🔄 | **Push notifications** | Expo Notifications not wired. Need server-side device token registration + send on order events. |
| 25 | 🔄 | **Biometric auth** | Face ID / fingerprint via `expo-local-authentication` after first login. |
| 26 | 🔄 | **Offline cache** | At least read-only inventory + order list should survive no-connection. SQLite or AsyncStorage cache. |
| 27 | 🔄 | **App-store assets** | Icons, splash, screenshots, store listings, privacy nutrition labels (iOS), data safety form (Play). |
| 28 | 🔄 | **Deep linking** | Opening an order URL from email should land directly in the app's order detail. |

---

## 🌱 Growth & UX

| # | Status | Item | Notes |
|---|---|------|-------|
| 29 | ✅ | **Cmd+K command palette** | `frontend/components/CommandPalette.tsx`, mounted in `DashboardLayout`. ⌘K / Ctrl+K toggles globally, Esc closes, ↑↓ navigates, Enter activates. Static commands (4 quick actions + 14 page navs + 6 settings shortcuts) plus debounced live search across products, orders, customers. Topbar gains a clickable `⌘K` button that dispatches `open-command-palette` so other UI can open it without re-implementing the keyboard handler. No external dep. Shipped in `aefc86d`. |
| 30 | ✅ | **In-app changelog / "What's new"** | `frontend/components/ChangelogDrawer.tsx` + `frontend/data/changelog.ts`. Megaphone icon in the Topbar (with red unread dot) opens a slide-in drawer from the right. Entries grouped by tag (`feature` / `fix` / `security` / `improve`) with colour-coded badges. Last-seen entry id stored in localStorage; the dot clears the moment the drawer is opened. Listens for `open-changelog` event so other UI can trigger it. Shipped in this commit. |
| 31 | 🔄 | **Public docs site** | API reference, integration guides, FAQs. Tools: Mintlify, Docusaurus, or extend the existing `/help` page. |
| 32 | 🔄 | **Referral / affiliate program** | Track referrer codes on signup, credit wallet on conversion. |
| 33 | 🔄 | **Empty-state illustrations + first-run tips** | Some pages have them; audit each list page (orders, products, channels) for a polished empty state with a clear primary CTA. |
| 34 | 🔄 | **Dark mode** | No theme toggle today. Implement via Tailwind `dark:` classes + a Zustand-stored preference. |

---

## 🧹 Code debt — low priority

| # | Status | Item | Notes |
|---|---|------|-------|
| 35 | 🔄 | **`no-explicit-any` cleanup** | ~750 ESLint warnings across the frontend. Mostly `lib/api.ts`, page handlers. Non-blocking but slows refactors. |
| 36 | 🔄 | **`react-hooks/exhaustive-deps`** | ~20 warnings. Each one is potentially a stale-closure bug. |
| 37 | 🔄 | **Prisma shim vs real Prisma** | `utils/prisma.js` is a Knex-backed Prisma-like API. Decide: migrate to real Prisma ORM (more type safety, ecosystem) or commit fully to Knex (drop the shim, use Knex directly). |
| 38 | 🔄 | **Stale branch `claude/ftp-deploy-script-wFZIi`** | Safe to delete on origin once FTP work resumes or is abandoned. |
| 39 | 🔄 | **FTP deploy script** | Started in `backend/scripts/ftp-test.js` (currently deleted from main). Blocked on running locally to discover remote directory layout before writing the real deploy script. |

---

## Suggested next 5 to ship

The previous top-5 (compliance + revenue) are all done. Next priorities:

1. **CI pipeline** (#22) — gate `next build` + tests on every PR so broken `main` deploys stop happening
2. **`/healthz` + `/readyz`** (#18) — needed for any k8s / load-balancer setup, ~30 min of work
3. **Team invitations magic-link accept flow** (#15) — email template already exists, just need the accept endpoint + UI
4. **Test coverage on auth + billing + webhooks** (#20) — biggest risk surface in the codebase
5. **Public status page** (#17) — link from footer; surfaces uptime + incident history

---

## Already shipped — for reference

These were closed during this audit / cleanup pass:

### Build & UX fixes (un-numbered)
- ✅ Vercel build blockers (ESLint + TS) — `b28e063`, `f8f1871`, `0c799bc`, `225a101`
- ✅ Region flags use Twemoji + sticker-style wrapper — `e74d957`
- ✅ Loading shimmers across 7 pages now use `react-loading-skeleton` with content-shaped placeholders — `8901393`, `890c09d`
- ✅ `/admin/analytics` page + Tracking & Maintenance tabs in `/admin/settings` — `0d0ce96`

### Numbered items
- ✅ #1 Cookie consent banner — `c6ec06a`
- ✅ #2 Account deletion endpoint + UI — `c6ec06a`
- ✅ #3 Data export endpoint + UI — `c6ec06a`
- ✅ #4 2FA / TOTP end-to-end — `c6ec06a`
- ✅ #5 Webhook signature verification fixed — `c6ec06a`
- ✅ #6 Idempotency middleware on payment writes — `c6ec06a`
- ✅ #7 Trial-expiry banner — `4e3abc1`
- ✅ #8 Dunning cadence (1 / 3 / 7 / 14 day ladder) — `4e3abc1`
- ✅ #9 Tenant usage page — `4e3abc1`
- ✅ #10 Plan upgrade / downgrade with proration — `4e3abc1`
- ✅ #11 Email templates + diagnostics — `4e3abc1`
- ✅ #29 Cmd+K command palette — `aefc86d`
- ✅ #30 In-app changelog drawer — `8b070f5`
- ✅ #14 Tenant-visible audit log — this commit
