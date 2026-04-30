# Uniflo Integration Setup Guide

This guide lists every channel Uniflo supports, where to register the developer app, what credentials you need, and where to paste them.

> 📋 **Looking for the full channel matrix?** See [CHANNELS.md](CHANNELS.md) — every supported channel grouped by category, with status (integrated / not yet), connection type (OAuth / paste-form), and what's deliberately not included.

Two types of integrations:

| Type | How it works | Example |
|---|---|---|
| **Platform OAuth** | Founder registers **one** public app with the provider. Every seller clicks **Authorize** — no paste forms. | Amazon, Shopify, Flipkart, Meta |
| **Per-seller API key** | Each seller generates their own keys in the provider's dashboard and pastes them into Uniflo. | Shiprocket, Delhivery, WooCommerce, Meesho, Nykaa |

Platform OAuth apps are configured **once** at **Admin → Settings** (`/admin/settings`). Per-seller API keys are entered by each tenant at **Dashboard → Channels → Connect**.

---

## How the multi-tenant OAuth model works (concrete example: Amazon)

You as the founder register **one** Amazon SP-API "Public App" for the entire Uniflo platform. Every tenant uses *that one app* — they never register their own with Amazon. Each tenant's authorization produces a per-tenant `refreshToken` that's stored encrypted, scoped to their tenant only.

### Founder does once

| Step | Where | Result |
|---|---|---|
| Register the Amazon SP-API app in Seller Central | https://sellercentral.amazon.com/sellingpartner/developerconsole | Get **LWA Client ID** + **Client Secret** |
| Whitelist OAuth redirect URL | Same console | `https://YOUR-DOMAIN/api/v1/oauth/amazon/callback` |
| Paste credentials in Uniflo | `/admin/settings` → Amazon SP-API tab | Saved as `amazon.clientId`, `amazon.clientSecret` (encrypted) |

That's it for the founder. The credentials live in the `settings` table and are read by `backend/src/services/channels/ecom/amazon.js` whenever ANY tenant makes a call.

### Each tenant does once

| Step | Where | Result |
|---|---|---|
| Click "Connect Amazon" | `/channels` → Amazon → Connect | Redirects to Amazon's consent screen |
| Approve the Uniflo app | Amazon's screen (NOT Uniflo) | Returns to Uniflo with an authorization code |
| Uniflo exchanges the code for a `refreshToken` | Automatic, via the callback URL above | Stored encrypted on the tenant's `channel` row alongside their `sellerId` and `region` |

When Uniflo makes an API call for **tenant X**, the adapter assembles:
```
Founder's clientId  +  Founder's clientSecret  +  Tenant X's refreshToken  →  Amazon access token
```
Tenant Y's calls use the same founder credentials but Y's own `refreshToken`. Tenants are fully isolated — they never see each other's tokens, and you (the founder) never see plaintext refresh tokens (they're AES-256-GCM encrypted in the DB using your `ENCRYPTION_KEY`).

### Same model applies to

- **Amazon SP-API + Smart Biz** — one founder app, per-tenant `refreshToken` + `sellerId`
- **Shopify** — one founder public app, per-tenant `accessToken` + `shopUrl`
- **Flipkart** — one founder app, per-tenant `appId` token
- **Meta (Facebook Shop / Instagram / WhatsApp)** — one founder Meta app, per-tenant `pageId` + `accessToken`
- **Google sign-in** — one founder OAuth client, per-user identity at login

### Different model (legacy "paste-form")

For channels in §4, the founder does NOT register an app. Each tenant generates their OWN credentials in the channel's dashboard and pastes them. Used for: Shiprocket, Delhivery, WooCommerce, Meesho, Nykaa, most logistics carriers, and any channel without a public OAuth app.

---

## Quick reference — Uniflo admin paths

| What | Where |
|---|---|
| Platform OAuth app credentials | `/admin/settings` (founder only) |
| Per-seller channel connection | `/channels/<channelId>` → Connect button |
| Public webhook URL for a seller's channel | `https://YOUR-DOMAIN/api/v1/webhooks/channels/<channelId>` |
| OAuth callback URL (register this at every provider) | `https://YOUR-DOMAIN/api/v1/oauth/<provider>/callback` |

---

# ════════════════════════════════════════════════════════════
# PART 1 — FOUNDER SETUP (do this once for the entire platform)
# ════════════════════════════════════════════════════════════

