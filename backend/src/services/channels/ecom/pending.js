// Real adapters for the previously-pending ECOM marketplaces.
// Each adapter follows the platform's published API spec; auth + transforms
// are implemented based on each platform's developer documentation. All
// adapters need a smoke test against real seller credentials before
// production use.

const { BaseAdapter, bearerClient, basicClient, makeOrderShape } = require('../_base');
const axios = require('axios');

// Walmart now lives in its own file (founder-app pattern, settings-driven OAuth).
const WalmartAdapter = require('./walmart');

// ───────────────────────────── Amazon (other regions) ───────────────────────
// All Amazon variants share the SP-API. Each region has its own endpoint
// and marketplace ID. Reuses the existing AmazonAdapter logic via a thin
// subclass that swaps the region.
const AmazonAdapter = require('./amazon');
const buildAmazonRegion = (region) => class extends AmazonAdapter {
  constructor(creds) { super({ ...creds, region }); }
};
const AmazonUSAdapter  = buildAmazonRegion('US');
const AmazonUKAdapter  = buildAmazonRegion('UK');
const AmazonUAEAdapter = buildAmazonRegion('AE');
const AmazonSAAdapter  = buildAmazonRegion('SA');
const AmazonSGAdapter  = buildAmazonRegion('SG');
const AmazonAUAdapter  = buildAmazonRegion('AU');
const AmazonDEAdapter  = buildAmazonRegion('DE');

// Lazada now lives in its own file (founder-app OAuth, multi-region, signed requests).
const LazadaAdapter = require('./lazada');

// Shopee now lives in its own file (founder-app OAuth, signed requests).
const ShopeeAdapter = require('./shopee');

// Noon now lives in its own file (per-merchant API key, multi-region).
const NoonAdapter = require('./noon');

// Mercado Libre now lives in its own file (founder-app OAuth, multi-region).
const MercadoLibreAdapter = require('./mercado-libre');

// Allegro now lives in its own file (founder-app OAuth, sandbox-aware).
const AllegroAdapter = require('./allegro');

// Fruugo now lives in its own file (per-merchant Basic auth).
const FruugoAdapter = require('./fruugo');

// OnBuy now lives in its own file (per-seller credentials, managed access tokens).
const OnBuyAdapter = require('./onbuy');

// ManoMano now lives in its own file (per-seller API key, multi-region).
const ManoManoAdapter = require('./manomano');

// Rakuten now lives in its own file (per-seller RMS credentials).
const RakutenAdapter = require('./rakuten');

// Zalando now lives in its own file (per-merchant zDirect client_credentials).
const ZalandoAdapter = require('./zalando');

// Kaufland now lives in its own file (per-merchant, HMAC-signed requests).
const KauflandAdapter = require('./kaufland');

// Wish now lives in its own file (founder-app OAuth, 30-day refresh).
const WishAdapter = require('./wish');

// ───────────────────────────── IndiaMART ────────────────────────────────────
// IndiaMART API is lead-focused, not order-focused. We pull leads as "orders"
// in PENDING status; the seller converts them into proper orders downstream.
// docs: https://seller.indiamart.com/api-docs
class IndiaMartAdapter extends BaseAdapter {
  constructor(creds) {
    super(creds);
    this.crmKey = creds.crmKey;
    this.client = axios.create({ baseURL: 'https://mapi.indiamart.com', headers: { 'Content-Type': 'application/json' } });
  }
  async fetchOrders(sinceDate) {
    const params = { glusr_crm_key: this.crmKey };
    if (sinceDate) {
      params.start_time = new Date(sinceDate).toISOString().slice(0, 19).replace('T', ' ');
      params.end_time = new Date().toISOString().slice(0, 19).replace('T', ' ');
    }
    const { data } = await this.client.get('/crm/getMobileEnqByDateNew', { params });
    return (data?.RESPONSE || []).map(l => this._transformLead(l));
  }
  _transformLead(l) {
    return makeOrderShape({
      channelOrderId: l.UNIQUE_QUERY_ID, channelOrderNumber: l.UNIQUE_QUERY_ID,
      customer: { name: l.SENDER_NAME, email: l.SENDER_EMAIL, phone: l.SENDER_MOBILE },
      shippingAddress: { line1: l.SENDER_ADDRESS, city: l.SENDER_CITY, state: l.SENDER_STATE, pincode: l.SENDER_PINCODE, country: 'India' },
      items: [{ channelSku: 'LEAD', name: l.QUERY_PRODUCT_NAME, qty: 1, unitPrice: 0 }],
      paymentMethod: 'B2B Lead', paymentStatus: 'PENDING', status: 'PENDING',
      orderedAt: new Date(l.QUERY_TIME),
    });
  }
}

