const axios = require('axios');
const crypto = require('crypto');
const settings = require('../../settings.service');
const { makeOrderShape } = require('../_base');
const { getEndpoint, PLATFORMS } = require('../../../config/channel-endpoints');

// Lazada Open Platform adapter — multi-region (SG/TH/PH/MY/VN/ID).
//
// Auth model — founder-app OAuth:
//   1. Kartriq registers a Lazada Open Platform app at https://open.lazada.com/apps.
//      App key + app secret are stored once in settings.service under
//      lazada.appKey / lazada.appSecret.
//   2. Seller (tenant) clicks "Authorize" → goes through https://auth.lazada.com,
//      consents, and Lazada redirects back with `code`. We exchange the code for
//      access_token + refresh_token via /rest/auth/token/create.
//   3. Every API call is HMAC-SHA256 signed using app secret. Tokens are
//      refreshed on demand via /rest/auth/token/refresh.
//
// Per-tenant credentials shape (encrypted on the channel row):
//   { accessToken, refreshToken, region: 'SG'|'TH'|'PH'|'MY'|'VN'|'ID',
//     account?, country?, expiresAt?, refreshExpiresAt? }
//
// Docs:
//   https://open.lazada.com/apps/doc/doc?nodeId=10567&docId=108944  (Auth)
//   https://open.lazada.com/apps/doc/api?path=/orders/get           (Orders)

// Region URLs come from channel-endpoints.js — flips between production
// (api.lazada.{tld}) and sandbox (api-sandbox.lazada.{tld}) via CHANNEL_MODE.
const AUTH_HOST = PLATFORMS.LAZADA.authHost;

function hostForRegion(region) {
  return getEndpoint('LAZADA', region) || getEndpoint('LAZADA', 'SG');
}

// Lazada signing:
//   1. Sort all params alphabetically by key.
//   2. Concatenate as keyvaluekeyvalue... (no separators).
//   3. Prepend the API path.
//   4. HMAC-SHA256 with app_secret as key, output uppercase hex.
function signLazadaRequest(apiPath, params, appSecret) {
  const sorted = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .sort();
  const concat = sorted.map((k) => `${k}${params[k]}`).join('');
  const message = `${apiPath}${concat}`;
  return crypto.createHmac('sha256', appSecret).update(message).digest('hex').toUpperCase();
}

class LazadaAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
    this.region = credentials.region || 'SG';
    this.host = hostForRegion(this.region);
  }

  async _getAppCredentials() {
    const appKey    = this.creds.appKey    || (await settings.get('lazada.appKey'));
    const appSecret = this.creds.appSecret || (await settings.get('lazada.appSecret'));
    if (!appKey || !appSecret) {
      throw new Error('Lazada app not configured. Set lazada.appKey and lazada.appSecret in Admin → Settings.');
    }
    return { appKey, appSecret };
  }

  // Mint a signed request to either the auth host or the regional host.
  async _signedRequest({ host = this.host, method = 'GET', path, params = {}, body = null, useAuthToken = true }) {
    const { appKey, appSecret } = await this._getAppCredentials();
    const baseParams = {
      app_key: appKey,
      timestamp: Date.now(),
      sign_method: 'sha256',
    };
    if (useAuthToken && this.creds.accessToken) {
      baseParams.access_token = this.creds.accessToken;
    }
    const merged = { ...baseParams, ...params };
    merged.sign = signLazadaRequest(path, merged, appSecret);

    const resp = await axios({
      method,
      url: `${host}${path}`,
      params: merged,
      data: body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    if (resp.data?.code && resp.data.code !== '0') {
      const err = new Error(resp.data.message || `Lazada error ${resp.data.code}`);
      err.lazadaCode = resp.data.code;
      err.lazadaResponse = resp.data;
      throw err;
    }
    return resp.data;
  }

  async testConnection() {
    if (!this.creds.accessToken) {
      return { success: false, error: 'Not authorised yet — run the Lazada OAuth flow first.' };
    }
    try {
      const data = await this._signedRequest({ path: '/seller/get' });
      return { success: true, region: this.region, sellerId: data?.data?.seller_id, name: data?.data?.name };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async fetchOrders(sinceDate) {
    const all = [];
    let offset = 0;
    const limit = 100;
    let safety = 0;

    while (++safety < 50) {
      const params = {
        offset,
        limit,
        status: 'pending',
        sort_direction: 'DESC',
      };
      if (sinceDate) params.created_after = new Date(sinceDate).toISOString();

      const data = await this._signedRequest({ path: '/orders/get', params });
      const batch = data?.data?.orders || [];
      all.push(...batch);
      if (batch.length < limit) break;
      offset += limit;
    }

    return all.map(o => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, qty) {
    // Lazada wants an XML payload describing the SKU(s) to update.
    const xmlPayload =
      `<Request><Product><Skus>` +
      `<Sku><SellerSku>${escapeXml(sku)}</SellerSku><Quantity>${parseInt(qty, 10) || 0}</Quantity></Sku>` +
      `</Skus></Product></Request>`;
    await this._signedRequest({
      method: 'POST',
      path: '/product/price_quantity/update',
      params: { payload: xmlPayload },
    });
    return { updated: true, sku, qty };
  }

  // Exchange an authorization code for access/refresh tokens.
  async exchangeAuthCode(code) {
    const { appKey, appSecret } = await this._getAppCredentials();
    const params = {
      app_key: appKey,
      code,
      sign_method: 'sha256',
      timestamp: Date.now(),
    };
    params.sign = signLazadaRequest('/auth/token/create', params, appSecret);
    const { data } = await axios.post(`${AUTH_HOST}/auth/token/create`, null, { params });
    if (data?.code && data.code !== '0') throw new Error(data.message || `Lazada auth error ${data.code}`);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in || 0) * 1000,
      refreshExpiresAt: Date.now() + (data.refresh_expires_in || 0) * 1000,
      country: data.country,
      account: data.account,
    };
  }

  async refreshAccessToken() {
    if (!this.creds.refreshToken) throw new Error('No refresh_token stored for this Lazada channel.');
    const { appKey, appSecret } = await this._getAppCredentials();
    const params = {
      app_key: appKey,
      refresh_token: this.creds.refreshToken,
      sign_method: 'sha256',
      timestamp: Date.now(),
    };
    params.sign = signLazadaRequest('/auth/token/refresh', params, appSecret);
    const { data } = await axios.post(`${AUTH_HOST}/auth/token/refresh`, null, { params });
    if (data?.code && data.code !== '0') throw new Error(data.message || `Lazada refresh error ${data.code}`);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in || 0) * 1000,
      refreshExpiresAt: Date.now() + (data.refresh_expires_in || 0) * 1000,
    };
  }

  _transformOrder(o) {
    const ship = o.address_shipping || {};
    return makeOrderShape({
      channelOrderId: o.order_id,
      channelOrderNumber: o.order_number || o.order_id,
      customer: {
        name: `${o.customer_first_name || ''} ${o.customer_last_name || ''}`.trim() || 'Lazada Customer',
        phone: o.address_billing?.phone || ship.phone || null,
      },
      shippingAddress: {
        line1: ship.address1,
        line2: ship.address2,
        city: ship.city,
        state: ship.address3 || ship.address4,
        pincode: ship.post_code,
        country: ship.country || this.region,
      },
      items: (o.items || []).map((i) => ({
        channelSku: i.seller_sku || i.sku,
        name: i.name,
        qty: parseInt(i.quantity || 1, 10),
        unitPrice: parseFloat(i.item_price || i.paid_price || 0),
        tax: parseFloat(i.tax_amount || 0),
      })),
      total: parseFloat(o.price || 0),
      paymentMethod: o.payment_method || 'Lazada',
      paymentStatus: o.statuses?.includes('paid') ? 'PAID' : 'PENDING',
      status: 'PENDING',
      orderedAt: new Date(o.created_at || Date.now()),
    });
  }
}

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));
}

module.exports = LazadaAdapter;
module.exports.signLazadaRequest = signLazadaRequest;
module.exports.hostForRegion = hostForRegion;