You — the platform founder — register **one developer app per provider** with each marketplace, payment gateway, and email service. These credentials live in the `settings` table (encrypted) and are read by every tenant's API call. Sellers never see them and never register their own.

Sections in Part 1:
- §1 Platform OAuth apps (Amazon, Shopify, Flipkart, Meta, Google)
- §2 Payment gateway (Razorpay)
- §3 Email (SMTP)

After you finish Part 1, sellers can sign up and self-onboard via Part 2.

---

# 1. Platform OAuth apps

## 1.1 Amazon SP-API (Smart Biz + Marketplace)

**Who registers**: **You (the SaaS operator)** — one app total, every seller authorizes it.

**Developer portal**: https://developer.amazonservices.com/
**Seller Central (India)**: https://sellercentral.amazon.in

### Steps

1. Create an Amazon developer account (different from a seller account) at https://developer.amazonservices.com/
2. Go to **Apps & Services → Develop Apps** → **Add new app client**
3. Fill in:
   - **App name**: `Uniflo`
   - **API type**: `SP API`
   - **Roles needed**: `Product Listing`, `Inventory and Order Tracking`, `Direct-to-Consumer Shipping`, `Buyer Communication` (for Solicitations / review requests), `Multi-Channel Fulfillment` (for MCF)
4. Register redirect URI:
   ```
   https://YOUR-DOMAIN/api/v1/oauth/amazon/callback
   ```
   Add `http://localhost:5001/api/v1/oauth/amazon/callback` for local dev.
5. Copy these four values:
   - **Application ID** — starts with `amzn1.sp.solution.`
   - **LWA Client ID** — starts with `amzn1.application-oa2-client.`
   - **LWA Client Secret** — shown once, save immediately
6. Submit your app for review. Amazon takes **2–4 weeks** to approve a public SP-API app. Draft apps work on your own seller account immediately.

### Where to paste in Uniflo

**Admin → Settings → Amazon**:

| Field | Value |
|---|---|
| `amazon.appId`        | Application ID |
| `amazon.clientId`     | LWA Client ID |
| `amazon.clientSecret` | LWA Client Secret |
| `amazon.redirectUri`  | `https://YOUR-DOMAIN/api/v1/oauth/amazon/callback` |

### What sellers see

Each seller goes to **Channels → Amazon Smart Biz → Connect** → picks their region → clicks **Authorize with Amazon Smart Biz**. A popup opens Seller Central, they approve, and the popup auto-closes. Uniflo stores per-seller `{ sellerId, refreshToken, region }` encrypted.

### Docs

- Getting started: https://developer-docs.amazon.com/sp-api/docs/registering-your-application
- Authorization flow: https://developer-docs.amazon.com/sp-api/docs/website-authorization-workflow
- MCF: https://developer-docs.amazon.com/sp-api/docs/fulfillment-outbound-api-v2020-07-01-reference

---

## 1.2 Shopify (public app)

**Who registers**: **You** — one Shopify Partner app, every Shopify store installs it.

**Partner dashboard**: https://partners.shopify.com
**API docs**: https://shopify.dev/docs/apps

### Steps

1. Create a Partner account at https://partners.shopify.com
2. **Apps → Create app → Create app manually**
3. Fill in:
   - **App name**: `Uniflo`
   - **App URL**: `https://YOUR-DOMAIN/channels`
   - **Allowed redirection URLs**: `https://YOUR-DOMAIN/api/v1/oauth/shopify/callback`
4. Configure **Admin API scopes**: `read_products, write_products, read_inventory, write_inventory, read_orders, write_orders, read_fulfillments, write_fulfillments, read_customers`
5. Go to **API credentials** and copy:
   - **Client ID** (also called API key)
   - **Client Secret**

### Where to paste

**Admin → Settings → Shopify**:

| Field | Value |
|---|---|
| `shopify.apiKey`      | Client ID |
| `shopify.apiSecret`   | Client Secret |
| `shopify.redirectUri` | `https://YOUR-DOMAIN/api/v1/oauth/shopify/callback` |
| `shopify.scopes`      | `read_products,write_products,read_inventory,write_inventory,read_orders,write_orders,read_fulfillments,write_fulfillments,read_customers` |

### Docs

- OAuth flow: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant
- Admin API: https://shopify.dev/docs/api/admin-rest
- Webhooks: https://shopify.dev/docs/apps/build/webhooks

