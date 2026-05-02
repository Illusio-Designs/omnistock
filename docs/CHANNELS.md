# Kartriq Channel Inventory

Complete list of every channel registered in [`backend/src/data/channel-catalog.js`](../backend/src/data/channel-catalog.js).

**Status legend:**
- ✅ **Integrated** — adapter is built, sellers can connect today
- 🚧 **Pending backend** — listed in the catalog (`integrated: false`); UI shows it as "Coming Soon" until the adapter ships
- 🔐 **OAuth** — founder registers ONE app at `/admin/settings`, sellers click "Authorize"
- 📋 **Paste-form** — each seller generates keys in the channel's portal and pastes them into Kartriq
- 📝 **Manual** — no external API; tenant connects once, then records orders via the New Order form
- ⚠️ **Approval required** — channel requires a partnership / seller approval before API access is granted

For setup steps see [INTEGRATIONS.md](INTEGRATIONS.md).

---

## Totals

| Category | Total | Integrated | Pending backend | Manual-only | API-driven |
|---|---:|---:|---:|---:|---:|
| E-commerce marketplaces | 18 | 14 | 4 | 0 | 18 |
| Quick commerce | 4 | 4 | 0 | 0 | 4 |
| Logistics & shipping | 16 | 16 | 0 | 0 | 16 |
| Own-store / D2C | 9 | 9 | 0 | 2 | 7 |
| Social commerce | 3 | 3 | 0 | 0 | 3 |
| B2B | 3 | 3 | 0 | 2 | 1 |
| Custom | 2 | 2 | 0 | 1 | 1 |
| **Total** | **55** | **51** | **4** | **5** | **50** |

> **51 channels are connectable today; 4 e-commerce marketplaces are listed as Pending backend** — they appear in the catalog so tenants discover them and can request access, but the adapter still needs to be built before they can sync.

---

## 1. E-commerce marketplaces (18)

| Channel | Status | Connection | Approval | Features | Notes |
|---|:---:|:---:|:---:|---|---|
| Amazon India / .com / .co.uk | ✅ | 🔐 OAuth | ⚠️ | orders, inventory, tracking | SP-API. Founder app at `/admin/settings`. |
| Flipkart | ✅ | 🔐 OAuth | ⚠️ | orders, inventory | Marketplace API. |
| Myntra | ✅ | 📋 Paste-form | ⚠️ | orders, inventory | Vendor Hub credentials. |
| Meesho | ✅ | 📋 Paste-form | ⚠️ | orders, inventory | Supplier Panel API. |
| Nykaa | ✅ | 📋 Paste-form | ⚠️ | orders, inventory | Beauty / lifestyle. |
| Ajio | ✅ | 📋 Paste-form | ⚠️ | orders, inventory | Reliance Retail. |
| Tata Cliq | ✅ | 📋 Paste-form | ⚠️ | orders, inventory | Premium marketplace. |
| Snapdeal | ✅ | 📋 Paste-form | ⚠️ | orders, inventory | Value e-commerce. |
| GlowRoad | ✅ | 📋 Paste-form | ⚠️ | orders, inventory | Reseller marketplace (Amazon-owned). |
| JioMart | ✅ | 📋 Paste-form | ⚠️ | orders, inventory | Reliance grocery + general. |
| Paytm Mall | ✅ | 📋 Paste-form | ⚠️ | orders, inventory | Paytm commerce. |
| LimeRoad | ✅ | 📋 Paste-form | ⚠️ | orders, inventory | Fashion + lifestyle. |
| eBay | ✅ | 📋 Paste-form | — | orders, inventory | OAuth flow planned. |
| Etsy | ✅ | 📋 Paste-form | — | orders, inventory | Open API v3. |
| FirstCry | 🚧 | 📋 Paste-form | ⚠️ | orders, inventory | India's largest baby, kids & maternity store. **Adapter pending.** Logo: `firstcry.png`. |
| Pepperfry | 🚧 | 📋 Paste-form | ⚠️ | orders, inventory | Online furniture & home décor marketplace. **Adapter pending.** Logo: `pepperfry.png`. |
| Croma | 🚧 | 📋 Paste-form | ⚠️ | orders, inventory | Tata-backed consumer electronics retailer. **Adapter pending.** Logo: `croma.png`. |
| Tata Neu | 🚧 | 📋 Paste-form | ⚠️ | orders, inventory | Tata Group super-app. **Adapter pending.** Logo: `tataneu.png`. |

---

## 2. Quick commerce (4)

| Channel | Status | Connection | Approval | Features | Notes |
|---|:---:|:---:|:---:|---|---|
| Blinkit | ✅ | 📋 Paste-form | ⚠️ | orders, inventory | Formerly Grofers. Limited API access. |
| Zepto | ✅ | 📋 Paste-form | ⚠️ | orders, inventory | API via partnership only. |
| Swiggy Instamart | ✅ | 📋 Paste-form | ⚠️ | orders, inventory | Partner Network credentials. |
| BB Now (BigBasket) | ✅ | 📋 Paste-form | ⚠️ | orders, inventory | Tata-owned, instant delivery. |

---

## 3. Logistics & shipping (16)

### Aggregators (one API → many couriers)

| Channel | Status | Features | Notes |
|---|:---:|---|---|
| Shiprocket | ✅ | rates, shipment, tracking, pickup, cancel | 17+ couriers in one API. Most popular. |
| iThink Logistics | ✅ | rates, shipment, tracking, pickup, cancel | 20+ couriers. |
| NimbusPost | ✅ | rates, shipment, tracking, pickup, cancel | D2C-focused aggregator. |
| Pickrr | ✅ | rates, shipment, tracking, pickup, cancel | Shiprocket group. |
| Shipway | ✅ | rates, shipment, tracking, pickup, cancel | Post-ship CX platform. |
| ClickPost | ✅ | rates, shipment, tracking, cancel | Multi-carrier + post-ship. |
| Fship | ✅ | rates, shipment, tracking, pickup, cancel | Multi-carrier aggregator. |

