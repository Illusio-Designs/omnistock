const axios = require('axios');

// Swiggy Instamart — 10-30 minute grocery delivery
// Credentials: { clientId, clientSecret, sellerId }
// Apply at: https://partner.swiggy.com (Swiggy Partner Hub)
// Uses OAuth 2.0 client credentials flow.

const AUTH_URL = 'https://partner.swiggy.com/oauth/token';
const BASE     = 'https://partner-api.swiggy.com/instamart/v1';

class SwiggyInstamartAdapter {
  constructor(credentials) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    this.sellerId = credentials.sellerId;
    this._token = null;
    this._tokenExpiry = null;
  }

  async _getToken() {
    if (this._token && this._tokenExpiry > Date.now()) return this._token;
    const { data } = await axios.post(AUTH_URL, {
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      scope: 'seller:read seller:write',
    });
    this._token = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this._token;
  }

  async _req(method, path, payload = null, params = {}) {
    const token = await this._getToken();
    const { data } = await axios({
      method,
      url: `${BASE}${path}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Seller-Id': this.sellerId,
        'Content-Type': 'application/json',
      },
      params,
      data: payload,
    });
    return data;
  }

  async testConnection() {
    const data = await this._req('GET', '/seller/profile');
    return {
      success: true,
      sellerId: this.sellerId,
      sellerName: data.seller_name || data.name,
      storeCoverage: data.store_coverage,
    };
  }

  async fetchOrders(sinceDate) {
    const params = { status: 'PENDING', page: 1, size: 50 };
    if (sinceDate) params.from = sinceDate;

    const allOrders = [];
    while (true) {
      const data = await this._req('GET', '/orders', null, params);
      const orders = data.orders || data.content || [];
      allOrders.push(...orders);
      if (orders.length < params.size || data.last) break;
      params.page++;
    }

    return allOrders.map(o => this._transformOrder(o));
  }

  // Update stock for a product across Instamart stores
  async updateInventoryLevel(sku, quantity) {
    await this._req('POST', '/inventory/update', {
      items: [{ seller_sku: sku, available_qty: quantity }],
    });
    return { updated: true, sku, quantity };
  }

  // Bulk update
  async bulkUpdateInventory(items) {
    const data = await this._req('POST', '/inventory/bulk-update', {
      items: items.map(i => ({ seller_sku: i.sku, available_qty: i.quantity })),
    });
    return data;
  }

  // Get current Instamart store-level stock
  async getStoreInventory() {
    const data = await this._req('GET', '/inventory/summary');
    return data.stores || data;
  }

  // Accept order (must respond within Swiggy SLA — usually 2 min)
  async acceptOrder(orderId) {
    const data = await this._req('POST', `/orders/${orderId}/accept`);
    return data;
  }

  // Mark order as packed and hand it to Swiggy rider
  async markDispatched(orderId) {
    const data = await this._req('POST', `/orders/${orderId}/dispatch`);
    return data;
  }

  // Reject / cancel an order with reason
  async rejectOrder(orderId, reason) {
    const data = await this._req('POST', `/orders/${orderId}/reject`, { reason });
    return data;
  }

  async updateListing(sku, fields) {
    const update = { seller_sku: sku };
    if (fields.qty !== undefined) update.available_qty = fields.qty;
    if (fields.price !== undefined) update.selling_price = fields.price;
    if (fields.mrp !== undefined) update.mrp = fields.mrp;
    if (fields.title !== undefined) update.item_name = fields.title;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.images !== undefined) update.images = fields.images;
    const data = await this._req('PUT', '/catalog/update', update);
    return { channel: 'SWIGGY_INSTAMART', sku, response: data };
  }

  async requestReview(orderId) {
    const data = await this._req('POST', `/orders/${orderId}/request-review`, {});
    return { channel: 'SWIGGY_INSTAMART', orderId, response: data };
  }

  _transformOrder(o) {
    const statusMap = {
      PENDING: 'PENDING',
      ACCEPTED: 'CONFIRMED',
      PACKED: 'PROCESSING',
      DISPATCHED: 'SHIPPED',
      DELIVERED: 'DELIVERED',
      CANCELLED: 'CANCELLED',
    };
    return {
      channelOrderId: String(o.order_id || o.id),
      channelOrderNumber: o.display_id || o.order_id,
      customer: {
        name: o.customer_name || o.customer?.name || 'Swiggy Customer',
        email: null,
        phone: o.customer_phone || o.customer?.phone || null,
      },
      shippingAddress: {
        line1: o.delivery_address?.address || o.delivery_address?.line1 || '',
        line2: '',
        city: o.delivery_address?.city || '',
        state: o.delivery_address?.state || '',
        pincode: o.delivery_address?.pincode || '',
        country: 'India',
      },
      items: (o.order_items || o.items || []).map(i => ({
        channelSku: i.seller_sku || i.sku || i.item_id,
        name: i.item_name || i.name,
        qty: i.quantity,
        unitPrice: parseFloat(i.effective_price || i.unit_price || 0),
        discount: parseFloat(i.discount || 0),
        tax: 0,
      })),
      subtotal: parseFloat(o.order_total || o.sub_total || 0),
      shippingCharge: 0,
      tax: parseFloat(o.taxes || 0),
      total: parseFloat(o.bill_total || o.order_total || 0),
      discount: parseFloat(o.total_discount || 0),
      paymentMethod: o.payment_method || 'Swiggy',
      paymentStatus: 'PAID',
      status: statusMap[o.status] || 'PENDING',
      orderedAt: new Date(o.order_time || o.created_at || Date.now()),
    };
  }
}

module.exports = SwiggyInstamartAdapter;