> **Status**: Shopify OAuth flow in Uniflo is **pending** — the settings slot exists but the `/oauth/shopify/start` + `/callback` routes are not yet wired. Sellers currently use the per-store paste form.

---

## 1.3 Flipkart Marketplace

**Who registers**: **You** — one Flipkart Marketplace app.

**Seller Hub**: https://seller.flipkart.com
**API docs**: https://seller.flipkart.com/api-docs

### Steps

1. Seller Hub → **My Account → API Credentials**
2. **Create App** → give it a name, list redirect URI
3. Copy **App ID** and **App Secret**

### Where to paste

**Admin → Settings → Flipkart**:

| Field | Value |
|---|---|
| `flipkart.appId`     | App ID |
| `flipkart.appSecret` | App Secret |

### Docs

- https://seller.flipkart.com/api-docs/FMSAPI.html

> Flipkart's OAuth is limited — for multi-seller use, Flipkart typically requires each seller to provision their own keys. Check your seller agreement.

---

## 1.4 Meta — Facebook Shop, Instagram Shopping, WhatsApp Business

**Who registers**: **You** — one Meta for Developers app.

**Developer dashboard**: https://developers.facebook.com/apps

### Steps

1. https://developers.facebook.com → **My Apps → Create App**
2. Pick **Business** as the app type
3. Add products:
   - **Facebook Login for Business** (for OAuth)
   - **Commerce** (for catalog + shop)
   - **Instagram Graph API**
   - **WhatsApp Business** (if you want WA integration)
4. In **Settings → Basic**, copy:
   - **App ID**
   - **App Secret**
5. Add redirect URI under **Facebook Login → Settings → Valid OAuth Redirect URIs**:
   ```
   https://YOUR-DOMAIN/api/v1/oauth/meta/callback
   ```
6. Submit for **App Review** with scopes: `business_management, catalog_management, instagram_shopping_tag_products, pages_manage_metadata, pages_show_list, whatsapp_business_management, whatsapp_business_messaging`

### Where to paste

**Admin → Settings → Meta**:

| Field | Value |
|---|---|
| `meta.appId`     | App ID |
| `meta.appSecret` | App Secret |

### Docs

- Facebook Login: https://developers.facebook.com/docs/facebook-login/guides/access-tokens
- Commerce API: https://developers.facebook.com/docs/commerce-platform
- WhatsApp Business Platform: https://developers.facebook.com/docs/whatsapp

---

## 1.5 Google OAuth (sign-in)

**Who registers**: **You**.

**Console**: https://console.cloud.google.com/apis/credentials

### Steps

1. Create (or pick) a GCP project
2. **APIs & Services → Credentials → Create credentials → OAuth client ID**
3. **Application type**: Web application
4. **Authorized JavaScript origins**: `https://YOUR-DOMAIN`
5. **Authorized redirect URIs**: `https://YOUR-DOMAIN/login` (or whatever page handles the ID token)
6. Copy **Client ID** and **Client Secret**

### Where to paste

**Admin → Settings → Google**:

| Field | Value |
|---|---|
| `google.clientId`     | Client ID |
| `google.clientSecret` | Client Secret (optional for Identity Services flow) |

Also set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `frontend/.env.local` so the browser-side Google Identity Services script can render the sign-in button.

### Docs

- Google Identity Services: https://developers.google.com/identity/gsi/web

---

# 2. Payment gateway

## 2.1 Razorpay

**Who registers**: **You**.

**Dashboard**: https://dashboard.razorpay.com

### Steps

1. Sign up at https://dashboard.razorpay.com
2. Complete KYC (PAN, bank, GST, current account)
3. **Settings → API Keys → Generate Test/Live Key**
4. Copy **Key ID** and **Key Secret**
5. Under **Settings → Webhooks**, add:
   - **URL**: `https://YOUR-DOMAIN/api/v1/payments/webhook`
   - **Active events**: `payment.captured`, `payment.failed`, `order.paid`, `subscription.activated`, `subscription.charged`, `subscription.halted`, `subscription.cancelled`
   - Generate a **webhook secret**

### Where to paste

**Admin → Settings → Razorpay**:

| Field | Value |
|---|---|
| `razorpay.keyId`         | Key ID (starts with `rzp_live_` or `rzp_test_`) |
| `razorpay.keySecret`     | Key Secret |
| `razorpay.webhookSecret` | Webhook secret you generated |

