const axios = require('axios');

// Ajio Seller API — Reliance fashion & lifestyle marketplace
// Credentials: { supplierId, apiKey }
// Apply at: https://www.ajio.com/seller (Reliance Retail onboarding)

const BASE = 'https://sellerapi.ajio.com/v1';

class AjioAdapter {
  constructor(credentials) {
    this.supplierId = credentials.supplierId;
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        'X-Supplier-Id': credentials.supplierId,
        'X-Api-Key': credentials.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/supplier/profile');
    return { success: true, supplierId: this.supplierId, name: data.name };
  }

  async fetchOrders(sinceDate) {
    const params = { status: 'NEW', page: 1, size: 50 };
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
    await this.client.post('/inventory', { ean: sku, quantity });
    return { updated: true, sku, quantity };
  }

  async confirmOrder(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/confirm`);
    return data;
  }

  async updateListing(sku, fields) {
    const update = { ean: sku };
    if (fields.qty !== undefined) update.quantity = fields.qty;
    if (fields.price !== undefined) update.selling_price = fields.price;
    if (fields.mrp !== undefined) update.mrp = fields.mrp;
    if (fields.title !== undefined) update.product_name = fields.title;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.images !== undefined) update.images = fields.images;
    const { data } = await this.client.put('/listings', update);
    return { channel: 'AJIO', sku, response: data };
  }

  async requestReview(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/review-request`, {});
    return { channel: 'AJIO', orderId, response: data };
  }

  _transformOrder(o) {
    return {
      channelOrderId: String(o.order_id),
      channelOrderNumber: o.order_number,
      customer: {
        name: o.customer_name || 'Ajio Customer',
        email: null,
        phone: o.customer_phone || null,
      },
      shippingAddress: {
        line1: o.shipping?.address1 || '',
        line2: o.shipping?.address2 || '',
        city: o.shipping?.city || '',
        state: o.shipping?.state || '',
        pincode: o.shipping?.pincode || '',
        country: 'India',
      },
      items: (o.line_items || []).map(i => ({
        channelSku: i.supplier_sku || i.ean,
        name: i.product_name,
        qty: i.quantity,
        unitPrice: parseFloat(i.unit_price || 0),
        discount: parseFloat(i.discount || 0),
        tax: parseFloat(i.tax || 0),
      })),
      subtotal: parseFloat(o.subtotal || 0),
      shippingCharge: 0,
      tax: parseFloat(o.tax || 0),
      total: parseFloat(o.total || 0),
      discount: parseFloat(o.discount || 0),
      paymentMethod: o.payment_mode || 'Ajio',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.order_date || Date.now()),
    };
  }
}

module.exports = AjioAdapter;
