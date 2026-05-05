# P3 Items — Deferred With Rationale

The original review marked two P3 items as **conditional**:

> - PWA via next-pwa **if mobile parity matters**
> - i18n scaffolding **if expanding beyond IN/EN**

Both conditions are currently false for Kartriq. This file records why and
what would unblock each.

---

## 1. PWA via `next-pwa`

**Status**: Not started — condition not met.

**Why deferred**:
The product already ships a **native mobile app** (Expo + React Native in
`/mobile`) hitting the same `/api/v1` backend. A PWA gives:

- Install-to-home-screen on Android and (limited) iOS.
- Offline shell + Service Worker caching for static assets.

But it does **not** give a competitive mobile experience for an inventory /
order-management app: warehouse staff scanning barcodes, managers approving
shipments on the move, push notifications for stockouts — those are all
better delivered through the native Expo app where you have:

- Native barcode scanner (`expo-barcode-scanner`) without browser camera
  permission ceremony.
- Background sync via Expo's task manager.
- Native push notifications (`expo-notifications`) with proper badge counts.
- Razorpay's native checkout SDK (`react-native-razorpay`) — already wired —
  rather than the web checkout iframe.

Adding a PWA on top of this is duplicate work: two mobile surfaces to keep
visually + functionally in sync, with the PWA strictly inferior on every
mobile-native capability the product actually depends on.

**The cheap parts of "PWA"** that *are* worth doing without committing to
`next-pwa`:

- ✅ `manifest.json` — already shipped (`app/layout.tsx` references
  `/manifest.json`). Needed for the favicon/share-card story regardless.
- ⏳ Add `<meta name="apple-mobile-web-app-capable">` for iOS users who
  install the marketing site to home screen — 1 line.
- ⏳ Set `Cache-Control: public, max-age=31536000, immutable` on
  `/_next/static/**` via `next.config.js` headers — already implicit from
  Next's defaults but worth pinning.

**Unblock conditions** (any one):
1. The Expo app is being deprecated and web becomes the only mobile target.
2. We ship features that benefit from offline (e.g. warehouse picking with
   intermittent Wi-Fi) on the **web** rather than mobile.
3. A B2B prospect asks for "no app install required, runs in browser" as a
   procurement requirement.

---

## 2. i18n scaffolding

**Status**: Not started — condition not met.

**Why deferred**:
Today Kartriq is single-locale: English-only UI, INR currency, IST timezone
(`Asia/Kolkata`), India-specific tax rules (GSTIN), Indian payment gateway
(Razorpay), Indian logistics partners (Shiprocket, Delhivery, etc.). The
domain logic is woven through dozens of routes:

- `gstin` validation in customer/tenant schemas.
- `formatCurrency` defaults to INR.
- HSN codes in the product schema.
- IGST/CGST/SGST split in invoice line items.
- DateTime formatters use `en-IN` locale assumption.

Adding `next-intl` (or similar) gives string extraction — but **not**
locale-aware tax, currency, or address logic. Those need separate refactors
that should follow the actual market expansion, not precede it
speculatively. Putting i18n scaffolding in now means:

- Every new string needs a key + lookup, slowing day-to-day feature work.
- The translation files become stale (no translators using them).
- The "easy" win of locale switching is misleading — the product still
  fails for non-IN users because of the deeper assumptions.

**Unblock conditions** (sequence required):
1. **Decision**: a specific second market (UAE, US, SEA, EU). Each requires
   different work — tax (VAT/GST/Sales Tax), currency, address format,
   date format, payment gateway.
2. **Refactor first**: extract currency / tax / date helpers to a locale
   module *before* string i18n. Strings are the easy 20% — the locale
   model is the hard 80%.
3. **Then** add `next-intl` (or `next-i18next`) with proper namespacing per
   feature area, not one global bundle.

**Cheap things worth doing in advance** (no scaffolding needed):
- ✅ All user-facing strings already live in JSX, not in API responses, so
  they're extractable later. Backend doesn't return localized strings —
  good.
- ⏳ Audit `formatCurrency` to take an explicit currency code rather than
  defaulting to INR in the helper itself. ~15 minutes, no scaffolding cost.
- ⏳ Audit DateTime formatting for hardcoded `'en-IN'` strings — same idea:
  pass the locale explicitly so swapping it later is one prop, not 200
  edits.

---

## What *is* shipping in this P3 batch

| Item | Status |
|---|---|
| Dependabot config (3 npm workspaces + GH Actions) | ✅ |
| Weekly npm audit workflow + per-PR gate on high/critical CVEs | ✅ |
| Vitest + RTL component testing scaffold + Button/Loader/Modal tests | ✅ |
| `vitest run` wired into the PR CI pipeline | ✅ |
| Playwright visual regression suite + opt-in `visual-check` label workflow | ✅ |
| PWA via next-pwa | ⏸ Deferred (Expo app already covers native mobile) |
| i18n scaffolding | ⏸ Deferred (single-market until expansion decided) |
