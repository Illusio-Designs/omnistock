const axios = require('axios');

// Credentials shape: { appId: "xxx", appSecret: "xxx" }
// Requires Flipkart Seller API access: https://seller.flipkart.com/api-docs/
// Access is granted only to approved Flipkart sellers.

const BASE_URL = 'https://api.flipkart.net/sellers';

class FlipkartAdapter {
  constructor(credentials) {
    this.appId = credentials.appId;
    this.appSecret = credentials.appSecret;
    this._accessToken = null;
    this._tokenExpiry = null;
  }

  async _getAccessToken() {
    if (this._accessToken && this._tokenExpiry > Date.now()) {
      return this._accessToken;
    }
    const { data } = await axios.post('https://api.flipkart.net/oauth-service/oauth/token', null, {
      params: { grant_type: 'client_credentials', scope: 'Seller_Api' },
      auth: { username: this.appId, password: this.appSecret },
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
    };
  }
}

module.exports = FlipkartAdapter;