Leave all three blank during development — Uniflo runs in **stub mode** and the billing flow works without real charges.

### Docs

- API reference: https://razorpay.com/docs/api/
- Webhooks: https://razorpay.com/docs/webhooks/
- Checkout: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/

---

# 3. Email (SMTP)

**Who registers**: **You** — any SMTP provider.

| Provider | Docs |
|---|---|
| Amazon SES     | https://docs.aws.amazon.com/ses/latest/dg/send-email-smtp.html |
| SendGrid       | https://docs.sendgrid.com/for-developers/sending-email/integrating-with-the-smtp-api |
| Mailgun        | https://documentation.mailgun.com/en/latest/user_manual.html#smtp-relay |
| Postmark       | https://postmarkapp.com/developer/user-guide/send-email-with-smtp |
| Resend         | https://resend.com/docs/send-with-smtp |
| Gmail (dev)    | https://support.google.com/mail/answer/7126229 |

### Where to paste

**Admin → Settings → SMTP**:

| Field | Example |
|---|---|
| `smtp.host` | `email-smtp.us-east-1.amazonaws.com` |
| `smtp.port` | `587` |
| `smtp.user` | Your SMTP username / access key |
| `smtp.pass` | Your SMTP password / secret |
| `smtp.from` | `Uniflo <no-reply@yourdomain.com>` |

Leave blank → Uniflo logs every email to the console (dev stub mode).

---

# ════════════════════════════════════════════════════════════
# PART 2 — PER-SELLER SETUP (each tenant does this themselves)
# ════════════════════════════════════════════════════════════

Each tenant logs into their Uniflo dashboard and connects channels they actually sell on. There are two flavors:

- **OAuth channels** (Amazon, Shopify, Flipkart, Meta) — tenant clicks "Authorize", goes through the provider's consent screen, comes back. They never paste secrets — your founder app from Part 1 handles it.
- **Paste-form channels** (everything in §4 below) — tenant generates their own keys in the channel's seller portal and pastes them into Uniflo.

The Connect modal on `/channels/<id>` shows each required field. Hover the **?** icon next to any field to see exactly where to find that credential in the channel's seller portal.

Sections in Part 2:
- §4 Per-seller integrations (marketplaces, quick-commerce, own-store, logistics, social, custom webhook)
- §5 Webhook URLs summary
- §6 Environment variables (fallback if you prefer .env over the `settings` table)

---

# 4. Per-seller integrations (paste-form)

Each tenant enters their own credentials at **Dashboard → Channels → pick channel → Connect**.

## 4.1 Marketplaces

### Meesho
- **Supplier panel**: https://supplier.meesho.com
- **API docs**: https://supplier.meesho.com/panel/api
- **Fields**: `supplierId`, `apiKey`

### Myntra
- **Partner portal**: https://partners.myntra.com
- **Fields**: `sellerId`, `apiKey`
- Typically requires a partnership call to get API access.

### Nykaa
- **Partner portal**: https://partner.nykaa.com
- **Fields**: `partnerId`, `apiKey`
- API access granted on request.

### Ajio / Reliance Retail
- **Seller portal**: https://partners.ajio.com
- **Fields**: `sellerId`, `apiKey`
- B2B integration through Reliance Retail API team.

### Tata CLiQ
- **Vendor portal**: https://luxury.tatacliq.com / https://tatacliq.com (check current URL)
- **Fields**: `vendorId`, `apiKey`

### Snapdeal
- **Seller Zone**: https://sellerzone.snapdeal.com
- **Fields**: `sellerId`, `apiKey`

### JioMart
- **Seller panel**: https://seller.jiomart.com
- **Fields**: `sellerId`, `apiKey`

### Paytm Mall
- **Seller panel**: https://seller.paytmmall.com
- **Fields**: `merchantId`, `apiKey`

### eBay
- **Developer portal**: https://developer.ebay.com
- **Fields**: OAuth app credentials — currently paste-form, OAuth pending.

### Etsy
- **Developer portal**: https://www.etsy.com/developers/register
- **Fields**: `apiKey`, `sharedSecret`

### GlowRoad
- **Supplier panel**: https://supplier.glowroad.com
- **Fields**: `apiKey`
- Reseller marketplace owned by Amazon. API access via supplier onboarding.

