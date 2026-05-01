const axios = require('axios');
const { makeOrderShape } = require('../_base');

// ManoMano adapter — European DIY & home-improvement marketplace.
//
// Auth model — per-seller API key (no founder app):
//   Each retailer is onboarded into ManoMano's seller hub and issued a
//   bearer-style API token tied to their account. No OAuth flow.
//
// Per-tenant credentials shape (encrypted on the channel row):
//   { accessToken, region: 'FR'|'UK'|'DE'|'IT'|'ES'|'BE' }
//
// Docs:
//   https://developer.manomano.com/

const HOST = 'https://www.manomano.com';

const REGION_NAMES = {
  FR: 'France',
  UK: 'United Kingdom',
  DE: 'Germany',
  IT: 'Italy',
  ES: 'Spain',
  BE: 'Belgium',
};

class ManoManoAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
    this.region = (credentials.region || 'FR').toUpperCase();
    this.client = axios.create({
      baseURL: HOST,
      headers: {
        Authorization: `Bearer ${credentials.accessToken || ''}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Mano-Country': this.region,
      },
    });
  }

  async testConnection() {
    if (!this.creds.accessToken) {
      return { success: false, error: 'Missing accessToken — generate one in ManoMano seller hub.' };
    }
    try {
      const { data } = await this.client.get('/api/v2/seller/me');
      return { success: true, region: this.region, sellerId: data?.seller_id, name: data?.name };
    } catch (err) {
      return {
        success: false,
        error: err.response?.status === 401
          ? 'Invalid ManoMano accessToken.'
          : (err.response?.data?.message || err.message),
      };
    }
  }

  async fetchOrders(sinceDate) {
    const all = [];
    let page = 1;
    const limit = 50;
    let safety = 0;

    while (++safety < 50) {
      const params = {
        state: 'TO_SHIP',
        limit,
        page,
      };
      if (sinceDate) params['updated_after'] = new Date(sinceDate).toISOString();

      const { data } = await this.client.get('/api/v2/orders', { params });
      const batch = data?.orders || data?.results || [];
      all.push(...batch);
      if (batch.length < limit) break;
      page += 1;
    }

    return all.map((o) => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, qty) {
    await this.client.post('/api/v2/products/stock', {
      product_sku: sku,
      stock: parseInt(qty, 10) || 0,
    });
    return { updated: true, sku, qty };
  }

  async updateListing(sku, fields) {
    const body = { product_sku: sku };
    if (fields.qty   !== undefined) body.stock = parseInt(fields.qty, 10) || 0;
    if (fields.price !== undefined) body.price = parseFloat(fields.price);
    if (fields.title !== undefined) body.title = fields.title;
    const { data } = await this.client.post('/api/v2/products/update', body);
    return { channel: 'MANOMANO', sku, response: data };
  }

  _transformOrder(o) {
    const ship = o.shipping_address || {};
    return makeOrderShape({
      channelOrderId: o.order_id || o.id,
      channelOrderNumber: o.order_id || o.id,
      customer: {
        name: ship.name || `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim() || 'ManoMano Customer',
        email: o.customer?.email || null,
        phone: ship.phone || o.customer?.phone || null,
      },
      shippingAddress: {
        line1: ship.address1,
        line2: ship.address2,
        city: ship.city,
        state: ship.region,
        pincode: ship.zipcode || ship.postcode,
        country: ship.country || this.region,
      },
      items: (o.items || o.lines || []).map((it) => ({
        channelSku: it.product_sku || it.sku,
        name: it.title || it.product_name,
        qty: parseInt(it.quantity || 1, 10),
        unitPrice: parseFloat(it.unit_price || it.price || 0),
      })),
      total: parseFloat(o.total_amount || o.total || 0),
      paymentMethod: o.payment_method || 'ManoMano',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.created_at || o.purchased_at || Date.now()),
    });
  }
}

module.exports = ManoManoAdapter;
module.exports.HOST = HOST;
module.exports.REGION_NAMES = REGION_NAMES;
