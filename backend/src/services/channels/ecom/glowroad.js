const axios = require('axios');

// GlowRoad Supplier API — Amazon-owned reseller marketplace
// Credentials: { apiKey }
// Apply at: https://supplier.glowroad.com

const BASE = 'https://supplier.glowroad.com/api/v1';

class GlowRoadAdapter {
  constructor(credentials) {
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        'X-Api-Key': credentials.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/supplier/profile');
    return { success: true, supplierName: data.name };
  }

  async fetchOrders(sinceDate) {
    const params = { status: 'PENDING', page: 1, size: 50 };
    if (sinceDate) params.from = sinceDate;
    const all = [];
    while (true) {
      const { data } = await this.client.get('/orders', { params });
      const orders = data.orders || [];
      all.push(...orders);
      if (orders.length < params.size) break;
      params.page++;
    }
    return all.map(o => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, quantity) {
    await this.client.post('/inventory/update', { sku, quantity });
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
    return { channel: 'GLOWROAD', sku, response: data };
  }

  async requestReview(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/request-review`, {});
    return { channel: 'GLOWROAD', orderId, response: data };
  }

  _transformOrder(o) {
    return {
      channelOrderId: String(o.order_id),
      channelOrderNumber: o.order_number,
      customer: {
        name: o.customer_name || 'GlowRoad Customer',
        email: null,
        phone: o.customer_phone || null,
      },
      shippingAddress: {
        line1: o.address?.line1 || '',
        line2: o.address?.line2 || '',
        city: o.address?.city || '',
        state: o.address?.state || '',
        pincode: o.address?.pincode || '',
        country: 'India',
      },
      items: (o.items || []).map(i => ({
        channelSku: i.sku,
        name: i.name,
        qty: i.quantity,
        unitPrice: parseFloat(i.price || 0),
        discount: 0,
        tax: 0,
      })),
      subtotal: parseFloat(o.subtotal || 0),
      shippingCharge: 0,
      tax: 0,
      total: parseFloat(o.total || 0),
      discount: 0,
      paymentMethod: 'GlowRoad',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.created_at || Date.now()),
    };
  }
}

module.exports = GlowRoadAdapter;