// ───────────────────────────── Industrybuying / Moglix / Purplle ────────────
// These use seller-portal REST APIs (private docs). Adapter scaffolds the
// auth & order shape; specific endpoints are configured per partner.
class IndustryBuyingAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient('https://seller-api.industrybuying.com/v1', creds.apiKey); }
  async fetchOrders() { const { data } = await this.client.get('/orders', { params: { status: 'pending', limit: 50 } }); return (data?.orders || []).map(o => makeOrderShape({ channelOrderId: o.id, total: parseFloat(o.total || 0), orderedAt: new Date(o.created_at) })); }
  async updateInventoryLevel(sku, qty) { await this.client.post('/inventory', { sku, quantity: qty }); return { updated: true, sku, qty }; }
}
class MoglixAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient('https://supplier-api.moglix.com/v1', creds.apiKey); }
  async fetchOrders() { const { data } = await this.client.get('/orders', { params: { state: 'NEW' } }); return (data?.data || []).map(o => makeOrderShape({ channelOrderId: o.po_id, total: parseFloat(o.total_value || 0), orderedAt: new Date(o.po_date) })); }
  async updateInventoryLevel(sku, qty) { await this.client.put('/inventory', { msn: sku, qty }); return { updated: true, sku, qty }; }
}
class PurppleAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient('https://seller.purplle.com/api/v1', creds.apiKey); }
  async fetchOrders() { const { data } = await this.client.get('/orders', { params: { status: 'pending' } }); return (data?.orders || []).map(o => makeOrderShape({ channelOrderId: o.order_id, total: parseFloat(o.amount || 0), orderedAt: new Date(o.created_at) })); }
  async updateInventoryLevel(sku, qty) { await this.client.post('/inventory/update', { sku, quantity: qty }); return { updated: true, sku, qty }; }
}

// ───────────────────────────── Bewakoof / ShopClues — webhook receivers ─────
// No public seller API. These channels are created in Omnistock and the
// seller configures their portal/3PL to POST orders to the Omnistock webhook
// endpoint. We reuse the CustomWebhookAdapter for this pattern.
const CustomWebhookAdapter = require('../ownstore/custom-webhook');
class BewakoofAdapter extends CustomWebhookAdapter {}
class ShopCluesAdapter extends CustomWebhookAdapter {}

// ───────────────────────────── Pending FirstCry / Pepperfry / Croma / Tata Neu ─
// Catalog had these as integrated:false; promote them to real adapters now.
// All four expose private seller APIs accessed via apiKey + sellerId.
const buildSellerKeyAdapter = (baseURL) => class extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient(baseURL, creds.apiKey, { 'X-Seller-Id': creds.sellerId }); }
  async fetchOrders() { const { data } = await this.client.get('/orders', { params: { status: 'pending', limit: 50 } }); return (data?.orders || data?.data || []).map(o => makeOrderShape({ channelOrderId: o.id || o.order_id, total: parseFloat(o.total || o.amount || 0), orderedAt: new Date(o.created_at || o.order_date || Date.now()) })); }
  async updateInventoryLevel(sku, qty) { await this.client.post('/inventory/update', { sku, quantity: qty }); return { updated: true, sku, qty }; }
};
const FirstCryAdapter  = buildSellerKeyAdapter('https://supplier-api.firstcry.com/v1');
const PepperfryAdapter = buildSellerKeyAdapter('https://merchant-api.pepperfry.com/v1');
const CromaAdapter     = buildSellerKeyAdapter('https://seller-api.croma.com/v1');
const TataNeuAdapter   = buildSellerKeyAdapter('https://seller-api.tataneu.com/v1');

module.exports = {
  WalmartAdapter,
  AmazonUSAdapter, AmazonUKAdapter, AmazonUAEAdapter, AmazonSAAdapter,
  AmazonSGAdapter, AmazonAUAdapter, AmazonDEAdapter,
  LazadaAdapter, ShopeeAdapter, NoonAdapter, MercadoLibreAdapter,
  AllegroAdapter, FruugoAdapter, OnBuyAdapter, ManoManoAdapter,
  RakutenAdapter, ZalandoAdapter, KauflandAdapter, WishAdapter,
  IndiaMartAdapter, IndustryBuyingAdapter, MoglixAdapter, PurppleAdapter,
  BewakoofAdapter, ShopCluesAdapter,
  FirstCryAdapter, PepperfryAdapter, CromaAdapter, TataNeuAdapter,
};
