# Senior Frontend Review — Kartriq

> Honest production-readiness review of `/home/user/omnistock/frontend`
> Date: 2026-05-04
> Stack: Next.js 14 (app router) + React 18 + TypeScript 5 + Tailwind 3 + Zustand + React Query 5
> Companion to `docs/BACKEND_REVIEW.md`

---

## TL;DR

The frontend is **visually polished and structurally sane** — App Router, typed Axios layer, Zustand+RQ split, Radix UI primitives, Tailwind theming, sane file layout. It will look great in a demo and works for the happy path.

But it is **not production-grade for a SaaS handling real money** for a different set of reasons than the backend:

1. **Almost everything is a Client Component.** 86 of ~100 page-level files start with `'use client'`. Public marketing pages (`/`, `/integrations`, `/pricing`, `/about`, `/contact`) hydrate the React runtime then fetch — kills SEO performance and Largest Contentful Paint.
2. **JWT in `localStorage`** (`lib/api.ts:11`, `store/auth.store.ts:93`) — any XSS = full account takeover. There WAS one real XSS vector at audit time (the blog markdown renderer permitted `javascript:` URLs at `app/resources/blog/[slug]/page.tsx:37`) — **fixed in the same commit as this review**.
3. **Razorpay `checkout.js` loaded with no SRI** (`app/dashboard/billing/page.tsx:113`, `components/wallet/TopupModal.tsx:25`) — third-party script compromise = card stealer in your checkout.
4. **No Content-Security-Policy** in `next.config.js` — only the basic helmet-equivalent headers. Given JWT-in-localStorage + dangerouslySetInnerHTML, CSP is your last line of defence.
5. **No virtualization anywhere.** The 169-channel integrations grid, the orders/products/inventory tables, audit logs — all render every row to the DOM. Fine at 100, painful at 5,000.
6. **No tests at all.** No Jest, no Playwright, no Storybook, no component test, no visual regression. The backend at least has an e2e runner; the frontend has nothing.
7. **No error/observability.** No Sentry, no Datadog RUM, no LogRocket — frontend errors disappear into the user's console.
8. **No `.env.example`** — onboarding a new developer is "go read the source for `process.env.NEXT_PUBLIC_*`".

None of these are showstoppers for beta. All of them matter before you take real customer credit cards at volume.

---

## 1. Architecture

### What's good

- **Clean folder layout** — `app/` (routes), `components/ui/` (primitives), `components/layout/` (shells), `store/` (Zustand), `lib/api.ts` (single typed Axios layer), `hooks/`. One job per directory.
- **Typed API client** — every backend route has a corresponding helper in `lib/api.ts` (`orderApi.list`, `paymentApi.checkout`, etc.). Pages don't construct URLs.
- **Sensible state split** — Zustand for client state (`auth`, `search`, `ui`, `toast`), React Query for server state. No Redux bloat.
- **JWT injection is centralized** at `lib/api.ts:9-17` — request interceptor pulls from localStorage; impersonation header `x-tenant-id` from the same place.
- **Global 401/402 handling** — `lib/api.ts:24-41` redirects on 401 and surfaces plan-limit modal on 402 via a registered callback. Pages don't repeat this logic.
- **Auth context refresh on every dashboard mount** — `DashboardLayout.tsx:24-47` validates the token against `/auth/me` and refreshes user/tenant/plan/permissions. Stale state is bounded.
- **Radix UI primitives** under `components/ui/` — accessible by default (Dialog, DropdownMenu, Tabs, Select, Toast). Better than rolling your own.
- **`generateMetadata` + `sitemap.ts` + `robots.ts` exist** — SEO basics aren't missing entirely.
- **JSON-LD `SoftwareApplication`** structured data injected in root layout (`app/layout.tsx:101-126`).
- **`metadataBase`, OpenGraph, Twitter cards** all configured.
- **Next/font with Plus_Jakarta_Sans + `display: 'swap'`** — no FOIT.

### What needs work

