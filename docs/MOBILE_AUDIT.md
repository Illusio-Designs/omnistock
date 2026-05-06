# Mobile (Expo) screen audit

> Snapshot taken: 2026-05-06. Re-run when scope changes — port work
> happens incrementally and the line-count heuristic stops being a useful
> signal once every screen is feature-complete.

Classification key:
- ✅ **Functional** — has its own loaders, mutations, state, and CRUD UI
- 🟡 **Lightweight** — read-only or minimal feature set; covers the
  common case but is missing some web-side actions
- 📱 **Mobile-native** — exists only in the mobile app, no web equivalent
- 🔧 **Dev / internal** — not user-facing

| Screen | Status | Lines | Notes |
|---|---|---:|---|
| `dashboard.tsx`     | ✅ | 430 | Stats, recent orders, low-stock list, quick actions |
| `billing.tsx`       | ✅ | 724 | Plan, wallet, top-up, invoices, autopay — full feature parity |
| `orders.tsx`        | ✅ | 411 | List, filter, detail, status update, RTO actions |
| `channels.tsx`      | ✅ | 441 | Catalogue, connect/disconnect, sync status |
| `team.tsx`          | ✅ | 231 | List members, invite, role assignment |
| `settings.tsx`      | ✅ | 209 | Account, workspace, plan, biometric toggle (#25) |
| `more.tsx`          | ✅ | 195 | Secondary menu hub |
| `purchases.tsx`     | ✅ | 184 | Vendor invoicing, PO create/status |
| `reports.tsx`       | ✅ | 151 | Sales / inventory / RTO charts |
| `inventory.tsx`     | ✅ | 142 | Stock counts, adjustments, transfers |
| `products.tsx`      | ✅ | 135 | List, create, edit; channel sync from detail |
| `customers.tsx`     | ✅ | 117 | List, create, edit |
| `warehouses.tsx`    | ✅ | 105 | List, create, edit |
| `vendors.tsx`       | ✅ | 101 | List, create, edit |
| `admin.tsx`         | ✅ | 101 | Platform-admin only — tenants, plans switch |
| `invoices.tsx`      | 🟡 | 81  | List + view only; no manual draft / mark-paid action yet |
| `shipments.tsx`     | 🟡 | 60  | List + tracking lookup; no manual create flow yet |
| `ui-kit.tsx`        | 🔧 | 229 | Component showcase for designers |

## Gaps to close incrementally

1. **invoices.tsx** — port web's "Mark paid" + "Draft new invoice" actions. ~½ day.
2. **shipments.tsx** — port web's "Create shipment from order" flow. ~½ day.
3. **deep-linking**: every list screen accepts `?id=` from the URL; once #28 lands, links from email / push notifications can land here.
4. **offline cache** (#26): list reads on every screen above should survive no-network for at least the most recent fetch.

Nothing else is a "stub" today — `components/ScreenStub.tsx` is still there for future scaffolding but no `(app)/*.tsx` route uses it.
