# Channel App Registration — Founder's Checklist

Where Kartriq (and / or your tenants) need to register an app, get API credentials, or apply as a partner. Sourced from `backend/src/data/channel-catalog.js`.

**Two kinds of registration:**
- **Partnership (Kartriq-level)** — you register ONE global app. All tenants OAuth into it. One-click onboarding. Best UX.
- **Per-seller credentials (tenant-level)** — each tenant gets their own API key from the channel. No Kartriq partnership needed but more friction per tenant.

**Priority key:**
- 🔴 **P0** — major channel, do first
- 🟡 **P1** — important, do soon
- 🟢 **P2** — nice to have, do when bandwidth allows
- ⚪ **P3** — niche / low traffic, defer

---

## Quick summary — what to register and where

| # | Channel | Type | Partnership available? | Priority | Status |
|---|---|---|---|---|---|
| 1 | **Amazon India** (SP-API) | ECOM | ✅ Yes — Developer Portal | 🔴 P0 | Submitted, awaiting review |
| 2 | **Flipkart** | ECOM | ✅ Yes — MSP Program | 🔴 P0 | Not started |
| 3 | **Shopify** | OWNSTORE | ✅ Yes — Shopify Partners (free, instant) | 🔴 P0 | Not started |
| 4 | **Meesho** | ECOM | ✅ Yes — Open API Partner | 🔴 P0 | Not started |
| 5 | **Instagram + Facebook Shop** | SOCIAL | ✅ Yes — Meta for Developers | 🟡 P1 | Not started |
| 6 | **WhatsApp Business** | SOCIAL | ✅ Yes — Meta for Developers (same app) | 🟡 P1 | Not started |
| 7 | **Myntra** | ECOM | ✅ Yes — Vendor Hub Partner | 🟡 P1 | Not started |
| 8 | **Amazon Smart Biz** | OWNSTORE | ✅ Yes — same Amazon LWA app as SP-API | 🟡 P1 | Auto-shared with Amazon |
| 9 | **Nykaa** | ECOM | ⚠️ Per-seller only (no public partner program) | 🟡 P1 | Tenant-side only |
| 10 | **Ajio** | ECOM | ⚠️ Per-seller only (closed enterprise program) | 🟡 P1 | Tenant-side only |
| 11 | **Tata Cliq** | ECOM | ⚠️ Per-seller only | 🟡 P1 | Tenant-side only |
| 12 | **JioMart** | ECOM | ⚠️ Per-seller only | 🟡 P1 | Tenant-side only |
| 13 | **eBay** | ECOM | ✅ Yes — eBay Developer Program | 🟢 P2 | Not started |
| 14 | **Etsy** | ECOM | ✅ Yes — Etsy Developer | 🟢 P2 | Not started |
| 15 | **Snapdeal** | ECOM | ⚠️ Per-seller only | 🟢 P2 | Tenant-side only |
| 16 | **GlowRoad** | ECOM | ⚠️ Per-seller (Amazon-owned but separate) | 🟢 P2 | Tenant-side only |
| 17 | **FirstCry** | ECOM | ⚠️ Per-seller only | 🟢 P2 | Tenant-side only |
| 18 | **Pepperfry** | ECOM | ⚠️ Per-seller only | 🟢 P2 | Tenant-side only |
| 19 | **Croma** | ECOM | ⚠️ Per-seller only | 🟢 P2 | Tenant-side only |
| 20 | **Tata Neu** | ECOM | ⚠️ Per-seller only | 🟢 P2 | Tenant-side only |
| 21 | **Paytm Mall** | ECOM | ⚠️ Per-seller only | ⚪ P3 | Tenant-side only |
| 22 | **LimeRoad** | ECOM | ⚠️ Per-seller only | ⚪ P3 | Tenant-side only |
| 23 | **Blinkit** | QUICKCOM | ⚠️ Per-seller only | 🟡 P1 | Tenant-side only |
| 24 | **Zepto** | QUICKCOM | ⚠️ Per-seller only | 🟡 P1 | Tenant-side only |
| 25 | **Swiggy Instamart** | QUICKCOM | ⚠️ Per-seller only | 🟡 P1 | Tenant-side only |
| 26 | **BB Now (BigBasket)** | QUICKCOM | ⚠️ Per-seller only | 🟢 P2 | Tenant-side only |
| 27 | **Country Delight** | QUICKCOM | 📨 Webhook-only — no app | 🟢 P2 | Webhook setup |
| 28 | **Shiprocket** | LOGISTICS | ⚠️ Per-seller only (sign up free) | 🔴 P0 | Tenant-side only |
| 29 | **Delhivery** | LOGISTICS | ⚠️ Per-seller only | 🟡 P1 | Tenant-side only |
| 30 | **Other shipping aggregators** (FShip, Pickrr, Shipway, NimbusPost, ClickPost, iThink) | LOGISTICS | ⚠️ Per-seller only | 🟢 P2 | Tenant-side only |
| 31 | **Direct couriers** (Ecom Express, Xpressbees, Shadowfax, BlueDart, DTDC) | LOGISTICS | ⚠️ Per-seller only — usually accessed via Shiprocket | 🟢 P2 | Tenant-side only |
| 32 | **FedEx, DHL, UPS** | LOGISTICS | ✅ Yes — global developer programs | ⚪ P3 | Not started |
| 33 | **WooCommerce, Magento, BigCommerce, OpenCart** | OWNSTORE | ✅ No app needed — REST API + tenant token | 🟢 P2 | Tenant-side only |
| 34 | **Custom Website / POS / Offline / B2B** | OWNSTORE / B2B | 🚫 Webhook or manual entry — no app | ✅ Done | No registration needed |