| Concern | Why it matters | Suggested fix |
|---|---|---|
| **86 of ~100 `app/*` files are `'use client'`** | Every public page hydrates the React runtime before rendering. LCP suffers; rich-snippet preview tools choke. | Convert public marketing pages to Server Components. Fetch in the server component, pass data as props to a small client island for interactivity. |
| **No route groups for `(public)` vs `(dashboard)`** | The auth-gated routes and the public ones share the same root layout. Heavy providers ship to every page. | Add `app/(public)/layout.tsx` and `app/(app)/layout.tsx` route groups. Keep the heavy providers out of the public bundle. |
| **No central permission gate** | Each page calls `hasPermission(...)` inline. Easy to forget. | Add a `<RequirePermission codes={...}>` HOC used by all dashboard pages. |
| **Multi-tenant impersonation is `localStorage`-driven** | `localStorage.setItem('impersonate-tenant', id)` (`auth.store.ts:105`). Backend gates by `isPlatformAdmin` (so risk is contained), but a non-admin gets a sticky 403 they can't undo. | Server-side validate; trigger `stopImpersonation()` automatically on auth/me failure. |
| **169-channel catalog renders every tile** | `app/integrations/page.tsx:241-244` maps every filtered item to a DOM node + an `<img>` with logo.dev fetch. 169 image requests on first paint. | Lazy-render below-the-fold categories with `IntersectionObserver`; cache fail-states in localStorage. |
| **`ChannelLogo` uses `<img>` not `next/image`** | No automatic AVIF/WebP, no responsive `srcset`, no built-in CDN caching. | Add `images.remotePatterns` for `img.logo.dev`, `icons.duckduckgo.com`, `www.google.com`. Use `next/image`. |
| **Public pages fetch everything client-side** | `app/page.tsx:39-45` makes 6 sequential `publicApi.*` calls in `useEffect`. Spinner-then-paint UX. | Move to server fetching with `next.revalidate`. |
| **No `error.tsx` per route segment** | A crash falls back to the global `app/error.tsx`. Lose page-level context. | Add segment-level `error.tsx` in `app/dashboard/`, `app/admin/`, `app/orders/` etc. |
| **No `loading.tsx` anywhere** | Every page rolls its own loader. Streaming suspense is unused. | Add `loading.tsx` per route segment. |
| **`global-error.tsx` is missing** | If the root layout itself throws, you get the Next.js default error page. | Add `app/global-error.tsx`. |
| **86 client components is high for an app-router project** | The whole point of app router is server-first. Effectively running CRA-on-app-router. | Audit each page: anything without `useState`/`useEffect`/`onClick` should drop the directive. |

---

## 2. Performance

### What's good

- **`Plus_Jakarta_Sans` via `next/font`** with `display: 'swap'` — zero layout shift on font load.
- **React Query default `staleTime: 30_000` + `retry: 1`** (`components/layout/Providers.tsx:9-11`) — sensible for a CRUD app.
- **Razorpay checkout.js lazy-loaded** on first checkout/topup click only.
- **Tailwind JIT default in v3** — final CSS only includes used classes.
- **`reactStrictMode: true`** — catches double-mount bugs early.
- **`react-loading-skeleton`** used on landing page — perceived performance during data load.
- **`Skeleton`, `Shimmer`, `EmptyState`, `Loader` UI primitives** — consistent loading UX.

### What needs work

| Concern | Why it matters | Suggested fix |
|---|---|---|
| **No virtualization on any list** | `app/integrations/page.tsx` renders all 169 tiles, audit log page renders all rows in memory. 5,000-row tables freeze the main thread. | `@tanstack/react-virtual` (free, official). Wrap any list >100 rows. Audit log most urgent. |
| **No `next/image`** | 169 logos = 169 origin fetches with no CDN, no AVIF, no `srcset`. | Add `images.remotePatterns` and migrate. |
| **No bundle analyzer** | No idea how large the client bundle is. | `@next/bundle-analyzer`; `ANALYZE=true npm run build`. |
| **`recharts` ships eagerly** | ~100 KB gzipped. | `dynamic(() => import('./ChartCard'), { ssr: false })`. |
| **No `output: 'standalone'`** | Docker image carries `node_modules` (~500 MB) instead of slim bundle (~50 MB). | One-line fix in `next.config.js`. |
| **Sequential public API fetches on landing** | `app/page.tsx:39-45` fires 6 promises sequentially. All independent. | `Promise.all` or move to server fetching. |
| **N+1 React Query risk on dashboard** | `app/dashboard/billing/page.tsx:38-45` uses raw axios — no caching, refetches on every navigation. | Convert to `useQuery` keyed by `['billing','subscription']` etc. |
| **`useFilteredBySearch` re-filters on every keystroke** | Fine at 20 rows, breaks at 1,000. | Server-side filter when `searchQuery` is set; debounce input. |
| **`/auth/me` fired on every dashboard mount** | Even fast page-to-page navigation re-validates. | Cache in Zustand for 60s. |
| **No service worker / PWA** | `manifest.json` exists but no `next-pwa`. App is online-only. | Add if mobile parity matters; otherwise document. |
| **Razorpay script body-injected** | First-time top-up users wait ~300 ms. | `<link rel="preconnect" href="https://checkout.razorpay.com">` in head. |

