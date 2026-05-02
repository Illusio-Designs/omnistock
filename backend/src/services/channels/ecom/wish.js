const axios = require('axios');
const settings = require('../../settings.service');
const { makeOrderShape } = require('../_base');

// Wish Merchant Platform adapter — mobile-first global marketplace.
//
// Auth model — founder-app OAuth 2.0:
//   1. Kartriq registers a Wish app at https://merchant.wish.com/api-partner
//      and stores client_id + client_secret + redirectUri in settings.service:
//      wish.clientId / wish.clientSecret / wish.redirectUri.
//   2. Seller (tenant) clicks Authorize → consent on merchant.wish.com →
//      Wish redirects back with `code`. We exchange via /api/v3/oauth/token
//      for a 30-day access_token + refresh_token.
//   3. Per-request: bearer access_token; auto-refresh on expiry.
//
// Per-tenant credentials shape (encrypted on the channel row):
//   { accessToken, refreshToken, expiresAt? }
//
// Docs:
//   https://merchant.wish.com/documentation/api/v3

const HOST = 'https://merchant.wish.com';

class WishAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
  }

  async _getAppCredentials() {
    const clientId     = this.creds.clientId     || (await settings.get('wish.clientId'));
    const clientSecret = this.creds.clientSecret || (await settings.get('wish.clientSecret'));
    if (!clientId || !clientSecret) {
      throw new Error('Wish app not configured. Set wish.clientId and wish.clientSecret in Admin → Settings.');
    }
    return { clientId, clientSecret };
  }

  async _ensureAccessToken() {
    if (!this.creds.accessToken) throw new Error('Not authorised — run the Wish OAuth flow first.');
    if (this.creds.expiresAt && Date.now() < this.creds.expiresAt - 60_000) return this.creds.accessToken;
    const fresh = await this.refreshAccessToken();
    return fresh.accessToken;
  }

  async _request(method, path, params = {}, body = null) {
    const token = await this._ensureAccessToken();
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
    if (!this.creds.accessToken) {
      return { success: false, error: 'Not authorised yet — run the Wish OAuth flow first.' };
    }
    try {
      const data = await this._request('GET', '/api/v3/merchant');
      return {
        success: true,
        merchantId: data?.data?.id,
        merchantName: data?.data?.name,
      };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }

  async fetchOrders(sinceDate) {
    const all = [];
    let start = 0;
    const limit = 100;
    let safety = 0;

    while (++safety < 50) {
      const params = {
        state: 'APPROVED',
        limit,
        start,
      };
      if (sinceDate) params.since = new Date(sinceDate).toISOString();

      const data = await this._request('GET', '/api/v3/orders', params);
      const batch = data?.data || data?.results || [];
      all.push(...batch);
      if (batch.length < limit) break;
      start += limit;
    }

    return all.map((o) => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, qty) {
    await this._request('PUT', `/api/v3/products/sku/${encodeURIComponent(sku)}/inventory`, {}, {
      inventory: parseInt(qty, 10) || 0,
    });
    return { updated: true, sku, qty };
  }

  async updateListing(sku, fields) {
    const body = {};
    if (fields.qty   !== undefined) body.inventory = parseInt(fields.qty, 10) || 0;
    if (fields.price !== undefined) body.price     = parseFloat(fields.price);
    if (fields.title !== undefined) body.name      = fields.title;
    const data = await this._request('PATCH', `/api/v3/products/sku/${encodeURIComponent(sku)}`, {}, body);
    return { channel: 'WISH', sku, response: data };
  }

  async exchangeAuthCode(code, redirectUri) {
    const { clientId, clientSecret } = await this._getAppCredentials();
    const { data } = await axios.post(
      `${HOST}/api/v3/oauth/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }
    );
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in || 30 * 24 * 60 * 60) * 1000,
    };
  }

  async refreshAccessToken() {
    if (!this.creds.refreshToken) throw new Error('No refresh_token stored for this Wish channel.');
    const { clientId, clientSecret } = await this._getAppCredentials();
    const { data } = await axios.post(
      `${HOST}/api/v3/oauth/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: this.creds.refreshToken,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }
    );
    this.creds.accessToken  = data.access_token;
    this.creds.refreshToken = data.refresh_token || this.creds.refreshToken;
    this.creds.expiresAt    = Date.now() + (data.expires_in || 30 * 24 * 60 * 60) * 1000;
    return {
      accessToken: this.creds.accessToken,
      refreshToken: this.creds.refreshToken,
      expiresAt: this.creds.expiresAt,
    };
  }

  _transformOrder(o) {
    const ship = o.shipping_detail || o.shipping_address || {};
    return makeOrderShape({
      channelOrderId: o.id || o.order_id,
      channelOrderNumber: o.id || o.order_id,
      customer: {
        name: ship.name || `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim() || 'Wish Customer',
        email: o.customer?.email || null,
        phone: ship.phone_number || null,
      },
      shippingAddress: {
        line1: ship.street_address1,
        line2: ship.street_address2,
        city: ship.city,
        state: ship.state,
        pincode: ship.zipcode,
        country: ship.country || ship.country_code || 'US',
      },
      items: (o.items || []).map((it) => ({
        channelSku: it.sku || it.product_sku,
        name: it.product_name,
        qty: parseInt(it.quantity || 1, 10),
        unitPrice: parseFloat(it.price || it.unit_price || 0),
      })),
      total: parseFloat(o.total || o.cost?.total || 0),
      paymentMethod: 'Wish',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.placed_time || o.created_at || Date.now()),
    });
  }
}

module.exports = WishAdapter;
module.exports.HOST = HOST;
