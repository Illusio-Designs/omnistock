const axios = require('axios');

// Paytm Mall Seller API
// Credentials: { sellerId, apiKey }
// Apply at: https://seller.paytmmall.com

const BASE = 'https://sellerapi.paytmmall.com/v1';

class PaytmMallAdapter {
  constructor(credentials) {
    this.sellerId = credentials.sellerId;
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        'X-Seller-Id': credentials.sellerId,
        'X-Api-Key': credentials.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/seller/profile');
    return { success: true, sellerId: this.sellerId, name: data.seller_name };
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
    await this.client.post('/inventory/update', { sku, quantity });
    return { updated: true, sku, quantity };
  }

  async updateListing(sku, fields) {
    const update = { sku };
    if (fields.qty !== undefined) update.quantity = fields.qty;
    if (fields.price !== undefined) update.selling_price = fields.price;
    if (fields.mrp !== undefined) update.mrp = fields.mrp;
    if (fields.title !== undefined) update.name = fields.title;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.images !== undefined) update.images = fields.images;
    const { data } = await this.client.put('/listings', update);
    return { channel: 'PAYTM_MALL', sku, response: data };
  }

  async requestReview(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/request-review`, {});
    return { channel: 'PAYTM_MALL', orderId, response: data };
  }

  _transformOrder(o) {
    return {
      channelOrderId: String(o.order_id),
      channelOrderNumber: o.order_number,
      customer: {
        name: o.customer?.name || 'Paytm Mall Customer',
        email: o.customer?.email || null,
        phone: o.customer?.phone || null,
      },
      shippingAddress: {
        line1: o.shipping_address?.line1 || '',
        line2: o.shipping_address?.line2 || '',
        city: o.shipping_address?.city || '',
        state: o.shipping_address?.state || '',
        pincode: o.shipping_address?.pincode || '',
        country: 'India',
      },
      items: (o.items || []).map(i => ({
        channelSku: i.sku,
        name: i.name,
        qty: i.quantity,
        unitPrice: parseFloat(i.unit_price || 0),
        discount: parseFloat(i.discount || 0),
        tax: parseFloat(i.tax || 0),
      })),
      subtotal: parseFloat(o.subtotal || 0),
      shippingCharge: parseFloat(o.shipping || 0),
      tax: parseFloat(o.tax || 0),
      total: parseFloat(o.total || 0),
      discount: parseFloat(o.discount || 0),
      paymentMethod: 'Paytm',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.order_date || Date.now()),
    };
  }
}

module.exports = PaytmMallAdapter;
