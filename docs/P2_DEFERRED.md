# P2 Items — Deferred With Rationale

Three items from the P2 frontend list are not shipped in the current batch.
This file records *why*, what would unblock them, and the trip-wires that
should force a re-evaluation.

---

## 1. Move JWT to httpOnly cookie + add backend CSRF

**Status**: Not started — explicit decision required.

**Why deferred**:
We just shipped `docs/AUTH_TOKEN_STORAGE.md` documenting the decision to
**stay on `localStorage`** for now, paired with CSP report-only, the markdown
sanitizer, Sentry, and a refresh-token TTL backlog item. The trip-wires
listed there have not fired:

- ✅ No real XSS has reached production (the blog markdown vulnerability was
  caught and fixed pre-customer).
- ✅ CSP report-only has not had a chance to collect data — it shipped
  yesterday. Need ~4 weeks of telemetry before knowing whether enforcing is
  feasible.
- ✅ No SOC2 / B2B-prospect compliance request has come in.
- ✅ Mobile parity argument still stands: the Expo app uses bearer headers
  against the same `/api/v1`. Cookies don't help mobile, and shipping cookie
  auth on web alone forces the backend to support both — doubling auth
  surface area for every protected route.

The 1-week estimate in the original review is correct for the engineering
work, but the work itself is contingent on a re-decision. Doing it now would
contradict a decision we just shipped without new information.

**Unblock conditions** (any one):
1. A real XSS incident in production.
2. CSP report-only telemetry shows we cannot enforce within 4 weeks.
3. A B2B prospect or auditor explicitly requires `httpOnly` token storage.
4. The web surface gains a flow mobile doesn't share (e.g. SAML SSO for
   enterprise), making the parity argument moot.

**Lower-risk intermediate step** that is still on the backlog:
- Shorten access-token TTL from 7d to 1h, store the **refresh** token in a
  `httpOnly` cookie, keep the access token in memory (not localStorage).
  Mobile ignores the cookie. Tracked in `AUTH_TOKEN_STORAGE.md` backlog.

---

## 2. Strict CSP rollout (move from report-only to enforce)

**Status**: Not started — premature without report data.

**Why deferred**:
Report-only mode shipped less than a week ago. Promoting to enforce without
analyzing real-traffic violation reports is the textbook way to break
production for a subset of users (browser extensions, third-party widgets,
edge-case CDN paths). The 1-day estimate assumes you have report data; we
don't yet.

**What to do first** (sequence):
1. Add a `report-uri` to the CSP header pointing at Sentry's CSP ingest or a
   `/api/v1/metrics/csp` endpoint mirroring the existing `/metrics/vitals`
   pattern. This is the missing prerequisite — without it, "report-only"
   reports nowhere.
2. Wait 2–4 weeks of normal traffic.
3. Audit reports. Add domains for legitimate violations; remove
   `'unsafe-inline'`/`'unsafe-eval'` if no inline-script reports remain
   (likely possible once we move analytics behind a tag manager with
   nonces).
4. Flip header name from `Content-Security-Policy-Report-Only` to
   `Content-Security-Policy` in `frontend/next.config.js`.

**Unblock conditions**:
- Report ingestion endpoint live, and 2+ weeks of report data with zero
  unresolved violation classes from real users.

---

## 3. Route groups `(public)` / `(app)`

**Status**: Not started — structural refactor that needs per-page testing.

**Why deferred**:
Today the `app/` tree is flat: marketing pages
(`about`, `pricing`, `features`, `solutions`, `contact`, `privacy`, `terms`,
`resources/**`) sit alongside authenticated pages
(`dashboard`, `orders`, `products`, `inventory`, `customers`, `invoices`,
`shipments`, `channels`, `admin`, `settings`, `vendors`, `warehouses`,
`purchases`, `reports`, `integrations`, `help`, `onboarding`).

Moving them under `app/(public)/...` and `app/(app)/...` is mechanically
straightforward — but each group gets its own layout, and several pages
currently rely on the root `Providers` + `PageLoader` wiring which would
need to be redistributed. Plus the marketing layout differs from the
dashboard layout (the dashboard pages all wrap in `<DashboardLayout>`
manually today). Done badly this is a mass rewrite that blows up SEO meta,
shared headers, and the DashboardLayout pattern.

The 1-day estimate is realistic only if you:
1. Audit which pages are actually marketing-facing vs authed.
2. Decide whether `(app)/layout.tsx` should own `<DashboardLayout>` so
   per-page boilerplate goes away — this is a refactor by itself.
3. Move sequentially, page by page, with smoke tests after each.

This is the right shape for a focused PR by one engineer over a couple of
days, not something to bundle into a P2 hardening batch.

**Unblock conditions**:
- A scoped PR titled "frontend: route groups + layout consolidation" with
  a checklist of every page being moved.
- Playwright smoke suite passing after each page move.

---

## What *is* shipping in this P2 batch

| Item | Status |
|---|---|
| Skip-to-content link + landmark | ✅ |
| Web Vitals reporter (frontend) + `/metrics/vitals` ingest (backend) | ✅ |
| Lighthouse CI workflow (PR-triggered, asserts perf/a11y/best-practices/SEO) | ✅ |
| Storybook scaffold + Button/Modal/Loader/VirtualList stories | ✅ |
| `VirtualList` primitive (use it for channel catalog, audit log, etc.) | ✅ |
| JWT cookie migration | ⏸ Deferred (this doc) |
| Strict CSP rollout | ⏸ Deferred (this doc) |
| Route groups | ⏸ Deferred (this doc) |