### LimeRoad
- **Seller panel**: https://www.limeroad.com/seller
- **Fields**: `apiKey`
- Fashion & lifestyle marketplace. Contact seller support for API credentials.

---

## 4.2 Quick commerce

### Blinkit (Grofers)
- **Merchant dashboard**: https://blinkit.com/merchant-signup
- **Fields**: `merchantId`, `apiKey`
- API access is limited; contact your Blinkit account manager.

### Zepto
- **Vendor portal**: https://www.zepto.com
- **Fields**: `merchantId`, `apiKey`
- API access via partnership only.

### Swiggy Instamart
- **Partner portal**: https://partner.swiggy.com
- **Fields**: `partnerId`, `apiKey`

### BB Now (BigBasket)
- **Vendor portal**: https://bbnow.in
- **Fields**: `vendorId`, `apiKey`

---

## 4.3 Own-store platforms

### Amazon Smart Biz (D2C site on Amazon's stack)
- **Onboarding**: https://smartcommerce.amazon.in/smartbiz
- Uses the **same Amazon SP-API OAuth app** registered in §1.1 — sellers authorize once and the same `clientId`/`clientSecret` covers both the marketplace and Smart Biz storefront.
- **Per-seller fields**: `clientId`, `clientSecret`, `refreshToken`, `sellerId`, `webhookSecret` (optional)
- Adds MCF (Multi-Channel Fulfillment) features: `mcf_fulfillment`, `mcf_tracking`, `fba_inventory` on top of the standard order/inventory sync.
- **Docs**: https://developer-docs.amazon.com/sp-api/

### Shopify (custom app, per-store) — fallback while OAuth is pending
- **Admin URL**: `https://YOUR-STORE.myshopify.com/admin/apps`
- **Steps**:
  1. Settings → Apps and sales channels → Develop apps → **Create an app**
  2. Configure Admin API scopes: `read/write_products`, `read/write_orders`, `read/write_inventory`, `read_customers`
  3. Install app → reveal **Admin API access token** (starts with `shpat_`)
- **Fields**: `shopUrl` (e.g. `https://mystore.myshopify.com`), `accessToken`
- **Docs**: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-access-tokens

### WooCommerce
- **Admin URL**: `https://YOUR-STORE.com/wp-admin/admin.php?page=wc-settings&tab=advanced&section=keys`
- **Steps**:
  1. WooCommerce → Settings → Advanced → REST API
  2. **Add key** → Permissions: Read/Write → Generate
  3. Copy **Consumer Key** + **Consumer Secret**
- **Fields**: `siteUrl`, `consumerKey`, `consumerSecret`
- **Docs**: https://woocommerce.github.io/woocommerce-rest-api-docs/

### Magento / Adobe Commerce
- **Admin**: System → Integrations → Add New Integration
- **Fields**: `storeUrl`, `accessToken`
- **Docs**: https://developer.adobe.com/commerce/webapi/rest/tutorials/prerequisite-tasks/authentication-token/

### BigCommerce
- **Admin URL**: `https://store-YOUR-HASH.mybigcommerce.com/manage/settings/auth/api-accounts`
- **Steps**: Settings → API → API accounts → Create API account
- **Fields**: `storeHash`, `accessToken`
- **Docs**: https://developer.bigcommerce.com/docs/ZG9jOjIyMDYwMQ-authentication

### OpenCart
- **Admin**: System → Users → API
- **Fields**: `storeUrl`, `apiKey`, `username`
- **Docs**: https://docs.opencart.com/en-gb/administration/system/api/

---

## 4.4 Shipping & logistics

### Shiprocket
- **Dashboard**: https://app.shiprocket.in
- **Steps**:
  1. Sign up at https://www.shiprocket.in
  2. **Settings → API → Configure** → create an API user with a password
- **Fields**: `email`, `password`
- **Docs**: https://apidocs.shiprocket.in

### Delhivery
- **Dashboard**: https://one.delhivery.com
- **Steps**: Settings → API → generate API token
- **Fields**: `token`, `mode` (`test` or `production`)
- **Docs**: https://track.delhivery.com/api-doc/

### BlueDart
- **Partner portal**: https://www.bluedart.com/web/guest/online-tools
- **Steps**: Email `apisupport@bluedart.com` for API access → receive API Key, License Key, Customer Code
- **Fields**: `customerCode`, `apiKey`, `licenseKey`
- **Docs**: Contact BlueDart API team

