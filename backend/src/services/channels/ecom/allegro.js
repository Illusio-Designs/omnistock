const axios = require('axios');
const settings = require('../../settings.service');
const { makeOrderShape } = require('../_base');

// Allegro adapter — Poland's leading marketplace.
//
// Auth model — founder-app OAuth 2.0 (Authorization Code Grant):
//   1. Uniflo registers one Allegro app at https://apps.developer.allegro.pl
//      and stores client_id + client_secret + redirectUri in settings.service:
//      allegro.clientId / allegro.clientSecret / allegro.redirectUri.
//   2. Seller (tenant) clicks Authorize → consent on allegro.pl/auth/oauth →
//      Allegro redirects back with `code`. We exchange via /auth/oauth/token
//      (Basic auth with client_id:client_secret) for a 12h access_token +
//      sliding 12h refresh_token.
//   3. Per-request: bearer access_token, Allegro vendor media-type headers.
//   4. Auto-refresh on token expiry.
//
// Per-tenant credentials shape (encrypted on the channel row):
//   { accessToken, refreshToken, expiresAt?, sandbox? }
//
// Docs:
//   https://developer.allegro.pl/auth/                  (Authentication)
//   https://developer.allegro.pl/documentation         (REST API)

const PROD_API_HOST  = 'https://api.allegro.pl';
const PROD_AUTH_HOST = 'https://allegro.pl';

// Allegro provides a sandbox at *.allegrosandbox.pl. Honour creds.sandbox so a
// founder can test with sandbox credentials without changing files.
const SANDBOX_API_HOST  = 'https://api.allegro.pl.allegrosandbox.pl';
const SANDBOX_AUTH_HOST = 'https://allegro.pl.allegrosandbox.pl';

const VENDOR_TYPE = 'application/vnd.allegro.public.v1+json';

class AllegroAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
    this.sandbox = !!credentials.sandbox;
    this.apiHost  = this.sandbox ? SANDBOX_API_HOST  : PROD_API_HOST;
    this.authHost = this.sandbox ? SANDBOX_AUTH_HOST : PROD_AUTH_HOST;
  }

  async _getAppCredentials() {
    const clientId     = this.creds.clientId     || (await settings.get('allegro.clientId'));
    const clientSecret = this.creds.clientSecret || (await settings.get('allegro.clientSecret'));
    if (!clientId || !clientSecret) {
      throw new Error('Allegro app not configured. Set allegro.clientId and allegro.clientSecret in Admin → Settings.');
    }
    return { clientId, clientSecret };
  }

  async _ensureAccessToken() {
    if (!this.creds.accessToken) throw new Error('Not authorised — run the Allegro OAuth flow first.');
    if (this.creds.expiresAt && Date.now() < this.creds.expiresAt - 60_000) return this.creds.accessToken;
    const fresh = await this.refreshAccessToken();
    return fresh.accessToken;
  }

  async _request(method, path, params = {}, body = null) {
    const token = await this._ensureAccessToken();
    const resp = await axios({
      method,
      url: `${this.apiHost}${path}`,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: VENDOR_TYPE,
        'Content-Type': VENDOR_TYPE,
      },
      params,
      data: body,
    });
    return resp.data;
  }

  async testConnection() {
    if (!this.creds.accessToken) {
      return { success: false, error: 'Not authorised yet — run the Allegro OAuth flow first.' };
    }
    try {
      const data = await this._request('GET', '/me');
      return {
        success: true,
        sandbox: this.sandbox,
        userId: data?.id,
        login: data?.login,
        company: data?.company?.name || null,
      };
    } catch (err) {
      return { success: false, error: err.response?.data?.errors?.[0]?.message || err.message };
    }
  }

  async fetchOrders(sinceDate) {
    const all = [];
    let offset = 0;
    const limit = 100;
    let safety = 0;

    while (++safety < 50) {
      const params = {
        limit,
        offset,
        status: 'READY_FOR_PROCESSING',
        'fulfillment.status': 'NEW',
      };
      if (sinceDate) params['updatedAt.gte'] = new Date(sinceDate).toISOString();

      const data = await this._request('GET', '/order/checkout-forms', params);
      const batch = data?.checkoutForms || [];
      all.push(...batch);
      const totalCount = data?.totalCount ?? batch.length;
      if (batch.length < limit || offset + batch.length >= totalCount) break;
      offset += limit;
    }

    return all.map((o) => this._transformOrder(o));
  }

  // Allegro inventory updates are tied to "offers" (item listings), not raw
  // SKUs. The PATCH /sale/product-offers endpoint takes a query filter; we
  // expect the seller's SKU to already match the offer's external.id, or for
  // creds.skuMap to provide an internal SKU → offerId override.
  async updateInventoryLevel(sku, qty) {
    const offerId = (this.creds.skuMap && this.creds.skuMap[sku]) || null;
    if (offerId) {
      await this._request('PATCH', `/sale/product-offers/${encodeURIComponent(offerId)}`, {}, {
        stock: { available: parseInt(qty, 10) || 0 },
      });
    } else {
      // Filter by external SKU. Allegro accepts the externalId on the offer
      // when the seller pushed it via /sale/offer-publication-commands.
      await this._request('PATCH', `/sale/product-offers`, { 'external.id': sku }, {
        stock: { available: parseInt(qty, 10) || 0 },
      });
    }
    return { updated: true, sku, qty };
  }

  async exchangeAuthCode(code, redirectUri) {
    const { clientId, clientSecret } = await this._getAppCredentials();
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const { data } = await axios.post(
      `${this.authHost}/auth/oauth/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      }
    );
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in || 43200) * 1000,
    };
  }

  async refreshAccessToken() {
    if (!this.creds.refreshToken) throw new Error('No refresh_token stored for this Allegro channel.');
    const { clientId, clientSecret } = await this._getAppCredentials();
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const { data } = await axios.post(
      `${this.authHost}/auth/oauth/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.creds.refreshToken,
      }).toString(),
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
      }
    );
    this.creds.accessToken  = data.access_token;
    this.creds.refreshToken = data.refresh_token || this.creds.refreshToken;
    this.creds.expiresAt    = Date.now() + (data.expires_in || 43200) * 1000;
    return {
      accessToken: this.creds.accessToken,
      refreshToken: this.creds.refreshToken,
      expiresAt: this.creds.expiresAt,
    };
  }

  _transformOrder(o) {
    const buyer = o.buyer || {};
    const ship = o.delivery?.address || {};
    return makeOrderShape({
      channelOrderId: o.id,
      channelOrderNumber: o.id,
      customer: {
        name: `${buyer.firstName || ''} ${buyer.lastName || ''}`.trim() || buyer.login || 'Allegro Customer',
        email: buyer.email || null,
        phone: buyer.phoneNumber || null,
      },
      shippingAddress: {
        line1: ship.street,
        city: ship.city,
        state: null,
        pincode: ship.zipCode,
        country: ship.countryCode || 'PL',
      },
      items: (o.lineItems || []).map((it) => ({
        channelSku: it.offer?.external?.id || it.offer?.id,
        name: it.offer?.name,
        qty: parseInt(it.quantity || 1, 10),
        unitPrice: parseFloat(it.price?.amount || 0),
      })),
      total: parseFloat(o.summary?.totalToPay?.amount || 0),
      paymentMethod: o.payment?.type || 'Allegro',
      paymentStatus: o.payment?.finishedAt ? 'PAID' : 'PENDING',
      status: 'PENDING',
      orderedAt: new Date(o.updatedAt || o.boughtAt || Date.now()),
    });
  }
}

module.exports = AllegroAdapter;
module.exports.PROD_AUTH_HOST    = PROD_AUTH_HOST;
module.exports.SANDBOX_AUTH_HOST = SANDBOX_AUTH_HOST;