---

## 3. Security

### What's good

- **JWT injection in one place** — auditable.
- **HSTS header** with 2-year `max-age` and `preload`.
- **`X-Frame-Options: SAMEORIGIN`** — clickjacking-protected.
- **`X-Content-Type-Options: nosniff`** — MIME-sniff blocked.
- **`Permissions-Policy: camera=(), microphone=(), geolocation=()`** — disables risky browser features.
- **`poweredByHeader: false`** — strips `X-Powered-By`.
- **No `cookie` library imported** — confirms no CSRF surface from cookies.
- **Radix Dialog/DropdownMenu** — accessible focus trap + keyboard handling.
- **Markdown escapes `& < >`** in inline content.

### What needs work

| Concern | Severity | Notes |
|---|---|---|
| **`[text](url)` regex permits `javascript:` href** | **HIGH (FIXED)** | `app/resources/blog/[slug]/page.tsx:37` — was `<a href="$2">` with no scheme check. With JWT in localStorage = full account takeover. **Fixed in this commit** — `safeHref()` helper allow-lists `http(s)`, `mailto`, relative paths only; `attrEscape()` prevents quote-escape; `rel="nofollow noopener"` added. |
| **JWT in localStorage** | HIGH | Standard XSS = token exfil. The 7-day token lifetime makes this worse. Mitigations: move to httpOnly cookie + CSRF, or strict CSP. |
| **No Content-Security-Policy header** | HIGH | Given `dangerouslySetInnerHTML` + JWT-localStorage + 3rd-party Razorpay/logo.dev/GA/FB/Clarity, CSP is the last line of defence. |
| **Razorpay `checkout.js` loaded with no SRI** | MEDIUM | URL is mutable so SRI not viable — strict CSP `script-src` allowlist is the answer. |
| **GA + FB Pixel + Clarity scripts loaded based on backend tracking IDs** | MEDIUM | If `/public/tracking` is compromised, arbitrary script ID can be injected. Lock down via CSP. |
| **Dev `.env` URLs hardcode `:5000` vs `:5001`** | LOW | `app/sitemap.ts:3` says `:5000`; `lib/api.ts:4` says `:5001`. Inconsistency. |
| **No `.env.example`** | LOW (operational) | New devs guess the variables: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_FB_PIXEL_ID`, `NEXT_PUBLIC_CLARITY_ID`. |
| **No npm audit / Dependabot** | LOW | No CI either. |
| **GDPR / DELETE-my-account flow on frontend** | MEDIUM (regulatory) | No "Delete my account" affordance in `app/settings/`. |
| **Source maps in production** | UNKNOWN | Confirm in built artifact. |

---

## 4. SEO & accessibility

### What's good

- **`generateMetadata` with dynamic SEO fetch from CMS**.
- **`sitemap.ts` + `robots.ts`** — sitemap has dynamic blog post + SEO paths via 1-hour ISR.
- **OpenGraph + Twitter card metadata.**
- **`metadataBase`** correctly set.
- **JSON-LD `SoftwareApplication`** at root layout — rich snippet eligible.
- **`manifest.json`** for PWA install hint.
- **Radix primitives** = correct ARIA roles, focus trapping, keyboard nav for free.

### What needs work

| Concern | Why it matters | Fix |
|---|---|---|
| **All public pages are client-rendered** | Lighthouse SEO score suffers due to LCP. | Server-render `/`, `/integrations`, `/pricing`, etc. |
| **OG image is `og-image.svg`** | Twitter/Slack often don't render SVG OG images. | Replace with 1200×630 PNG. |
| **Public landing fetches stats client-side** | Crawlers without JS see incomplete content (`56+`, `—`). | Server-fetch in page.tsx. |
| **Only 24 `<label>` / `htmlFor` in entire frontend** | Most form inputs lack labels. Screen readers can't navigate. | Audit `Input`, `Select` primitives. |
| **Only 10 `aria-*` attributes total** | Icon-only buttons unlabelled for screen readers. | Add `aria-label` to every icon-only button. |
| **No skip-to-content link** | Keyboard users tab through the whole sidebar. | `<a href="#main">Skip to main content</a>` at top of `DashboardLayout`. |
| **`Loader fullScreen`** without `role="status"` | Screen readers don't announce loading. | Add `role="status"` + `aria-live="polite"`. |
| **Color contrast** | `text-slate-400`/`-500` on white edge of WCAG AA. Brand teal `#06D4B8` on white fails AA for body. | Push body text to `slate-700`. |
| **`<input>` without `autoComplete`** | Login + onboarding forms missed. Browsers can't autofill. | Add `autoComplete="email"`, `autoComplete="current-password"`, `autoComplete="new-password"`. |

