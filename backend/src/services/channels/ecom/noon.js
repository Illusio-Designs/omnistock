const axios = require('axios');
const { makeOrderShape } = require('../_base');

// Noon Partners adapter — Middle East marketplace (UAE, KSA, Egypt).
//
// Auth model — per-merchant API key:
//   Each seller signs up at https://partners.noon.com and is issued an
//   API key + partner code tied to their seller account. There is no
//   public OAuth app; the founder-app pattern does not apply.
//
// Per-tenant credentials shape (encrypted on the channel row):
//   { apiKey, partnerCode, region: 'AE' | 'SA' | 'EG' }
//
// Docs:
//   https://docs.noon.partners/

const HOST = 'https://api.noon.partners';

const REGION_NAMES = {
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  EG: 'Egypt',
};

class NoonAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
    this.region = (credentials.region || 'AE').toUpperCase();
    this.client = axios.create({
      baseURL: HOST,
      headers: {
        Authorization: `KEY ${credentials.apiKey || ''}`,
        ...(credentials.partnerCode ? { 'X-Partner-Code': credentials.partnerCode } : {}),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }

  async testConnection() {
    if (!this.creds.apiKey) {
      return { success: false, error: 'Missing apiKey. Generate one in Noon Partners → Settings → API.' };
    }
    if (!this.creds.partnerCode) {
      return { success: false, error: 'Missing partnerCode. Find it in Noon Partners → Account.' };
    }
    try {
      // Lightweight endpoint to verify auth works without pulling order data
      const { data } = await this.client.get('/v1/partner/me');
      return {
        success: true,
        region: this.region,
        partnerCode: this.creds.partnerCode,
        partnerName: data?.partner_name || data?.name,
      };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || err.message,
      };
    }
  }

  async fetchOrders(sinceDate) {
    const all = [];
    let page = 1;
    const limit = 100;
    let safety = 0;

    while (++safety < 50) {
      const params = {
        status: 'placed',
        limit,
        page,
        country_code: this.region,
      };
      if (sinceDate) params.since = new Date(sinceDate).toISOString();

      const { data } = await this.client.get('/v1/orders', { params });
      const batch = data?.orders || data?.data || [];
      all.push(...batch);
      if (batch.length < limit) break;
      page += 1;
    }

    return all.map((o) => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, qty) {
    await this.client.post('/v1/inventory/update', {
      sku,
      quantity: parseInt(qty, 10) || 0,
      country_code: this.region,
    });
    return { updated: true, sku, qty };
  }

  async updateListing(sku, fields) {
    const body = { sku, country_code: this.region };
    if (fields.qty !== undefined)   body.quantity = parseInt(fields.qty, 10);
    if (fields.price !== undefined) body.price    = parseFloat(fields.price);
    if (fields.title !== undefined) body.title    = fields.title;
    const { data } = await this.client.post('/v1/products/update', body);
    return { channel: 'NOON', sku, response: data };
  }

  _transformOrder(o) {
    const ship = o.shipping_address || {};
    return makeOrderShape({
      channelOrderId: o.order_nr || o.order_id,
      channelOrderNumber: o.order_nr || o.order_id,
      customer: {
        name: o.customer_name || `${o.customer_first_name || ''} ${o.customer_last_name || ''}`.trim() || 'Noon Customer',
        email: o.customer_email || null,
        phone: ship.phone || o.customer_phone || null,
      },
      shippingAddress: {
        line1: ship.line1 || ship.address_line1,
        line2: ship.line2 || ship.address_line2,
        city: ship.city,
        state: ship.region || ship.state,
        pincode: ship.zipcode || ship.zip || ship.post_code,
        country: ship.country_code || this.region,
      },
      items: (o.items || o.order_items || []).map((i) => ({
        channelSku: i.sku || i.partner_sku,
        name: i.title || i.name,
        qty: parseInt(i.quantity || i.qty || 1, 10),
        unitPrice: parseFloat(i.unit_price || i.price || 0),
        tax: parseFloat(i.tax || 0),
      })),
      total: parseFloat(o.total_amount || o.grand_total || 0),
      paymentMethod: o.payment_method || 'Noon',
      paymentStatus: o.payment_status === 'paid' ? 'PAID' : 'PENDING',
      status: 'PENDING',
      orderedAt: new Date(o.created_at || o.order_date || Date.now()),
    });
  }
}

module.exports = NoonAdapter;
module.exports.HOST = HOST;
module.exports.REGION_NAMES = REGION_NAMES;