---

## P0 — Do this week (5 registrations)

### 1. Amazon SP-API (already submitted)

- **Status:** Application acknowledged. Waiting on review.
- **Where:** https://developer.amazon.com (Developer Console)
- **Credentials you'll receive:** LWA `Client ID` + `Client Secret`
- **Where to put them in Kartriq:** Admin → Settings → `amazon.clientId` / `amazon.clientSecret` (global, used for all tenants)
- **Action:** Don't close the case. Watch email + Seller Central → Help → Case Log.
- **Covers:** Amazon India + Amazon Smart Biz (same LWA app)

### 2. Flipkart Marketplace Solution Provider (MSP)

- **Status:** Not started
- **Where:** Email `mp.developer@flipkart.com`
- **Credentials you'll receive:** Global `appId` + `appSecret` for OAuth
- **Where to put them in Kartriq:** Admin → Settings → `flipkart.appId` / `flipkart.appSecret`
- **Timeline:** 3–6 weeks
- **Action:** Send the partnership email. Pre-flight: have public website, GSTIN, and at least one Flipkart-selling tenant in pipeline (Obzus India counts).

### 3. Shopify Partners (FREE, INSTANT)

- **Status:** Not started
- **Where:** https://www.shopify.com/in/partners
- **Credentials you'll receive:** Public app `Client ID` + `Client Secret`
- **Where to put them in Kartriq:** Admin → Settings → `shopify.clientId` / `shopify.clientSecret`
- **Timeline:** Same day — instant approval
- **Redirect URLs to register:**
  - `https://your-domain.com/api/v1/oauth/shopify/callback`
  - `http://localhost:3000/api/v1/oauth/shopify/callback` (dev)
- **Action:** Sign up today. Easiest win.

### 4. Meesho Open API Partner

- **Status:** Not started
- **Where:** Email `partner-program@meesho.com` + CC `developer-support@meesho.com`
- **Credentials you'll receive:** Partner-level OAuth credentials (or `appId/appSecret`)
- **Where to put them in Kartriq:** Admin → Settings → `meesho.appId` / `meesho.appSecret`
- **Timeline:** 2–6 weeks
- **Action:** Send partnership email + raise ticket from Obzus's existing Meesho supplier panel for parallel access.

### 5. Shiprocket (per-tenant, but do it for Obzus today)

- **Status:** Not started
- **Where:** https://app.shiprocket.in/register
- **Credentials:** Shiprocket email + password (each tenant uses their own)
- **Note:** No Kartriq-level partnership needed. Each tenant signs up directly. Free to register.
- **Action:** Sign Obzus up today; doubles as your Shiprocket test integration.

---

## P1 — Apply within 2 weeks (4 registrations)

### 6 + 7. Meta for Developers (Instagram + Facebook + WhatsApp Business)

- **Status:** Not started
- **Where:** https://developers.facebook.com
- **Credentials you'll receive:** App ID + App Secret + Access Tokens
- **Where to put them in Kartriq:** Admin → Settings → `meta.appId` / `meta.appSecret` (one app, three products)
- **Timeline:** 2–4 weeks for App Review approval (you can build immediately, only need approval before going live)
- **Action:** Create Meta developer account → create app → enable products: Instagram Graph API, Facebook Login, WhatsApp Business Platform
- **One app covers all three channels.** This is a good multi-win.

### 8. Myntra Vendor Hub Partner

- **Status:** Not started
- **Where:** https://vendorhub.myntra.com → contact partner support
- **Credentials:** `supplierId` + `apiKey` + `secretKey` (per-seller) OR partner-level if approved
- **Note:** Myntra is invite-only for partner program — needs traction. Start with per-seller for Obzus if Myntra-onboarded.

### 9. Vendor outreach for closed-program channels (Ajio, Nykaa, Tata Cliq, JioMart, FirstCry, Tata Neu, Croma, Pepperfry)

- **Status:** Per-seller only (no Kartriq-level partnership available)
- **Action:** No app to register at Kartriq level. Document the per-tenant onboarding flow:
  - Tenant requests credentials from their account manager / seller support on each platform
  - Tenant pastes into Kartriq's Connect modal
- **Tip:** Your Connect modal at `frontend/components/channels/ConnectChannelModal.tsx` should show clear "How to get these credentials" help links per channel.

---

## P2 — Apply within 1–2 months (4 registrations)

### 10. eBay Developer Program

- **Where:** https://developer.ebay.com
- **Credentials:** `Client ID` + `Client Secret` + `Refresh Token`
- **Timeline:** Free, instant. App Review needed before production.