---

## 5. Production / DevOps

### What's good

- **`next.config.js` has security headers**, `poweredByHeader: false`, image config.
- **`reactStrictMode: true`**.
- **`PageLoader`** for route transitions.
- **`Toaster`** for consistent UX feedback.
- **Idempotent `useEffect` guard against tokens** in `DashboardLayout.tsx:25-29`.
- **`getTokenExpiry` / `isTokenExpired`** decode `exp` client-side without library.

### What needs work

| Concern | Why it matters | Fix |
|---|---|---|
| **No frontend error tracking** | Production crashes invisible. | Sentry frontend SDK; 5-min install. |
| **No frontend RUM** | No idea what real LCP/INP/CLS look like. | Vercel Analytics or `web-vitals` → backend `/metrics`. |
| **No CI** | No pipeline runs `npm run lint` or `npm run build` on PRs. | GitHub Actions: `next build` + `tsc --noEmit` on every PR. |
| **No `output: 'standalone'`** | Larger Docker image. | One-line fix. |
| **No `.env.example`** | Onboarding cost. | Add it; document the 5 `NEXT_PUBLIC_*` keys. |
| **Inconsistent `:5000` vs `:5001`** | Confusing dev setup. | Pick one (5001 matches backend default). |
| **No `global-error.tsx`** | Root-layout crashes show Next default page. | Add one. |
| **No segment-level `error.tsx` / `loading.tsx`** | All errors bubble to one global handler. | Add per dashboard segment. |
| **No bundle analyzer** | Can't see what's bloating bundles. | `@next/bundle-analyzer`. |
| **No `revalidate` strategy on public pages** | Public pages hit the API on every request. | After moving to server components, set `revalidate: 300`. |
| **No deployment story documented** | Vercel? Self-hosted? Docker? | Document in `frontend/README.md` or `RUNBOOK.md`. |
| **Source maps in prod** | If shipped, leak the entire codebase. | Confirm `productionBrowserSourceMaps` is unset. |

---

## 6. Code quality / testing

### What's good

- **`tsconfig.json` has `strict: true`**.
- **Path alias `@/*`** — clean imports.
- **One `Button`, one `Modal`, one `Input`** under `components/ui/`.
- **CVA + `tailwind-merge`** — modern, type-safe variant system.
- **`ErrorBoundary`** at `Providers` root.
- **Consistent toast / loader / modal primitives** — pages don't reinvent UX.
- **The CLAUDE.md frontend checklist is good**.

### What needs work