### DTDC
- **Dashboard**: https://www.dtdc.in
- **Steps**: Request API access from your DTDC account manager
- **Fields**: `customerCode`, `apiKey`
- **Docs**: https://apidocs.dtdc.in

### Xpressbees
- **Dashboard**: https://shipment.xpressbees.com
- **Fields**: `email`, `password`
- **Docs**: https://shipment.xpressbees.com/docs

### EcomExpress
- **Dashboard**: https://www.ecomexpress.in
- **Steps**: Request API access via account manager
- **Fields**: `username`, `password`
- **Docs**: Request from Ecom Express API team

### Shadowfax
- **Dashboard**: https://www.shadowfax.in/partners
- **Fields**: `token`
- **Docs**: Partner portal after onboarding

### NimbusPost
- **Dashboard**: https://ship.nimbuspost.com
- **Steps**: Settings → API → generate credentials
- **Fields**: `email`, `password`
- **Docs**: https://docs.nimbuspost.com

### ClickPost
- **Dashboard**: https://www.clickpost.in
- **Fields**: `username`, `apiKey`
- **Docs**: https://docs.clickpost.ai

### FedEx / DHL / UPS
- Developer portals:
  - https://developer.fedex.com
  - https://developer.dhl.com
  - https://developer.ups.com
- Each issues API key + secret to registered developer accounts.

### iThink Logistics
- **Dashboard**: https://www.ithinklogistics.com
- **Fields**: API token issued on partnership

### Pickrr
- **Dashboard**: https://www.pickrr.com
- **Fields**: API token issued on onboarding

### Shipway
- **Dashboard**: https://shipway.com
- **Fields**: API key from Settings → API

### Fship
- **Dashboard**: https://fship.in
- **Fields**: `apiKey` from your Fship merchant dashboard
- Multi-carrier shipping aggregator.

---

## 4.5 Social commerce (paste-form fallback until Meta OAuth is wired)

### Instagram Shopping
- **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
- Needs a **Page Access Token** with scopes `instagram_basic, instagram_manage_insights, instagram_shopping_tag_products`
- **Fields**: `businessAccountId`, `accessToken`

### Facebook Shop
- **Commerce Manager**: https://business.facebook.com/commerce
- Needs a Page Access Token + Page ID
- **Fields**: `pageId`, `accessToken`

### WhatsApp Business
- **WhatsApp Business Platform**: https://business.facebook.com/wa/manage
- Needs a **Phone Number ID** and a **System User Access Token**
- **Fields**: `phoneNumberId`, `accessToken`

---

## 4.6 Custom Webhook (any system you own)

Use this when you have your own platform that should POST orders to Uniflo.

**Fields**: `webhookSecret` (any long random string you pick)

**Target URL to configure in your source system**:
```
POST https://YOUR-DOMAIN/api/v1/webhooks/channels/<channelId>
```

**Signing** (required): HMAC-SHA256 of the raw request body with your `webhookSecret`, sent in the header:
```
x-uniflo-signature: <hex digest>
```

**Payload shape**: see [backend/src/services/channels/ownstore/custom-webhook.js](../backend/src/services/channels/ownstore/custom-webhook.js) `parseWebhook()` — accepts a fairly flexible JSON format (channelOrderId, items[], customer, shippingAddress, total, etc.).

---

# 5. Webhook URLs summary

Every seller's channel has its own public webhook endpoint. Paste the URL from Uniflo → Channel detail → Connect modal into the external system's webhook settings.

| Use case | URL pattern |
|---|---|
| Per-channel order webhook (Smart Biz, Shopify, CUSTOM_WEBHOOK, etc.) | `POST /api/v1/webhooks/channels/<channelId>` |
| Razorpay → Uniflo payments | `POST /api/v1/payments/webhook` |
| Amazon OAuth redirect | `GET  /api/v1/oauth/amazon/callback` |
| (Pending) Shopify OAuth redirect | `GET  /api/v1/oauth/shopify/callback` |
| (Pending) Flipkart OAuth redirect | `GET  /api/v1/oauth/flipkart/callback` |
| (Pending) Meta OAuth redirect | `GET  /api/v1/oauth/meta/callback` |

All webhook receivers validate an HMAC signature before processing.

---

# 6. Environment variables (fallback)

