# Channel Roadmap

This file tracks the **115 channels** that have adapter code in the backend
but are flagged `comingSoon: true` because they have **not been smoke-tested
against live seller credentials yet**.

The public stats endpoint (`/api/v1/public/stats`) excludes them from
`channelsCount` and reports them separately as `comingSoonCount`.

## How to "make a channel work"

For each entry below, the work to flip `comingSoon: false` is:

1. **Get a sandbox/test seller account** for the platform (most require approval).
2. **Locate the adapter** at `backend/src/services/channels/<category>/pending.js`
   (or the dedicated file if one exists).
3. **Smoke test** the four core methods against the sandbox:
   - `testConnection()` — auth handshake
   - `fetchOrders(sinceDate)` — pull recent orders
   - `updateInventoryLevel(sku, qty)` — push stock
   - `fetchTracking(orderId)` (logistics only)
4. **Fix any drift** between the adapter's assumptions and the platform's actual response shape (specs lie; production payloads are the source of truth).
5. **Remove `comingSoon: true`** from the catalog entry in
   `backend/src/data/channel-catalog.js`.
6. **Add a smoke-test fixture** to `backend/src/scripts/test.js` (recorded
   response, redacted creds) so regressions are caught.

When all checkboxes in a category are ticked, update [docs/CHANNELS.md](CHANNELS.md)
to drop the "coming soon" annotation.

---

## ECOM — International marketplaces (20)

Legend: ☐ untouched · 🟡 code wired & ready, awaiting smoke-test · ✅ smoke-tested & live (`comingSoon: false`)

| Done | Channel | Apply URL |
|---|---|---|
| 🟡 | Walmart | https://marketplace.walmart.com |
| 🟡 | Amazon US | https://sellercentral.amazon.com |
| 🟡 | Amazon UK | https://sellercentral.amazon.co.uk |
| 🟡 | Amazon UAE | https://sellercentral.amazon.ae |
| 🟡 | Amazon Saudi Arabia | https://sellercentral.amazon.sa |
| 🟡 | Amazon Singapore | https://sellercentral.amazon.sg |
| 🟡 | Amazon Australia | https://sellercentral.amazon.com.au |
| 🟡 | Amazon Germany | https://sellercentral.amazon.de |
| 🟡 | Lazada | https://open.lazada.com/apps |
| 🟡 | Shopee | https://open.shopee.com |
| 🟡 | Noon | https://partners.noon.com |
| ☐ | Mercado Libre | https://www.mercadolibre.com |
| ☐ | Allegro | https://allegro.pl |
| ☐ | Fruugo | https://www.fruugo.com/sell |
| ☐ | OnBuy | https://www.onbuy.com/gb/sell-on-onbuy |
| ☐ | ManoMano | https://www.manomano.com/seller |
| ☐ | Rakuten | https://www.rakuten.com |
| ☐ | Zalando | https://corporate.zalando.com/en/partner-hub |
| ☐ | Kaufland | https://www.kaufland.de/seller-portal |
| ☐ | Wish | https://merchant.wish.com |

### Notes on the 🟡 batch

- **Walmart** — adapter rewritten with founder-app OAuth (Solution Provider `client_credentials` grant). Sellers paste only `partnerId` + region; platform-wide `walmart.clientId` / `walmart.clientSecret` live in Admin → Settings. **Needs:** register a Walmart Solution Provider app and a sandbox seller account to smoke-test.
- **Amazon US/UK/UAE/SA/SG/AU/DE** — Amazon SP-API adapter is region-aware (21-region marketplace-ID + endpoint table). All AMAZON_<REGION> variants reuse the platform's `amazon.appId` / `amazon.clientId` / `amazon.clientSecret`; sellers don't paste secrets. OAuth start route infers region from the channel type. **Needs:** SP-API app must include the matching region group (NA for US; EU for UK/UAE/SA/DE; FE for SG/AU); then smoke-test against a sandbox seller in each marketplace.
- **Lazada** — full Lazada Open Platform adapter rewritten in `services/channels/ecom/lazada.js`: HMAC-SHA256 request signing (the previous code never actually computed a signature, so every API call was rejected), region-aware host map for SG/TH/PH/MY/VN/ID, paginated `fetchOrders`, XML-payload inventory updates, OAuth `/oauth/lazada/start` + `/oauth/lazada/callback` routes, and `refreshAccessToken` for the 30-day refresh token. Founder-app pattern: `lazada.appKey` / `lazada.appSecret` / `lazada.redirectUri` live in Admin → Settings; sellers only pick a country and click Authorize. **Needs:** register a Lazada Open Platform app at https://open.lazada.com/apps, then smoke-test against any one country's sandbox seller (the same code path serves all six markets).
- **Shopee** — full Shopee Open Platform adapter in `services/channels/ecom/shopee.js`: HMAC-SHA256 request signing for both shop-scoped and public endpoints (the previous code skipped signing entirely, so every API call was rejected), country picker covering 12 markets (SG/MY/TH/ID/VN/PH/TW/BR/MX/CO/CL/PL), paginated `fetchOrders` with cursor-based loop and a follow-up `get_order_detail` hydration call to populate items + addresses + totals, `update_stock` adapter via skuMap, `exchangeAuthCode` + `refreshAccessToken` for the 4h access / 30-day refresh tokens. OAuth `/oauth/shopee/start` builds a signed `auth_partner` URL; `/oauth/shopee/callback` receives `code` + `shop_id` and persists tokens encrypted. Founder-app: `shopee.partnerId` / `shopee.partnerKey` / `shopee.redirectUri` live in Admin → Settings. **Needs:** register a Shopee Open Platform app at https://open.shopee.com (one app covers all markets), set the redirect URI to match Admin → Settings, then smoke-test against any one market's sandbox shop.
- **Noon** — per-merchant API key (no founder app). Adapter in `services/channels/ecom/noon.js`: real `testConnection` against `/v1/partner/me`, paginated `fetchOrders` with `country_code` scoping, `updateInventoryLevel` + `updateListing`. Country picker covers AE/SA/EG. Sellers paste their own apiKey + partnerCode from Noon Partners → Settings → API. **Needs:** smoke-test against a Noon merchant account in any one country (the same code path serves all three).

