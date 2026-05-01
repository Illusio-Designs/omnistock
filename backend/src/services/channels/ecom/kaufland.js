const axios = require('axios');
const crypto = require('crypto');
const { makeOrderShape } = require('../_base');

// Kaufland Global Marketplace adapter — German general merchandise marketplace
// (with storefronts in DE, AT, SK, CZ, PL, HR).
//
// Auth model — per-merchant credentials with HMAC signing (no founder app):
//   Each merchant registers in Kaufland Seller Center → API Access and is
//   issued a client_key + secret_key. Every request must be HMAC-SHA256
//   signed with the secret_key. The secret_key MUST NOT be sent as a header
//   — only the signature, timestamp, and client_key go on the wire.
//
// Per-tenant credentials shape (encrypted on the channel row):
//   { clientKey, secretKey, storefront: 'de'|'at'|'sk'|'cz'|'pl'|'hr' }
//
// Docs:
//   https://docs.kaufland.com/

const HOST = 'https://sellerapi.kaufland.com/v2';

const STOREFRONT_NAMES = {
  de: 'Germany',
  at: 'Austria',
  sk: 'Slovakia',
  cz: 'Czech Republic',
  pl: 'Poland',
  hr: 'Croatia',
};

// Kaufland sign string: METHOD\nURI\nBODY\nTIMESTAMP
//   - METHOD: uppercase HTTP method
//   - URI:    full URL including query string
//   - BODY:   raw request body (empty string for GET)
//   - TIMESTAMP: unix seconds
// Output: lowercase hex HMAC-SHA256 of (signString) using secret_key.
function signKauflandRequest(method, fullUrl, body, timestamp, secretKey) {
  const toSign = `${method.toUpperCase()}\n${fullUrl}\n${body || ''}\n${timestamp}`;
  return crypto.createHmac('sha256', secretKey).update(toSign).digest('hex');
}

class KauflandAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
    this.storefront = (credentials.storefront || 'de').toLowerCase();
  }

  _buildUrl(path, params = {}) {
    const url = new URL(`${HOST}${path}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.append(k, String(v));
    }
    return url.toString();
  }

  async _request(method, path, params = {}, body = null) {
    if (!this.creds.clientKey || !this.creds.secretKey) {
      throw new Error('Kaufland credentials missing — paste clientKey + secretKey from Seller Center.');
    }
    const fullUrl = this._buildUrl(path, params);
    const bodyStr = body ? JSON.stringify(body) : '';
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signKauflandRequest(method, fullUrl, bodyStr, timestamp, this.creds.secretKey);

    const resp = await axios({
      method,
      url: fullUrl,
      headers: {
        'Shop-Client-Key': this.creds.clientKey,
        'Shop-Timestamp':  String(timestamp),
        'Shop-Signature':  signature,
        'Content-Type':    'application/json',
        Accept:            'application/json',
      },
      data: bodyStr || undefined,
    });
    return resp.data;
  }

  async testConnection() {
    if (!this.creds.clientKey || !this.creds.secretKey) {
      return { success: false, error: 'Missing clientKey or secretKey.' };
    }
    try {
      // Lightweight auth probe: fetch a single order, scoped to the storefront.
      await this._request('GET', '/orders', { storefront: this.storefront, limit: 1 });
      return { success: true, storefront: this.storefront };
    } catch (err) {
      return {
        success: false,
        error: err.response?.status === 401
          ? 'Invalid Kaufland clientKey or secretKey, or signature mismatch.'
          : (err.response?.data?.message || err.message),
      };
    }
  }

  async fetchOrders(sinceDate) {
    const all = [];
    let offset = 0;
    const limit = 100;
    let safety = 0;

    while (++safety < 50) {
      const params = {
        storefront: this.storefront,
        limit,
        offset,
      };
      if (sinceDate) params.ts_from = Math.floor(new Date(sinceDate).getTime() / 1000);

      const data = await this._request('GET', '/orders', params);
      const batch = data?.data || data?.orders || [];
      all.push(...batch);
      if (batch.length < limit) break;
      offset += limit;
    }

    return all.map((o) => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, qty) {
    // Kaufland inventory is keyed by EAN (the SKU you uploaded). The /units
    // endpoint patches stock for a unit you own.
    await this._request('PATCH', '/units', {}, {
      ean: sku,
      amount: parseInt(qty, 10) || 0,
      condition: 'new',
      storefront: this.storefront,
    });
    return { updated: true, sku, qty };
  }

  async updateListing(sku, fields) {
    const body = { ean: sku, storefront: this.storefront };
    if (fields.qty   !== undefined) body.amount       = parseInt(fields.qty, 10) || 0;
    if (fields.price !== undefined) body.price        = parseFloat(fields.price);
    if (fields.title !== undefined) body.title_native = fields.title;
    const data = await this._request('PATCH', '/units', {}, body);
    return { channel: 'KAUFLAND', sku, response: data };
  }

  _transformOrder(o) {
    const ship = o.delivery_address || o.shipping_address || {};
    return makeOrderShape({
      channelOrderId: o.id_order,
      channelOrderNumber: o.id_order,
      customer: {
        name: `${ship.first_name || ''} ${ship.last_name || ''}`.trim() || 'Kaufland Customer',
        email: o.email_buyer || null,
        phone: ship.phone || null,
      },
      shippingAddress: {
        line1: ship.street,
        line2: ship.address_addition,
        city: ship.city,
        state: ship.state || null,
        pincode: ship.postcode,
        country: ship.country || this.storefront.toUpperCase(),
      },
      items: (o.order_units || o.units || []).map((u) => ({
        channelSku: u.ean || u.id_offer,
        name: u.title || u.product_title,
        qty: parseInt(u.amount || u.quantity || 1, 10),
        unitPrice: parseFloat(u.price || u.unit_price || 0),
      })),
      total: parseFloat(o.payment?.amount || o.total_amount || 0),
      paymentMethod: o.payment?.type || 'Kaufland',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date((o.ts_created || 0) * 1000 || Date.now()),
    });
  }
}

module.exports = KauflandAdapter;
module.exports.HOST = HOST;
module.exports.STOREFRONT_NAMES = STOREFRONT_NAMES;
module.exports.signKauflandRequest = signKauflandRequest;