Every platform setting can also be set in `backend/.env` as an environment variable — uppercase, dots → underscores. The DB wins; env is only used when the DB row is missing.

Examples:

```env
# Amazon (fallback for amazon.* settings)
AMAZON_APP_ID=amzn1.sp.solution.xxxxxxxx
AMAZON_CLIENT_ID=amzn1.application-oa2-client.xxxxxxxx
AMAZON_CLIENT_SECRET=amzn1.oa2-cs.v1.xxxxxxxx
AMAZON_REDIRECT_URI=http://localhost:5001/api/v1/oauth/amazon/callback

# Razorpay
RAZORPAY_KEY_ID=rzp_test_xxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxx

# SMTP
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIAxxxxxx
SMTP_PASS=xxxxxxxxxxxxx
SMTP_FROM=Uniflo <no-reply@example.com>
```

**Recommended**: in production, use the database (Admin → Settings) rather than .env — rotation, audit, and multi-node deploys all get easier because you're not editing config files and restarting processes.

---

# ════════════════════════════════════════════════════════════
# REFERENCE
# ════════════════════════════════════════════════════════════

# 7. Testing a connection

Every channel detail page has a **Test Connection** button that calls the adapter's `testConnection()` method. Typical successful responses:

| Channel | Looks like |
|---|---|
| Amazon | `{ success: true, sellerId: "A1B2C...", marketplaces: ["Amazon.in"] }` |
| Shopify | `{ success: true, shop: "mystore.myshopify.com", name: "My Store" }` |
| Shiprocket | `{ success: true, token: "...", expiresAt: "..." }` |
| Delhivery | `{ success: true, mode: "production" }` |

If the test fails, the adapter saves the error message to `Channel.syncError` — it's shown as a red banner on the detail page.

---

# 8. Current implementation status

| Provider | Platform OAuth | Paste-form | Adapter |
|---|:-:|:-:|:-:|
| Amazon (SP-API + Smart Biz) | ✅ **live** | legacy fallback | ✅ |
| Shopify | ⏳ pending | ✅ | ✅ |
| Flipkart | ⏳ pending | ✅ | ✅ |
| Meta (FB/IG/WA) | ⏳ pending | ✅ | ✅ |
| Razorpay | ✅ (checkout + webhook) | — | ✅ |
| Google sign-in | ✅ | — | ✅ |
| WooCommerce, Magento, BigCommerce, OpenCart | n/a (per-store keys) | ✅ | ✅ |
| Meesho, Myntra, Nykaa, Ajio, Tata CLiQ, Snapdeal, JioMart, Paytm Mall, eBay, Etsy | n/a | ✅ | ✅ |
| Blinkit, Zepto, Swiggy Instamart, BB Now | n/a | ✅ | ✅ |
| Shiprocket, Delhivery, BlueDart, DTDC, Xpressbees, EcomExpress, Shadowfax, NimbusPost, ClickPost, FedEx, DHL, UPS, iThink, Pickrr, Shipway | n/a | ✅ | ✅ |
| Instagram, Facebook, WhatsApp | ⏳ pending (Meta OAuth) | ✅ | ✅ |
| Custom Webhook | n/a | ✅ | ✅ |

**Legend**: ✅ live · ⏳ pending (settings slot exists, OAuth routes not yet wired)

---

# 9. Architectural notes

- **Credentials are encrypted at rest** using AES-256-GCM ([backend/src/utils/crypto.js](../backend/src/utils/crypto.js)). The key is `ENCRYPTION_KEY` in `.env` — rotate this and every stored credential becomes unreadable, so rotate carefully.
- **Platform settings cache** is in-process, 60 s TTL. Changing a value in Admin → Settings takes effect within 60 seconds platform-wide.
- **OAuth state** is HMAC-signed with `JWT_SECRET` and carries a 15-minute TTL + nonce to prevent CSRF on the public callback ([backend/src/routes/oauth.routes.js](../backend/src/routes/oauth.routes.js)).
- **Multi-tenant isolation**: every channel row is tenant-scoped. A seller's credentials are invisible to other sellers even via direct API probing — all routes run through `requireTenant` + tenant-filtered Prisma queries.
- **Audit log**: every credential change, plan switch, user mutation and payment is recorded in `AuditLog` with tenant/user/IP/UA — queryable at `/admin/audit` or tenant-scoped at `/billing/audit`.