## ECOM — India gaps (6)

| Done | Channel | Apply URL |
|---|---|---|
| ☐ | IndiaMART | https://seller.indiamart.com |
| ☐ | Industrybuying | https://seller.industrybuying.com |
| ☐ | Moglix | https://supplier.moglix.com |
| ☐ | Purplle | https://seller.purplle.com |
| ☐ | Bewakoof | https://seller.bewakoof.com |
| ☐ | ShopClues | https://seller.shopclues.com |

## QUICKCOM (2)

| Done | Channel | Apply URL |
|---|---|---|
| ☐ | Flipkart Minutes | https://seller.flipkart.com |
| ☐ | Tata 1mg | https://www.1mg.com |

**Live:** Country Delight (webhook-only, alias of `CustomWebhookAdapter`).
**Removed:** Dunzo — service discontinued in 2024.

## LOGISTICS (12)

| Done | Channel | Apply URL |
|---|---|---|
| ☐ | Aramex | https://www.aramex.com |
| ☐ | Ekart | https://ekartlogistics.com |
| ☐ | India Post | https://www.indiapost.gov.in |
| ☐ | Gati | https://www.gati.com |
| ☐ | Safexpress | https://www.safexpress.com |
| ☐ | Trackon | https://www.trackon.in |
| ☐ | The Professional Couriers | https://www.tpcindia.com |
| ☐ | Smartr Logistics | https://smartr.in |
| ☐ | Shyplite | https://shyplite.com |
| ☐ | iCarry | https://icarry.in |
| ☐ | DotZot | https://www.dotzot.in |
| ☐ | ShipDelight | https://www.shipdelight.com |

## OWNSTORE (11)

| Done | Channel | Apply URL |
|---|---|---|
| ☐ | Wix Stores | https://www.wix.com/ecommerce |
| ☐ | Squarespace Commerce | https://www.squarespace.com/ecommerce |
| ☐ | Salesforce Commerce Cloud | https://www.salesforce.com/commerce |
| ☐ | PrestaShop | (self-hosted) |
| ☐ | Ecwid | https://www.ecwid.com |
| ☐ | Zoho Commerce | https://www.zoho.com/commerce |
| ☐ | Dukaan | https://mydukaan.io |
| ☐ | Shoopy | https://shoopy.in |
| ☐ | Bikayi | https://bikayi.com |
| ☐ | KartRocket | https://www.kartrocket.com |
| ☐ | Instamojo Smart Pages | https://www.instamojo.com |

## SOCIAL (4)

| Done | Channel | Apply URL |
|---|---|---|
| ☐ | TikTok Shop | https://seller-us.tiktok.com |
| ☐ | Pinterest Shopping | https://business.pinterest.com |
| ☐ | YouTube Shopping | https://www.youtube.com/creators/shopping |
| ☐ | Snapchat Ads & Catalog | https://forbusiness.snapchat.com |

## ACCOUNTING / ERP — new category (14)

