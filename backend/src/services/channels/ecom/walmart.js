const axios = require('axios');
const settings = require('../../settings.service');
const { makeOrderShape } = require('../_base');

// Walmart Marketplace adapter (US, Canada, Mexico)
//
// Auth model — Solution Provider founder-app:
//   1. Uniflo registers a Solution Provider app at https://developer.walmart.com
//      and receives clientId + clientSecret. These are stored once, platform-
//      wide, in settings.service under walmart.clientId / walmart.clientSecret.
//   2. A seller (tenant) authorises Uniflo to act on their behalf and tells us
//      their Walmart partnerId. We mint short-lived access tokens per request
//      using client_credentials + WM_PARTNER.ID = seller's partnerId.
//
// Per-tenant credentials shape (stored encrypted on the channel record):
//   { partnerId, region: 'US' | 'CA' | 'MX' }
//
// Docs:
//   https://developer.walmart.com/api/us/mp/orders
//   https://developer.walmart.com/api/us/mp/auth

const REGION_HOSTS = {
  US: 'https://marketplace.walmartapis.com',
  CA: 'https://marketplace.walmartapis.com/ca',
  MX: 'https://marketplace.walmartapis.com/mx',
};

class WalmartAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
    this.host = REGION_HOSTS[credentials.region || 'US'];
    this._accessToken = null;
    this._tokenExpiry = null;
  }

  async _getAppCredentials() {
    const clientId     = this.creds.clientId     || (await settings.get('walmart.clientId'));
    const clientSecret = this.creds.clientSecret || (await settings.get('walmart.clientSecret'));
    if (!clientId || !clientSecret) {
      throw new Error('Walmart Solution Provider app not configured. Set walmart.clientId and walmart.clientSecret in Admin → Settings.');
    }
    return { clientId, clientSecret };
  }

  async _getAccessToken() {
    if (this._accessToken && this._tokenExpiry > Date.now()) return this._accessToken;
    const { clientId, clientSecret } = await this._getAppCredentials();
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const { data } = await axios.post(
      `${this.host}/v3/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
          'WM_SVC.NAME': 'Walmart Marketplace',
          'WM_QOS.CORRELATION_ID': Date.now().toString(),
          ...(this.creds.partnerId ? { 'WM_PARTNER.ID': this.creds.partnerId } : {}),
        },
      }
    );
    this._accessToken = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this._accessToken;
  }

  async _request(method, path, params = {}, body = null) {
    const token = await this._getAccessToken();
    const resp = await axios({
      method,
      url: `${this.host}/v3${path}`,
      headers: {
        'WM_SEC.ACCESS_TOKEN': token,
        'WM_SVC.NAME': 'Walmart Marketplace',
        'WM_QOS.CORRELATION_ID': Date.now().toString(),
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(this.creds.partnerId ? { 'WM_PARTNER.ID': this.creds.partnerId } : {}),
      },
      params,
      data: body,
    });
    return resp.data;
  }

  async testConnection() {
    if (!this.creds.partnerId) {
      return { success: false, error: 'Missing partnerId. Enter your Walmart Marketplace partner ID.' };
    }
    try {
      const data = await this._request('GET', '/orders', { limit: 1 });
      return {
        success: true,
        region: this.creds.region || 'US',
        totalOrders: data?.list?.meta?.totalCount ?? 0,
      };
    } catch (err) {
      return { success: false, error: err.response?.data?.error?.[0]?.description || err.message };
    }
  }

  async fetchOrders(sinceDate) {
    const params = { limit: 100, status: 'Created' };
    if (sinceDate) params.createdStartDate = new Date(sinceDate).toISOString();

    const all = [];
    let nextCursor = null;
    let safety = 0;
    do {
      const reqParams = nextCursor ? { ...params, nextCursor } : params;
      const data = await this._request('GET', '/orders', reqParams);
      const batch = data?.list?.elements?.order || [];
      all.push(...batch);
      nextCursor = data?.list?.meta?.nextCursor || null;
      if (!nextCursor || batch.length === 0) break;
    } while (++safety < 50);

    return all.map(o => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, quantity) {
    await this._request('PUT', '/inventory', { sku }, {
      sku,
      quantity: { unit: 'EACH', amount: quantity },
    });
    return { updated: true, sku, quantity };
  }

  async updateListing(sku, fields) {
    const payload = { sku };
    if (fields.qty !== undefined) {
      await this.updateInventoryLevel(sku, fields.qty);
    }
    if (fields.price !== undefined) {
      await this._request('PUT', '/price', null, {
        sku,
        pricing: [{
          currentPriceType: 'BASE',
          currentPrice: { currency: 'USD', amount: fields.price },
        }],
      });
    }
    return { channel: 'WALMART', sku, response: payload };
  }

  _transformOrder(o) {
    const ship = o.shippingInfo?.postalAddress || {};
    return makeOrderShape({
      channelOrderId: o.purchaseOrderId,
      channelOrderNumber: o.customerOrderId || o.purchaseOrderId,
      customer: {
        name: ship.name || 'Walmart Customer',
        email: o.customerEmailId || null,
        phone: o.shippingInfo?.phone || null,
      },
      shippingAddress: {
        line1: ship.address1,
        line2: ship.address2,
        city: ship.city,
        state: ship.state,
        pincode: ship.postalCode,
        country: ship.country || (this.creds.region === 'CA' ? 'CA' : this.creds.region === 'MX' ? 'MX' : 'US'),
      },
      items: (o.orderLines?.orderLine || []).map(line => ({
        channelSku: line.item?.sku,
        name: line.item?.productName,
        qty: parseInt(line.orderLineQuantity?.amount || 1, 10),
        unitPrice: parseFloat(line.charges?.charge?.[0]?.chargeAmount?.amount || 0),
        tax: parseFloat(line.charges?.charge?.[0]?.tax?.taxAmount?.amount || 0),
      })),
      total: parseFloat(o.orderTotal?.amount || 0),
      paymentMethod: 'Walmart',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.orderDate || Date.now()),
    });
  }
}

module.exports = WalmartAdapter;
