const axios = require('axios');
const { makeOrderShape } = require('../_base');

// OnBuy adapter — UK & European marketplace.
//
// Auth model — per-seller credentials with managed access tokens:
//   Each seller gets a consumer_key + secret_key from their OnBuy seller
//   account. The adapter exchanges those for a 1-hour access_token via
//   /v2/auth/request-token, then sends it as a Bearer header on subsequent
//   calls. There is no platform OAuth app — each tenant brings their own
//   credentials. We refresh transparently when the cached token expires.
//
// Per-tenant credentials shape (encrypted on the channel row):
//   { consumerKey, secretKey, siteId? }
//   `siteId` is required for some endpoints when the seller operates on
//   multiple OnBuy sites; defaults to OnBuy GB ('2000').
//
// Docs:
//   https://docs.api.onbuy.com/

const HOST = 'https://api.onbuy.com/v2';

class OnBuyAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
    this.siteId = credentials.siteId || '2000'; // OnBuy GB
    this.client = axios.create({
      baseURL: HOST,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    });
    this._accessToken = null;
    this._tokenExpiry = 0;
  }

  async _getAccessToken() {
    if (this._accessToken && Date.now() < this._tokenExpiry - 60_000) return this._accessToken;
    if (!this.creds.consumerKey || !this.creds.secretKey) {
      throw new Error('OnBuy credentials missing — paste consumerKey + secretKey from your OnBuy seller account.');
    }
    const { data } = await axios.post(`${HOST}/auth/request-token`, {
      secret_key: this.creds.secretKey,
      consumer_key: this.creds.consumerKey,
    }, { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } });
    this._accessToken = data?.access_token;
    this._tokenExpiry = Date.now() + ((data?.expires_in || 3600) * 1000);
    if (!this._accessToken) throw new Error('OnBuy did not return an access_token');
    return this._accessToken;
  }

  async _request(method, path, params = {}, body = null) {
    const token = await this._getAccessToken();
    const resp = await axios({
      method,
      url: `${HOST}${path}`,
      headers: { Authorization: token, Accept: 'application/json', 'Content-Type': 'application/json' },
      params: { site_id: this.siteId, ...params },
      data: body,
    });
    return resp.data;
  }

  async testConnection() {
    if (!this.creds.consumerKey || !this.creds.secretKey) {
      return { success: false, error: 'Missing consumerKey or secretKey.' };
    }
    try {
      await this._getAccessToken();
      return { success: true, siteId: this.siteId };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.error_description || err.response?.data?.message || err.message,
      };
    }
  }

  async fetchOrders(sinceDate) {
    const all = [];
    let offset = 0;
    const limit = 50;
    let safety = 0;

    while (++safety < 50) {
      const params = {
        'filter[status]': 'pending',
        limit,
        offset,
      };
      if (sinceDate) params['filter[purchased_at_min]'] = new Date(sinceDate).toISOString();

      const data = await this._request('GET', '/orders', params);
      const batch = data?.results || data?.data || [];
      all.push(...batch);
      if (batch.length < limit) break;
      offset += limit;
    }

    return all.map((o) => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, qty) {
    await this._request('PUT', '/listings/inventory', {}, {
      sku,
      stock: parseInt(qty, 10) || 0,
    });
    return { updated: true, sku, qty };
  }

  async updateListing(sku, fields) {
    const body = { sku };
    if (fields.qty   !== undefined) body.stock = parseInt(fields.qty, 10) || 0;
    if (fields.price !== undefined) body.price = parseFloat(fields.price);
    if (fields.title !== undefined) body.name  = fields.title;
    const data = await this._request('PUT', '/listings', {}, body);
    return { channel: 'ONBUY', sku, response: data };
  }

  _transformOrder(o) {
    const ship = o.shipping_address || {};
    return makeOrderShape({
      channelOrderId: o.order_id,
      channelOrderNumber: o.order_id,
      customer: {
        name: ship.name || `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim() || 'OnBuy Customer',
        email: o.customer?.email || null,
        phone: ship.phone || o.customer?.phone || null,
      },
      shippingAddress: {
        line1: ship.line_1,
        line2: ship.line_2,
        city: ship.town || ship.city,
        state: ship.county || ship.region,
        pincode: ship.postcode,
        country: ship.country || 'GB',
      },
      items: (o.products || o.items || []).map((p) => ({
        channelSku: p.sku,
        name: p.name || p.title,
        qty: parseInt(p.quantity || 1, 10),
        unitPrice: parseFloat(p.unit_price || p.price || 0),
      })),
      total: parseFloat(o.total || o.total_amount || 0),
      paymentMethod: 'OnBuy',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.purchased_at || o.created_at || Date.now()),
    });
  }
}

module.exports = OnBuyAdapter;
module.exports.HOST = HOST;
