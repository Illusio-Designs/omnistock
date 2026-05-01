const axios = require('axios');
const { makeOrderShape } = require('../_base');

// Zalando adapter — European fashion marketplace (zDirect API).
//
// Auth model — per-merchant client credentials (no founder app):
//   Each merchant registers a client in zDirect → gets client_id +
//   client_secret + merchant_id tied to their account. We exchange
//   client credentials for short-lived access tokens via the OAuth
//   token endpoint and refresh transparently when they expire.
//
// Per-tenant credentials shape (encrypted on the channel row):
//   { clientId, clientSecret, merchantId }
//
// Docs:
//   https://api.merchants.zalandoapis.com/docs
//   https://corporate.zalando.com/en/partner-hub

const HOST       = 'https://api.merchants.zalandoapis.com';
const TOKEN_HOST = 'https://api.merchants.zalandoapis.com/oauth/token';

class ZalandoAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
    this.merchantId = credentials.merchantId;
    this.client = axios.create({
      baseURL: HOST,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    this._accessToken = null;
    this._tokenExpiry = 0;
  }

  async _getAccessToken() {
    if (this._accessToken && Date.now() < this._tokenExpiry - 60_000) return this._accessToken;
    if (!this.creds.clientId || !this.creds.clientSecret) {
      throw new Error('Zalando credentials missing — paste clientId + clientSecret from zDirect.');
    }
    const auth = Buffer.from(`${this.creds.clientId}:${this.creds.clientSecret}`).toString('base64');
    const { data } = await axios.post(
      TOKEN_HOST,
      new URLSearchParams({ grant_type: 'client_credentials', scope: 'orders:read articles:read articles:write' }).toString(),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      }
    );
    this._accessToken = data?.access_token;
    this._tokenExpiry = Date.now() + ((data?.expires_in || 3600) * 1000);
    if (!this._accessToken) throw new Error('Zalando did not return an access_token');
    return this._accessToken;
  }

  async _request(method, path, params = {}, body = null) {
    const token = await this._getAccessToken();
    const resp = await axios({
      method,
      url: `${HOST}${path}`,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      params,
      data: body,
    });
    return resp.data;
  }

  async testConnection() {
    if (!this.creds.clientId || !this.creds.clientSecret) {
      return { success: false, error: 'Missing clientId or clientSecret.' };
    }
    if (!this.merchantId) {
      return { success: false, error: 'Missing merchantId — find it in zDirect under your account.' };
    }
    try {
      await this._getAccessToken();
      // Probe the orders endpoint with a tiny page; auth fails early if creds are bad.
      await this._request('GET', `/merchants/${encodeURIComponent(this.merchantId)}/orders`, { limit: 1 });
      return { success: true, merchantId: this.merchantId };
    } catch (err) {
      return { success: false, error: err.response?.data?.detail || err.response?.data?.message || err.message };
    }
  }

  async fetchOrders(sinceDate) {
    if (!this.merchantId) throw new Error('Cannot fetch orders — merchantId missing.');
    const all = [];
    let cursor = '';
    let safety = 0;

    while (++safety < 50) {
      const params = { limit: 100, status: 'CREATED' };
      if (cursor) params.after = cursor;
      if (sinceDate) params.created_after = new Date(sinceDate).toISOString();

      const data = await this._request('GET', `/merchants/${encodeURIComponent(this.merchantId)}/orders`, params);
      const batch = data?.orders || data?.items || [];
      all.push(...batch);
      cursor = data?.cursor?.next || data?.next_cursor || '';
      if (!cursor || batch.length === 0) break;
    }

    return all.map((o) => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, qty) {
    if (!this.merchantId) throw new Error('Cannot update stock — merchantId missing.');
    await this._request('PUT', `/merchants/${encodeURIComponent(this.merchantId)}/articles/${encodeURIComponent(sku)}/stock`, {}, {
      stock: parseInt(qty, 10) || 0,
    });
    return { updated: true, sku, qty };
  }

  async updateListing(sku, fields) {
    if (!this.merchantId) throw new Error('Cannot update listing — merchantId missing.');
    if (fields.qty !== undefined) {
      await this.updateInventoryLevel(sku, fields.qty);
    }
    if (fields.price !== undefined) {
      await this._request('PUT', `/merchants/${encodeURIComponent(this.merchantId)}/articles/${encodeURIComponent(sku)}/price`, {}, {
        price: { amount: parseFloat(fields.price), currency: fields.currency || 'EUR' },
      });
    }
    return { channel: 'ZALANDO', sku };
  }

  _transformOrder(o) {
    const ship = o.shipping_address || o.delivery_address || {};
    return makeOrderShape({
      channelOrderId: o.order_number || o.id,
      channelOrderNumber: o.order_number || o.id,
      customer: {
        name: ship.name || `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim() || 'Zalando Customer',
        email: o.customer?.email || null,
        phone: ship.phone_number || null,
      },
      shippingAddress: {
        line1: ship.street || ship.address_line_1,
        line2: ship.additional || ship.address_line_2,
        city: ship.city,
        state: ship.region || null,
        pincode: ship.zip_code || ship.postal_code,
        country: ship.country_code || ship.country || 'DE',
      },
      items: (o.line_items || o.articles || []).map((it) => ({
        channelSku: it.article_sku || it.sku || it.merchant_sku,
        name: it.title || it.article_title,
        qty: parseInt(it.quantity || 1, 10),
        unitPrice: parseFloat(it.gross_unit_price?.amount || it.unit_price?.amount || 0),
      })),
      total: parseFloat(o.gross_total?.amount || o.total_price?.amount || 0),
      paymentMethod: o.payment_method || 'Zalando',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.placed_date || o.created_at || Date.now()),
    });
  }
}

module.exports = ZalandoAdapter;
module.exports.HOST = HOST;
