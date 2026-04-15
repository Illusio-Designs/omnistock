const axios = require('axios');

// LimeRoad Seller API — Fashion & lifestyle marketplace
// Credentials: { apiKey }
// Apply at: https://www.limeroad.com/seller

const BASE = 'https://sellerapi.limeroad.com/v1';

class LimeRoadAdapter {
  constructor(credentials) {
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/seller/info');
    return { success: true, seller: data.name };
  }

  async fetchOrders(sinceDate) {
    const params = { status: 'pending', page: 1, limit: 50 };
    if (sinceDate) params.from = sinceDate;
    const all = [];
    while (true) {
      const { data } = await this.client.get('/orders', { params });
      const orders = data.orders || [];
      all.push(...orders);
      if (orders.length < params.limit) break;
      params.page++;
    }
    return all.map(o => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, quantity) {
    await this.client.put('/inventory', { sku, quantity });
    return { updated: true, sku, quantity };
  }

  async updateListing(sku, fields) {
    const update = { sku };
    if (fields.qty !== undefined) update.quantity = fields.qty;
    if (fields.price !== undefined) update.price = fields.price;
    if (fields.mrp !== undefined) update.mrp = fields.mrp;
    if (fields.title !== undefined) update.name = fields.title;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.images !== undefined) update.images = fields.images;
    const { data } = await this.client.put('/listings', update);
    return { channel: 'LIMEROAD', sku, response: data };
  }

  async requestReview(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/review-request`, {});
    return { channel: 'LIMEROAD', orderId, response: data };
  }

  _transformOrder(o) {
    return {
      channelOrderId: String(o.order_id),
      channelOrderNumber: o.order_number,
      customer: {
        name: o.customer_name || 'LimeRoad Customer',
        email: null,
        phone: o.customer_phone || null,
      },
      shippingAddress: {
        line1: o.shipping?.line1 || '',
        line2: o.shipping?.line2 || '',
        city: o.shipping?.city || '',
        state: o.shipping?.state || '',
        pincode: o.shipping?.pincode || '',
        country: 'India',
      },
      items: (o.items || []).map(i => ({
        channelSku: i.sku,
        name: i.name,
        qty: i.qty,
        unitPrice: parseFloat(i.price || 0),
        discount: 0,
        tax: 0,
      })),
      subtotal: parseFloat(o.subtotal || 0),
      shippingCharge: 0,
      tax: 0,
      total: parseFloat(o.total || 0),
      discount: 0,
      paymentMethod: 'LimeRoad',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.order_date || Date.now()),
    };
  }
}

module.exports = LimeRoadAdapter;