| Done | Channel | Apply URL |
|---|---|---|
| ☐ | Tally | https://tallysolutions.com |
| ☐ | Tally Prime | https://tallysolutions.com/tally-prime |
| ☐ | Zoho Books | https://www.zoho.com/books |
| ☐ | QuickBooks | https://quickbooks.intuit.com |
| ☐ | Xero | https://www.xero.com |
| ☐ | SAP Business One | https://www.sap.com/products/business-one.html |
| ☐ | SAP S/4HANA | https://www.sap.com/products/s4hana-erp.html |
| ☐ | ERPNext | https://erpnext.com |
| ☐ | Microsoft Dynamics 365 | https://dynamics.microsoft.com |
| ☐ | NetSuite | https://www.netsuite.com |
| ☐ | Odoo | https://www.odoo.com |
| ☐ | Busy Accounting | https://www.busy.in |
| ☐ | Marg ERP | https://margcompusoft.com |
| ☐ | LOGIC ERP | https://logicerp.com |

## POS_SYSTEM — new category (9)

| Done | Channel | Apply URL |
|---|---|---|
| ☐ | Shopify POS | https://www.shopify.com/pos |
| ☐ | Square POS | https://squareup.com/pos |
| ☐ | Lightspeed POS | https://www.lightspeedhq.com |
| ☐ | LoyVerse POS | https://loyverse.com |
| ☐ | GoFrugal | https://www.gofrugal.com |
| ☐ | Posist (UrbanPiper) | https://www.posist.com |
| ☐ | Petpooja | https://petpooja.com |
| ☐ | Vyapar | https://vyaparapp.in |
| ☐ | Zoho Inventory POS | https://www.zoho.com/inventory |

## PAYMENT — new category (9)

| Done | Channel | Apply URL |
|---|---|---|
| ☐ | Razorpay | https://razorpay.com |
| ☐ | PayU | https://payu.in |
| ☐ | CCAvenue | https://www.ccavenue.com |
| ☐ | Cashfree | https://www.cashfree.com |
| ☐ | Stripe | https://stripe.com |
| ☐ | PayPal | https://www.paypal.com/business |
| ☐ | Paytm Payments | https://business.paytm.com |
| ☐ | PhonePe Business | https://business.phonepe.com |
| ☐ | Instamojo | https://www.instamojo.com |

## TAX — new category (5)

| Done | Channel | Apply URL |
|---|---|---|
| ☐ | ClearTax | https://cleartax.in |
| ☐ | GSTZen | https://gstzen.in |
| ☐ | TaxCloud (IRP) | https://einvoice1.gst.gov.in |
| ☐ | Avalara | https://www.avalara.com |
| ☐ | Zoho GST | https://www.zoho.com/in/books/gst |

## CRM / Customer engagement — new category (12)

| Done | Channel | Apply URL |
|---|---|---|
| ☐ | HubSpot | https://www.hubspot.com |
| ☐ | Salesforce CRM | https://www.salesforce.com |
| ☐ | Zoho CRM | https://www.zoho.com/crm |
| ☐ | Mailchimp | https://mailchimp.com |
| ☐ | Klaviyo | https://www.klaviyo.com |
| ☐ | Brevo (Sendinblue) | https://www.brevo.com |
| ☐ | WebEngage | https://webengage.com |
| ☐ | MoEngage | https://www.moengage.com |
| ☐ | CleverTap | https://clevertap.com |
| ☐ | Freshdesk | https://www.freshworks.com/freshdesk |
| ☐ | Zendesk | https://www.zendesk.com |
| ☐ | Gorgias | https://www.gorgias.com |

## RETURNS / Reverse logistics — new category (4)

| Done | Channel | Apply URL |
|---|---|---|
| ☐ | Return Prime | https://www.returnprime.com |
| ☐ | WeReturn | https://wereturn.in |
| ☐ | Anchanto Returns | https://www.anchanto.com |
| ☐ | EasyVMS | https://vms.easyecom.io |

## FULFILLMENT / 3PL — new category (5)

| Done | Channel | Apply URL |
|---|---|---|
| ☐ | Amazon FBA | https://sell.amazon.in/fulfillment-by-amazon |
| ☐ | Flipkart Smart Fulfillment | https://seller.flipkart.com |
| ☐ | WareIQ | https://wareiq.com |
| ☐ | LogiNext | https://www.loginextsolutions.com |
| ☐ | Holisol Logistics | https://www.holisollogistics.com |

---

## Totals

| Category | Pending | Live |
|---|---:|---:|
| ECOM (international) | 20 | 0 |
| ECOM (India gaps) | 6 | — |
| ECOM (already live) | — | 18 |
| QUICKCOM | 2 | 5 |
| LOGISTICS | 12 | 16 |
| OWNSTORE | 11 | 9 |
| SOCIAL | 4 | 3 |
| ACCOUNTING | 14 | 0 |
| POS_SYSTEM | 9 | 0 |
| PAYMENT | 9 | 0 |
| TAX | 5 | 0 |
| CRM | 12 | 0 |
| RETURNS | 4 | 0 |
| FULFILLMENT | 5 | 0 |
| B2B / CUSTOM (manual) | — | 5 |
| **Total** | **113** | **56** |