| Concern | Why it matters | Fix |
|---|---|---|
| **254 `: any` / `as any` / `<any>`** | TypeScript value lost wherever they appear. | `tsc --noEmit --noImplicitAny` in CI; replace high-traffic hotspots. |
| **No tests of any kind** | No Jest, no RTL, no Playwright, no Storybook. | Start with one Playwright smoke test: log in → nav → render. Expand. |
| **No ESLint config file** | Using `next lint` defaults. No `no-console`, no `react-hooks/exhaustive-deps`. | `.eslintrc.json` extending `next/core-web-vitals`; enable `no-console: warn`, `@typescript-eslint/no-explicit-any: warn`. |
| **No Prettier config** | Whitespace inconsistency in PRs. | `.prettierrc`. |
| **`useEffect(..., [])` ignores deps** | `DashboardLayout.tsx:47` — empty array but uses `token`, `setContext`, `logout`, `router`. | Fix dep array OR `useEffectEvent` / `useRef`. |
| **`toast.error(e?.response?.data?.error || ...)` repeated 30+ times** | Duplicated extraction. | `errorMessage(e)` util in `lib/utils.ts`. |
| **`(window as any).Razorpay`** in two places | Type holes. | Declare ambient type in `globals.d.ts`. |
| **Some page files >400 lines** | Hard to review. | Extract sub-components. |
| **No Storybook for UI components** | Hard to onboard. | Storybook 8 with `@storybook/nextjs`. |

---

## 7. Mobile parity

The sister `mobile/` Expo app shares route shape with the frontend (each page in `frontend/app/<feature>/page.tsx` has a sibling `mobile/app/(app)/<feature>.tsx`). Quick parity check on recent backend changes:

| Backend feature | Frontend wired? | Mobile wired? |
|---|---|---|
| `PATCH /auth/me` | Yes (settings page) | Yes |
| `POST /auth/change-password` | Yes | Yes |
| `PATCH /billing/tenant` | Yes | Yes |
| Wallet top-up + Razorpay | Yes (`TopupModal`) | Yes (`razorpay.ts` + `react-native-razorpay`) |
| Auto-renew toggle | Yes | Untested — verify in `mobile/app/(app)/billing.tsx` |
| Plan limit modal (402) | Yes | Likely missing — `mobile/lib/api.ts` has no `setPlanLimitHandler` analog |
| Impersonation header | Yes | Likely missing on mobile |

**Bottom line**: parity is mostly there for self-service endpoints. Cross-cutting client behaviours (402 handler, impersonation header, token expiry check) are likely backend-only or only on web. Audit `mobile/lib/api.ts` for matching interceptors before declaring "feature parity".

---

## Scalability / capacity statement

The frontend is a stateless SPA. Its scaling story is mostly *the CDN's*. Notable per-user costs:

| Resource | Comfortable | Strained | Will fail |
|---|---:|---:|---:|
| **Concurrent connected users (CDN-served)** | Tens of thousands | hundreds of thousands | bounded by CDN |
| **Concurrent dashboard users (API+frontend)** | Backend-limited (~200) | — | — |
| **Largest list rendered (no virtualization)** | up to ~500 rows | 500 – 5,000 | 5,000+ |
| **Channels in catalog** | 169 today; OK | 500+ tiles will choke first paint | 1,000+ |
| **JS bundle size** | unknown — analyzer not run | — | — |

**Top frontend bottlenecks**:
1. **Public pages are client-rendered** → Googlebot LCP > 4s likely; conversion impact, not "system breaks".
2. **`/auth/me` on every dashboard mount** → adds ~100ms to every page nav.
3. **No virtualization** → audit log / analytics tables freeze at 5k+ rows.
4. **Razorpay first-load latency** → 300ms before checkout opens.
5. **Bundle size unmeasured** → almost certainly room to drop ~30%.

The frontend is **not** what limits your scale. The backend's 50–500 tenant ceiling is the real wall. But the frontend is what limits **conversion**: a 4-second LCP on `/pricing` costs you signups.

---

## Action plan — prioritized

### P0 — must-do before paying customers

1. ✅ **Fix the markdown link XSS** in `app/resources/blog/[slug]/page.tsx:37`. **DONE in this commit.**
2. **Add a Content-Security-Policy header** in `next.config.js`. Start report-only. **1 hour.**
3. **Sentry frontend SDK** with `@sentry/nextjs`. **30 minutes.**
4. **`.env.example`** for `frontend/`. **10 minutes.**
5. **`tsc --noEmit` + `next lint` + `next build`** in GitHub Actions on every PR. **2 hours.**
6. **Audit JWT-in-localStorage decision**: (a) accept + tighten CSP, or (b) move to httpOnly cookie + CSRF. Document the choice. **half-day discussion.**
7. **`output: 'standalone'`** in `next.config.js`. **2 minutes.**
8. **Fix `:5000` vs `:5001` dev URL inconsistency**. **5 minutes.**

