// Adapters for the previously-pending QUICKCOM channels.
// All four are flagged `comingSoon: true` in the channel catalog except
// COUNTRY_DELIGHT, which is a thin alias over the production-tested
// CustomWebhookAdapter and is therefore live.
//
// Status (2026-05-01):
//   FLIPKART_MINUTES → adapter rewritten; needs Flipkart seller account with
//                      Flipkart Minutes onboarding to smoke test.
//   TATA_1MG         → Tata 1mg has no public seller API; the URLs/fields
//                      below are best-effort based on partner docs leaked by
//                      onboarded sellers. Requires Tata 1mg partnership.
//   DUNZO            → Dunzo for Business was wound down in early 2024.
//                      Adapter retained for historical reference; do not
//                      flip comingSoon → false unless the service is revived.
//   COUNTRY_DELIGHT  → live; receives orders via /channels/:id/webhook.

const { BaseAdapter, bearerClient, makeOrderShape } = require('../_base');
const FlipkartAdapter = require('../ecom/flipkart');
const CustomWebhookAdapter = require('../ownstore/custom-webhook');

// ───────────────────────────── Flipkart Minutes ─────────────────────────────
// Flipkart Minutes orders flow through the same Flipkart Marketplace API as
// regular Flipkart orders. The seller distinguishes them via the listing's
// `service_profile` / `fulfilment_tla` field on the raw order. We intercept
// the parent's request, filter on the raw response, then transform.
class FlipkartMinutesAdapter extends FlipkartAdapter {
  async testConnection() {
    const base = await super.testConnection();
    return { ...base, mode: 'flipkart-minutes', note: 'Filters Flipkart orders by service_profile=QUICK_COMMERCE.' };
  }

  async fetchOrders(sinceDate) {
    const params = {
      states: 'APPROVED,PACKING_IN_PROGRESS,PACKED,READY_TO_DISPATCH',
      pagination_offset: 0,
      pagination_limit: 50,
    };
    if (sinceDate) params.modifiedAfter = new Date(sinceDate).toISOString();

    const data = await this._request('GET', '/v3/orders', null, params);
    const raw = data?.order_items || [];

    // Quick-commerce orders carry a fulfilment_tla under ~30min or a
    // service_profile of QUICK_COMMERCE / EXPRESS. Filter on whichever the
    // seller's account exposes.
    const quick = raw.filter(o => {
      const sp = String(o.service_profile || '').toUpperCase();
      const tla = parseInt(o.fulfilment_tla || 0, 10);
      return sp === 'QUICK_COMMERCE' || sp === 'EXPRESS' || (tla > 0 && tla <= 60);
    });

    return quick.map(o => this._transformOrder(o));
  }
}

// ───────────────────────────── Tata 1mg ─────────────────────────────────────
// Speculative — Tata 1mg requires an onboarded seller partnership; the URLs
// and field names below are derived from partner documentation and may need
// adjusting once real credentials are issued.
class Tata1mgAdapter extends BaseAdapter {
  constructor(creds = {}) {
    super(creds);
    this.client = bearerClient('https://seller-api.1mg.com/v1', creds.apiKey, {
      'X-Seller-Id': creds.sellerId || '',
    });
  }

  async testConnection() {
    if (!this.creds.apiKey || !this.creds.sellerId) {
      return { success: false, error: 'Missing apiKey or sellerId. Obtain from Tata 1mg seller portal.' };
    }
    try {
      const { data } = await this.client.get('/seller/profile');
      return { success: true, sellerId: data?.seller_id, name: data?.seller_name };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }

  async fetchOrders(sinceDate) {
    const params = { status: 'PENDING', limit: 50, page: 1 };
    if (sinceDate) params.from_date = new Date(sinceDate).toISOString();

    const all = [];
    while (true) {
      const { data } = await this.client.get('/orders', { params });
      const batch = data?.orders || [];
      all.push(...batch);
      if (batch.length < params.limit) break;
      params.page += 1;
    }

    return all.map(o => makeOrderShape({
      channelOrderId: o.order_id,
      channelOrderNumber: o.order_number || o.order_id,
      customer: {
        name: o.customer_name || 'Tata 1mg Customer',
        phone: o.customer_phone || null,
      },
      shippingAddress: {
        line1: o.delivery_address?.line1,
        line2: o.delivery_address?.line2,
        city: o.delivery_address?.city,
        state: o.delivery_address?.state,
        pincode: o.delivery_address?.pincode,
        country: 'India',
      },
      items: (o.items || []).map(i => ({
        channelSku: i.sku_id || i.sku,
        name: i.product_name,
        qty: i.quantity,
        unitPrice: parseFloat(i.unit_price || 0),
      })),
      subtotal: parseFloat(o.subtotal || 0),
      tax: parseFloat(o.tax_amount || 0),
      total: parseFloat(o.total_amount || 0),
      paymentMethod: o.payment_mode || '1mg',
      orderedAt: new Date(o.created_at || Date.now()),
    }));
  }

  async updateInventoryLevel(sku, qty) {
    await this.client.post('/inventory/update', { sku_id: sku, quantity: qty });
    return { updated: true, sku, qty };
  }
}

// ───────────────────────────── Dunzo (DEPRECATED) ───────────────────────────
// Dunzo for Business was wound down in early 2024 (the consumer app shut down
// in late 2024). This adapter is retained so existing tenants don't error on
// channel listing, but it should never be used to onboard a new connection.
class DunzoAdapter extends BaseAdapter {
  async testConnection() {
    return {
      success: false,
      deprecated: true,
      error: 'Dunzo for Business was discontinued in 2024. This integration is no longer supported.',
    };
  }
  async fetchOrders() { return []; }
  async updateInventoryLevel() { return { success: false, skipped: true, reason: 'Dunzo discontinued' }; }
}

// ───────────────────────────── Country Delight ──────────────────────────────
// Country Delight has no public seller API; orders are pushed to us by their
// integration team via signed webhook. The CustomWebhook adapter handles
// signature validation, payload normalisation, and field mapping.
class CountryDelightAdapter extends CustomWebhookAdapter {
  async testConnection() {
    const base = await super.testConnection();
    return { ...base, channel: 'COUNTRY_DELIGHT', note: 'Country Delight is webhook-only. Share /channels/:id/webhook with their team.' };
  }
}

module.exports = { FlipkartMinutesAdapter, Tata1mgAdapter, DunzoAdapter, CountryDelightAdapter };
