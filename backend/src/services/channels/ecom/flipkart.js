const axios = require('axios');
const settings = require('../../settings.service');
const { getEndpoint } = require('../../../config/channel-endpoints');

// Per-tenant credentials shape (set by /oauth/flipkart/callback):
//   { accessToken, refreshToken, expiresAt }
// Legacy per-tenant shape (for back-compat): { appId, appSecret }
// Global OAuth app creds come from Admin → Settings → Flipkart:
//   flipkart.appId, flipkart.appSecret
//
// Endpoint flips with CHANNEL_MODE in .env (production ↔ sandbox).

const BASE_URL = getEndpoint('FLIPKART', 'api');
const AUTH_URL = getEndpoint('FLIPKART', 'auth');

class FlipkartAdapter {
  constructor(credentials) {
    this.creds = credentials || {};
    this._accessToken = credentials?.accessToken || null;
    this._tokenExpiry = credentials?.expiresAt ? Date.parse(credentials.expiresAt) : null;
  }

  async _getAppCreds() {
    const appId     = this.creds.appId     || (await settings.get('flipkart.appId'));
    const appSecret = this.creds.appSecret || (await settings.get('flipkart.appSecret'));
    if (!appId || !appSecret) throw new Error('Flipkart app credentials not configured. Set flipkart.appId + flipkart.appSecret in Admin → Settings.');
    return { appId, appSecret };
  }

  async _getAccessToken() {
    if (this._accessToken && this._tokenExpiry && this._tokenExpiry > Date.now()) {
      return this._accessToken;
    }
    const { appId, appSecret } = await this._getAppCreds();

    // If the tenant authorised via OAuth we have a refreshToken — use it.
    // Otherwise fall back to client_credentials (legacy private-app flow).
    const grant = this.creds.refreshToken
      ? { grant_type: 'refresh_token', refresh_token: this.creds.refreshToken }
      : { grant_type: 'client_credentials', scope: 'Seller_Api' };

    const { data } = await axios.post(AUTH_URL, null, {
      params: grant,
      auth: { username: appId, password: appSecret },
    });
    this._accessToken = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this._accessToken;
  }

  async _request(method, path, data = null, params = {}) {
    const token = await this._getAccessToken();
    const resp = await axios({
      method,
      url: `${BASE_URL}${path}`,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      params,
      data,
    });
    return resp.data;
  }

  async testConnection() {
    const data = await this._request('GET', '/v3/listings');
    return { success: true, listingsCount: data.total_count };
  }

  async fetchOrders(sinceDate) {
    const params = { states: 'APPROVED,PACKING_IN_PROGRESS,PACKED,READY_TO_DISPATCH,PICKUP_COMPLETE', 'pagination_offset': 0, 'pagination_limit': 20 };
    const data = await this._request('GET', '/v3/orders', null, params);
    const orders = data.order_items || [];
    return orders.map(o => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, quantity) {
    const payload = {
      skuId: sku,
      available: { inventory_count: quantity },
    };
    await this._request('PUT', `/v3/listings/${sku}`, payload);
    return { updated: true, sku };
  }

  // Update listing — Flipkart v3 Listings API
  async updateListing(sku, fields) {
    const payload = { skuId: sku };
    if (fields.qty !== undefined) payload.available = { inventory_count: fields.qty };
    if (fields.price !== undefined) payload.price = { mrp: fields.mrp || fields.price, selling_price: fields.price };
    if (fields.title !== undefined) payload.description = { title: fields.title };
    if (fields.images !== undefined) payload.images = fields.images.map(url => ({ url }));
    const data = await this._request('PUT', `/v3/listings/${sku}`, payload);
    return { channel: 'FLIPKART', sku, response: data };
  }

  // Flipkart Ratings & Reviews — request a review for a delivered order
  async requestReview(orderItemId) {
    const data = await this._request('POST', `/v3/orders/${orderItemId}/request-review`, {});
    return { channel: 'FLIPKART', orderId: orderItemId, response: data };
  }

  _transformOrder(o) {
    return {
      channelOrderId: o.order_item_id,
      channelOrderNumber: o.order_id,
      customer: {
        name: o.buyer_address?.first_name
          ? `${o.buyer_address.first_name} ${o.buyer_address.last_name}`.trim()
          : 'Flipkart Customer',
        email: null,
        phone: o.buyer_address?.contact_number,
      },
      shippingAddress: {
        line1: o.delivery_address?.address1,
        line2: o.delivery_address?.address2,
        city: o.delivery_address?.city,
        state: o.delivery_address?.state,
        pincode: o.delivery_address?.pincode,
        country: 'India',
      },
      items: [{
        channelSku: o.sku,
        name: o.product_title,
        qty: o.quantity,
        unitPrice: parseFloat(o.selling_price?.amount || 0),
        discount: 0,
        tax: 0,
      }],
      subtotal: parseFloat(o.selling_price?.amount || 0),
      shippingCharge: 0,
      tax: 0,
      total: parseFloat(o.selling_price?.amount || 0),
      discount: 0,
      paymentMethod: 'Flipkart',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.created_on || Date.now()),
      // Flipkart fulfillment: FLIPKART (Smart Fulfillment) = CHANNEL, SELLER = SELF
      fulfillmentType: o.fulfilment_source === 'FLIPKART' ? 'CHANNEL' : 'SELF',
      fulfillmentCenter: o.warehouse_id || null,
    };
  }
}

module.exports = FlipkartAdapter;