### P1 — within 1 month

9. **Convert public marketing pages to Server Components**. **2-3 days.**
10. **Add segment-level `error.tsx` and `loading.tsx`**. **1 day.**
11. **Add `global-error.tsx`**. **15 minutes.**
12. **Run `@next/bundle-analyzer`**, code-split `recharts`. **half-day.**
13. **`next/image` for channel logos** with `images.remotePatterns`. **half-day.**
14. **Smoke-test Playwright suite** — login, dashboard render, create order, checkout flow. **2 days.**
15. **Accessibility pass**: `aria-label` on icon-only buttons, `role="status"` on Loader, audit form labels. **1 day.**
16. **Convert dashboard fetching to React Query**. **2 days.**
17. **Cap `: any` count**: enable `@typescript-eslint/no-explicit-any: warn`, fix top-50. **1 day initially, ongoing.**

### P2 — within 3 months

18. **Move JWT to httpOnly cookie + add backend CSRF**. **1 week.**
19. **Virtualize lists >100 rows** with `@tanstack/react-virtual`. **2 days.**
20. **Storybook for `components/ui/*`**. **2 days.**
21. **Web Vitals reporting** to backend metrics endpoint. **half-day.**
22. **Lighthouse CI** in GitHub Actions on PRs. **half-day.**
23. **Strict CSP rollout** (move from report-only to enforce). **1 day.**
24. **Skip-to-content link + keyboard-nav audit**. **1 day.**
25. **Route groups `(public)` / `(app)`**. **1 day.**

### P3 — within 6 months

26. **Dependabot + weekly `npm audit`** in CI.
27. **Component test coverage** (RTL) for `components/ui/*` primitives.
28. **PWA via `next-pwa`** if mobile parity matters.
29. **Visual regression** via Playwright screenshots / Chromatic.
30. **i18n scaffolding** if expanding beyond IN/EN.

---

## Risk summary

| Risk | Likelihood | Impact | Status |
|---|---|---|---|
| **XSS via blog markdown `[link](javascript:...)`** | n/a | CRITICAL | **FIXED** in this commit |
| **JWT exfil via any future XSS** | MEDIUM | CRITICAL | Mitigated only by lack-of-XSS today; CSP is the real fix |
| **Razorpay CDN compromise → card stealer** | LOW | CRITICAL | No SRI possible (mutable URL); CSP + monitoring is the only mitigation |
| **Frontend error invisible to ops** | HIGH (every error) | LOW per error, MEDIUM cumulative | No Sentry; can't debug what users hit |
| **Public-page LCP > 4s** | HIGH | MEDIUM (conversion) | All public pages client-rendered |
| **Audit-log / inventory page locks browser** | MEDIUM (at 5k+ rows) | MEDIUM | No virtualization |
| **Vendor regression on `npm install`** | MEDIUM | MEDIUM | No CI, no Dependabot |
| **Source maps leaked in prod** | UNKNOWN | MEDIUM | Confirm in build artifact |
| **Impersonation header set by non-admin** | LOW | LOW (backend gates) | UX bug only — gets sticky 403 |
| **Bundle size unmeasured** | HIGH | LOW–MEDIUM | Run analyzer |
| **No tests** | HIGH | HIGH on regressions | Backend has e2e; frontend has zero |

---

## Bottom line

The frontend looks and feels like a polished, modern Next.js 14 SaaS UI. The bones are good: Radix primitives, Tailwind theming, typed API layer, sensible state split, App Router metadata, Zustand+RQ combo.

What you're missing is the **production hardening layer**: error tracking, CI, tests, CSP, server-component conversions, virtualization, and one specific XSS fix (now closed).

The single most leveraged hour: **CSP report-only header + Sentry + `.env.example` + `output: 'standalone'`**. That's a 90-minute commit that materially raises your security posture and operational maturity.

The single most leveraged week: **convert public marketing pages to Server Components + run `@next/bundle-analyzer` + Playwright smoke tests + add CI**. That moves you from "demo-ready SPA" to "production-ready Next.js app".

Skip i18n, PWA, Storybook, visual regression until those are in. They are good things — just not before the basics.
