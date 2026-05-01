const axios = require('axios');
const { makeOrderShape } = require('../_base');

// Fruugo adapter — global cross-border marketplace (lists onto 40+ destination
// sites under the Fruugo umbrella).
//
// Auth model — per-merchant HTTP Basic:
//   Each retailer signs up at https://www.fruugo.com/sell and is issued
//   merchant credentials (username + password) tied to their account.
//   No founder app, no OAuth — same Basic-auth model as Noon's API key.
//
// Per-tenant credentials shape (encrypted on the channel row):
//   { username, password }
//
// Docs:
//   https://faq.fruugo.com/hc/en-gb/categories/360001212580-API
//   https://www.fruugo.com/sell

const HOST = 'https://www.fruugo.com';

class FruugoAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
    this.client = axios.create({
      baseURL: HOST,
      auth: {
        username: credentials.username || '',
        password: credentials.password || '',
      },
      headers: { Accept: 'application/json' },
    });
  }

  async testConnection() {
    if (!this.creds.username || !this.creds.password) {
      return { success: false, error: 'Missing username or password.' };
    }
    try {
      // Fruugo doesn't expose a "ping" endpoint; we hit the orders/new feed
      // with size=0 to verify auth works without pulling data.
      await this.client.get('/api/orders/new', { params: { size: 0 } });
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.status === 401
          ? 'Invalid Fruugo credentials.'
          : (err.response?.data?.message || err.message),
      };
    }
  }

  async fetchOrders(sinceDate) {
    const all = [];
    let page = 1;
    const size = 100;
    let safety = 0;

    while (++safety < 50) {
      const params = { page, size };
      if (sinceDate) params.since = new Date(sinceDate).toISOString();

      const { data } = await this.client.get('/api/orders/new', { params });
      const batch = data?.orders || data?.items || [];
      all.push(...batch);
      if (batch.length < size) break;
      page += 1;
    }

    return all.map((o) => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, qty) {
    await this.client.post('/api/inventory', {
      sku,
      stock: parseInt(qty, 10) || 0,
    });
    return { updated: true, sku, qty };
  }

  async updateListing(sku, fields) {
    const body = { sku };
    if (fields.qty   !== undefined) body.stock = parseInt(fields.qty, 10) || 0;
    if (fields.price !== undefined) body.price = parseFloat(fields.price);
    if (fields.title !== undefined) body.title = fields.title;
    const { data } = await this.client.post('/api/products/update', body);
    return { channel: 'FRUUGO', sku, response: data };
  }

  // Acknowledge a Fruugo order — required after fetch so it's removed from
  // the /new feed.
  async acknowledgeOrder(orderId) {
    await this.client.post(`/api/orders/${encodeURIComponent(orderId)}/acknowledge`, {});
    return { acknowledged: true, orderId };
  }

  _transformOrder(o) {
    const ship = o.deliveryAddress || o.shipping_address || {};
    return makeOrderShape({
      channelOrderId: o.orderId || o.id,
      channelOrderNumber: o.fruugoOrderId || o.orderId || o.id,
      customer: {
        name: o.customerName || `${o.firstName || ''} ${o.lastName || ''}`.trim() || 'Fruugo Customer',
        email: o.customerEmail || null,
        phone: ship.phone || null,
      },
      shippingAddress: {
        line1: ship.line1 || ship.address1,
        line2: ship.line2 || ship.address2,
        city: ship.city,
        state: ship.region || ship.state,
        pincode: ship.postcode || ship.zip,
        country: ship.country || ship.countryCode,
      },
      items: (o.items || o.orderLines || []).map((it) => ({
        channelSku: it.sku || it.skuId,
        name: it.title || it.productName,
        qty: parseInt(it.quantity || 1, 10),
        unitPrice: parseFloat(it.unitPrice || it.price || 0),
      })),
      total: parseFloat(o.totalAmount || o.orderTotal || 0),
      paymentMethod: o.paymentMethod || 'Fruugo',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.orderedAt || o.createdAt || Date.now()),
    });
  }
}

module.exports = FruugoAdapter;
module.exports.HOST = HOST;
