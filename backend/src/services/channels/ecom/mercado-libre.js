const axios = require('axios');
const settings = require('../../settings.service');
const { makeOrderShape } = require('../_base');

// Mercado Libre adapter — Latin America (AR, BR, MX, CL, CO, UY, PE, VE).
//
// Auth model — founder-app OAuth 2.0:
//   1. Kartriq registers one Mercado Libre app at https://developers.mercadolibre.com
//      and stores client_id + client_secret + redirectUri in settings.service:
//      mercadolibre.clientId / mercadolibre.clientSecret / mercadolibre.redirectUri.
//   2. Seller (tenant) clicks Authorize → consent on auth.mercadolibre.com.<tld>
//      → ML redirects back with `code`. We exchange via /oauth/token for a
//      6h access_token + single-use refresh_token + numeric user_id.
//   3. Per-request: bearer access_token; auto-refresh on expiry.
//
// Per-tenant credentials shape (encrypted on the channel row):
//   { accessToken, refreshToken, userId, region,
//     expiresAt? }
//
// Docs:
//   https://developers.mercadolibre.com.ar/en_us/authentication-and-authorization
//   https://developers.mercadolibre.com.ar/en_us/orders-management

const API_HOST = 'https://api.mercadolibre.com';

// Each market has its own consent host. Same client_id works across all.
const REGION_AUTH_HOSTS = {
  AR: 'https://auth.mercadolibre.com.ar',
  BR: 'https://auth.mercadolivre.com.br',
  MX: 'https://auth.mercadolibre.com.mx',
  CL: 'https://auth.mercadolibre.cl',
  CO: 'https://auth.mercadolibre.com.co',
  UY: 'https://auth.mercadolibre.com.uy',
  PE: 'https://auth.mercadolibre.com.pe',
  VE: 'https://auth.mercadolibre.com.ve',
};

const REGION_NAMES = {
  AR: 'Argentina',
  BR: 'Brazil',
  MX: 'Mexico',
  CL: 'Chile',
  CO: 'Colombia',
  UY: 'Uruguay',
  PE: 'Peru',
  VE: 'Venezuela',
};

class MercadoLibreAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
    this.region = (credentials.region || 'AR').toUpperCase();
    this.userId = credentials.userId;
  }

  async _getAppCredentials() {
    const clientId     = this.creds.clientId     || (await settings.get('mercadolibre.clientId'));
    const clientSecret = this.creds.clientSecret || (await settings.get('mercadolibre.clientSecret'));
    if (!clientId || !clientSecret) {
      throw new Error('Mercado Libre app not configured. Set mercadolibre.clientId and mercadolibre.clientSecret in Admin → Settings.');
    }
    return { clientId, clientSecret };
  }

  async _ensureAccessToken() {
    if (!this.creds.accessToken) throw new Error('Not authorised — run the Mercado Libre OAuth flow first.');
    if (this.creds.expiresAt && Date.now() < this.creds.expiresAt - 60_000) return this.creds.accessToken;
    // Token expired or about to — refresh.
    const fresh = await this.refreshAccessToken();
    return fresh.accessToken;
  }

  async _request(method, path, params = {}, body = null) {
    const token = await this._ensureAccessToken();
    const resp = await axios({
      method,
      url: `${API_HOST}${path}`,
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json', 'Content-Type': 'application/json' },
      params,
      data: body,
    });
    return resp.data;
  }

  async testConnection() {
    if (!this.creds.accessToken) {
      return { success: false, error: 'Not authorised yet — run the Mercado Libre OAuth flow first.' };
    }
    try {
      const data = await this._request('GET', '/users/me');
      return {
        success: true,
        region: this.region,
        userId: data?.id,
        nickname: data?.nickname,
        siteId: data?.site_id,
      };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }

  async fetchOrders(sinceDate) {
    if (!this.userId) throw new Error('Cannot fetch orders — userId missing on channel credentials.');
    const all = [];
    let offset = 0;
    const limit = 50;
    let safety = 0;

    while (++safety < 50) {
      const params = {
        seller: this.userId,
        'order.status': 'paid',
        offset,
        limit,
        sort: 'date_desc',
      };
      if (sinceDate) params['order.date_created.from'] = new Date(sinceDate).toISOString();

      const data = await this._request('GET', '/orders/search', params);
      const batch = data?.results || [];
      all.push(...batch);
      const total = data?.paging?.total ?? batch.length;
      if (batch.length < limit || offset + batch.length >= total) break;
      offset += limit;
    }

    return all.map((o) => this._transformOrder(o));
  }

  // ML inventory keying: each listing is identified by item_id (e.g. MLA12345).
  // Sellers should map their internal SKU → item_id via creds.skuMap; otherwise
  // we treat the supplied sku as the item_id directly.
  async updateInventoryLevel(sku, qty) {
    const itemId = (this.creds.skuMap && this.creds.skuMap[sku]) || sku;
    await this._request('PUT', `/items/${encodeURIComponent(itemId)}`, {}, {
      available_quantity: parseInt(qty, 10) || 0,
    });
    return { updated: true, sku, qty, itemId };
  }

  async exchangeAuthCode(code, redirectUri) {
    const { clientId, clientSecret } = await this._getAppCredentials();
    const { data } = await axios.post(
      `${API_HOST}/oauth/token`,
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
      userId: data.user_id,
      expiresAt: Date.now() + (data.expires_in || 21600) * 1000,
    };
  }

  async refreshAccessToken() {
    if (!this.creds.refreshToken) throw new Error('No refresh_token stored for this Mercado Libre channel.');
    const { clientId, clientSecret } = await this._getAppCredentials();
    const { data } = await axios.post(
      `${API_HOST}/oauth/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: this.creds.refreshToken,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' } }
    );
    // Mutate in-memory creds so this adapter instance keeps working; the caller
    // (sync runner) is responsible for persisting the new tokens to the DB.
    this.creds.accessToken  = data.access_token;
    this.creds.refreshToken = data.refresh_token || this.creds.refreshToken;
    this.creds.expiresAt    = Date.now() + (data.expires_in || 21600) * 1000;
    return {
      accessToken: this.creds.accessToken,
      refreshToken: this.creds.refreshToken,
      expiresAt: this.creds.expiresAt,
    };
  }

  _transformOrder(o) {
    const buyer = o.buyer || {};
    const ship = o.shipping?.receiver_address || {};
    return makeOrderShape({
      channelOrderId: o.id,
      channelOrderNumber: o.id,
      customer: {
        name: `${buyer.first_name || ''} ${buyer.last_name || ''}`.trim() || buyer.nickname || 'Mercado Libre Customer',
        email: buyer.email || null,
        phone: buyer.phone?.number || null,
      },
      shippingAddress: {
        line1: ship.address_line || ship.street_name,
        line2: ship.comment,
        city: ship.city?.name,
        state: ship.state?.name,
        pincode: ship.zip_code,
        country: ship.country?.id || this.region,
      },
      items: (o.order_items || []).map((it) => ({
        channelSku: it.item?.seller_sku || it.item?.id,
        name: it.item?.title,
        qty: parseInt(it.quantity || 1, 10),
        unitPrice: parseFloat(it.unit_price || 0),
      })),
      total: parseFloat(o.total_amount || 0),
      paymentMethod: o.payments?.[0]?.payment_method_id || 'Mercado Libre',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.date_created || Date.now()),
    });
  }
}

module.exports = MercadoLibreAdapter;
module.exports.API_HOST = API_HOST;
module.exports.REGION_AUTH_HOSTS = REGION_AUTH_HOSTS;
module.exports.REGION_NAMES = REGION_NAMES;