### 11. Etsy Developer

- **Where:** https://www.etsy.com/developers
- **Credentials:** `API Key` + `Access Token` + `Shop ID`
- **Timeline:** Free, instant for sandbox. Production approval ~1 week.

### 12. WooCommerce / Magento / BigCommerce — NO APP NEEDED

- **Why:** These are tenant-controlled stores. Tenant generates REST API keys from their own admin panel.
- **Action:** Just make sure the Connect UI explains where to find the keys.

### 13. Global couriers (FedEx, DHL, UPS)

- **Where:** https://developer.fedex.com / https://developer.dhl.com / https://developer.ups.com
- **Credentials:** `Client ID` + `Client Secret` + `Account No`
- **Note:** Mostly relevant for international shipping. Defer until you have international tenants.

---

## P3 — Defer (low priority, niche)

- Paytm Mall, LimeRoad — declining marketplaces
- Direct courier accounts (BlueDart, DTDC, Ecom Express, Xpressbees, Shadowfax) — already accessible via Shiprocket aggregator, don't need direct integration
- POS / Offline / Manual / Wholesale / Distributor — no API, manual entry only

---

## Onboarding flow per channel type

### Type A — Kartriq-partner channels (8 channels)
After your partner credentials are set in Admin → Settings:
```
Tenant clicks "Connect [Channel]"
  → redirected to channel's authorize page
  → tenant clicks "Allow"
  → redirected back to /api/v1/oauth/<channel>/callback
  → Kartriq stores per-tenant accessToken + refreshToken
  → Done in 30 seconds
```
Channels: Amazon, Amazon Smart Biz, Flipkart (when MSP approved), Shopify, Meesho (when partner approved), Instagram, Facebook Shop, WhatsApp Business, eBay, Etsy

### Type B — Per-seller credential channels (~15 channels)
```
Tenant requests API access from their seller panel / account manager
  → receives appId/apiKey from channel
  → pastes into Kartriq's Connect modal
  → Kartriq encrypts via AES-256-GCM and stores per-tenant
```
Channels: Myntra, Ajio, Nykaa, Tata Cliq, JioMart, Snapdeal, GlowRoad, FirstCry, Pepperfry, Croma, Tata Neu, Paytm Mall, LimeRoad, Blinkit, Zepto, Swiggy Instamart, BB Now, all logistics aggregators

### Type C — Webhook-based (3 channels)
```
Tenant configures channel to POST to https://kartriq.in/api/v1/channels/:id/webhook
  → optionally with HMAC-SHA256 signature
  → Kartriq parses incoming events
```
Channels: Country Delight, Custom Website, Custom Webhook, B2B Portal

### Type D — Manual entry (5 channels)
No API. No app registration. User enters orders via the New Order form.
Channels: Offline, POS, Wholesale, Distributor, Other

---

## Pre-flight checklist for ALL partner applications

Before sending any partnership email, confirm:

- [ ] Production deployment at HTTPS URL (e.g. `https://kartriq.in`)
- [ ] Privacy Policy live at `/privacy`
- [ ] Terms of Service live at `/terms`
- [ ] OAuth callback URLs working (200 or 302, not 404)
- [ ] `ENCRYPTION_KEY` env var set in production (otherwise tenant credentials leak)
- [ ] Company incorporation cert + GSTIN ready as PDF attachments
- [ ] One-page partner deck (5–8 slides about Kartriq)
- [ ] One-page architecture / security doc
- [ ] At least 1 active tenant on each channel as proof of demand (Obzus India for Flipkart/Meesho/etc.)

---

## OAuth callback URL pattern

For every Kartriq-partner channel, set the redirect URL during app registration to:

```
Production:  https://kartriq.in/api/v1/oauth/<channel>/callback
Development: http://localhost:3000/api/v1/oauth/<channel>/callback
```

Replace `<channel>` with: `amazon`, `flipkart`, `shopify`, `meesho`, `meta`, `ebay`, `etsy`.

These routes live in `backend/src/routes/oauth.routes.js` — verify they exist before submitting partner applications.

---

## Where credentials get stored

| Where | What | Why |
|---|---|---|
| `Admin → Settings` (DB-backed key/value) | Global Kartriq-level app credentials (appId, appSecret, clientId, etc.) | Shared across all tenants — only platform admins see |
| `channels` table, `credentials` JSON column | Per-tenant credentials (refresh tokens, access tokens, per-seller API keys) | AES-256-GCM encrypted via `backend/src/utils/crypto.js` using `ENCRYPTION_KEY` |

---

## TL;DR — first 5 actions in order

1. **Sign up for Shopify Partners** (10 min, instant) — biggest easy win
2. **Send Flipkart MSP application email** to `mp.developer@flipkart.com`
3. **Send Meesho partner application email** to `partner-program@meesho.com`
4. **Watch Amazon SP-API case** — don't close, respond if asked
5. **Apply for Meta Developer account** — covers Instagram + Facebook + WhatsApp in one app

Total time today: **~2 hours** to send all applications. Total wait: **3–6 weeks** for the slow ones to come back.
