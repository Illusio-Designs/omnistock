const axios = require('axios');

// Tata Cliq Seller API — Tata Group premium marketplace
// Credentials: { sellerId, apiKey }
// Apply at: https://seller.tatacliq.com

const BASE = 'https://sellerapi.tatacliq.com/v1';

class TataCliqAdapter {
  constructor(credentials) {
    this.sellerId = credentials.sellerId;
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        'X-Seller-Id': credentials.sellerId,
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/seller/info');
    return { success: true, sellerId: this.sellerId, name: data.seller_name };
  }

  async fetchOrders(sinceDate) {
    const params = { status: 'CREATED', page: 1, pageSize: 50 };
    if (sinceDate) params.startDate = sinceDate;
    const all = [];
    while (true) {
      const { data } = await this.client.get('/orders', { params });
      const orders = data.orders || [];
      all.push(...orders);
      if (orders.length < params.pageSize) break;
      params.page++;
    }
    return all.map(o => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, quantity) {
    await this.client.put('/inventory', { sellerSku: sku, availableQty: quantity });
    return { updated: true, sku, quantity };
  }

  async updateListing(sku, fields) {
    const update = { sellerSku: sku };
    if (fields.qty !== undefined) update.availableQty = fields.qty;
    if (fields.price !== undefined) update.sellingPrice = fields.price;
    if (fields.mrp !== undefined) update.mrp = fields.mrp;
    if (fields.title !== undefined) update.productName = fields.title;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.images !== undefined) update.images = fields.images;
    const { data } = await this.client.put('/listings', update);
    return { channel: 'TATA_CLIQ', sku, response: data };
  }

  async requestReview(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/review-request`, {});
    return { channel: 'TATA_CLIQ', orderId, response: data };
  }

  _transformOrder(o) {
    return {
      channelOrderId: String(o.orderId),
      channelOrderNumber: o.orderNumber,
      customer: {
        name: o.customer?.name || 'Tata Cliq Customer',
        email: o.customer?.email || null,
        phone: o.customer?.phone || null,
      },
      shippingAddress: {
        line1: o.shippingAddress?.line1 || '',
        line2: o.shippingAddress?.line2 || '',
        city: o.shippingAddress?.city || '',
        state: o.shippingAddress?.state || '',
        pincode: o.shippingAddress?.pincode || '',
        country: 'India',
      },
      items: (o.items || []).map(i => ({
        channelSku: i.sellerSku,
        name: i.productName,
        qty: i.quantity,
        unitPrice: parseFloat(i.unitPrice || 0),
        discount: parseFloat(i.discount || 0),
        tax: parseFloat(i.tax || 0),
      })),
      subtotal: parseFloat(o.subtotal || 0),
      shippingCharge: parseFloat(o.shippingCharge || 0),
      tax: parseFloat(o.tax || 0),
      total: parseFloat(o.total || 0),
      discount: parseFloat(o.discount || 0),
      paymentMethod: o.paymentMethod || 'Tata Cliq',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.orderDate || Date.now()),
    };
  }
}

module.exports = TataCliqAdapter;