### Direct couriers

| Channel | Status | Features | Notes |
|---|:---:|---|---|
| Delhivery | ✅ | rates, shipment, tracking, pickup, cancel | India's largest logistics network. |
| Ecom Express | ✅ | shipment, tracking | Also via Shiprocket. |
| Xpressbees | ✅ | shipment, tracking | Tech-first D2C logistics. |
| Shadowfax | ✅ | shipment, tracking | Last-mile + hyperlocal. |
| BlueDart | ✅ | shipment, tracking | DHL Group. Premium express. |
| DTDC | ✅ | shipment, tracking | Pan-India courier + cargo. |
| FedEx | ✅ | shipment, tracking, rates | Global express. |
| DHL | ✅ | shipment, tracking, rates | International express. |
| UPS | ✅ | shipment, tracking, rates | Global package delivery. |

> All direct couriers are also accessible through Shiprocket / Delhivery aggregators.

---

## 4. Own-store / D2C platforms (9)

| Channel | Status | Connection | Features | Notes |
|---|:---:|:---:|---|---|
| Shopify | ✅ | 🔐 OAuth | orders, inventory | Founder public app + per-store install. |
| Amazon Smart Biz | ✅ | 🔐 OAuth | orders, webhook, MCF, FBA inventory | Shares Amazon SP-API app. |
| WooCommerce | ✅ | 📋 Paste-form | orders, inventory | WordPress-based store. |
| Magento / Adobe Commerce | ✅ | 📋 Paste-form | orders, inventory | Enterprise OSS. |
| BigCommerce | ✅ | 📋 Paste-form | orders, inventory | Cloud SaaS commerce. |
| OpenCart | ✅ | 📋 Paste-form | orders, inventory | Free OSS platform. |
| Custom Website | ✅ | 📋 Webhook + HMAC | webhook, hmac validation, field mapping | Same adapter as `CUSTOM_WEBHOOK`. |
| Offline / Retail Store | ✅ | 📝 Manual | manual | No API. Connect once; enter orders via New Order form. |
| POS System | ✅ | 📝 Manual | manual | No API. CSV import or manual entry. |

---

## 5. Social commerce (3)

| Channel | Status | Connection | Features | Notes |
|---|:---:|:---:|---|---|
| Instagram Shopping | ✅ | 🔐 OAuth (Meta) | orders | One Meta app covers IG + FB + WA. |
| Facebook Shop | ✅ | 🔐 OAuth (Meta) | orders | Same Meta app. |
| WhatsApp Business | ✅ | 🔐 OAuth (Meta) | orders, webhook | Same Meta app. |

---

## 6. B2B (3)

| Channel | Status | Connection | Features | Notes |
|---|:---:|:---:|---|---|
| B2B Portal | ✅ | 📋 Webhook | webhook, manual | Receives orders via webhook (CustomWebhook adapter). Optional HMAC secret. |
| Wholesale Channel | ✅ | 📝 Manual | manual | No API. Record bulk wholesale orders via New Order form. |
| Distributor | ✅ | 📝 Manual | manual | No API. Record distributor orders via New Order form. |

---

## 7. Custom (2)

| Channel | Status | Connection | Features | Notes |
|---|:---:|:---:|---|---|
| Custom Webhook | ✅ | 📋 Webhook + HMAC | webhook, hmac validation, field mapping | Universal receiver. POST `/api/v1/channels/:id/webhook` with `x-kartriq-signature` HMAC-SHA256 header. |
| Other | ✅ | 📝 Manual | manual | Catch-all for one-off / experimental channels. Manual order entry. |

---

## What's NOT included

These are intentionally **not** in the catalog right now:

| Item | Why it's not built |
|---|---|
| Walmart Marketplace | No India presence, low demand for current target market. |
| Wayfair / Houzz / overstock category-specific marketplaces | Niche; can be added on request. |
| Amazon FBA inbound shipment management | Marketplace adapter does inventory + orders only. FBA inbound TBD. |
| TikTok Shop | Limited India availability; on the radar. |
| Reliance JioMart Digital (kirana app) | Different from JioMart marketplace; separate API. |
| Razorpay Magic Checkout / Hubble / hyperlocal aggregators | Out of scope for inventory/order management. |
| Returns-only platforms (Pickrr Returns, etc.) | Returns covered by parent shipping aggregator. |
| ERP connectors (SAP, Oracle, Tally) | Roadmap — `apiIntegration` plan feature gates this. |

---

## How to add a new channel

1. Add an entry to `backend/src/data/channel-catalog.js` with `type`, `category`, `name`, `credentialsSchema`, `applyUrl`, `docsUrl`, and `integrated: false` initially.
2. Build the adapter under `backend/src/services/channels/<category>/<name>.js` exporting at minimum `testConnection`, `fetchOrders`, `pushInventory` (or carrier equivalents).
3. Wire it into the category dispatcher in `backend/src/services/channels/<category>/index.js`.
4. Add a matching schema in `frontend/lib/channel-schemas.ts` so the Connect modal renders the right fields with `?` tooltip help text.
5. Flip `integrated: true` in the catalog. The channel appears live for tenants on `/channels` next page load.

---

_Last updated: 2026-04-30_
