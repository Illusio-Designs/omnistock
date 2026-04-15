const axios = require('axios');

// Snapdeal Seller API
// Credentials: { username, apiKey }
// Apply at: https://seller.snapdeal.com

const BASE = 'https://api.snapdeal.com/v1';

class SnapdealAdapter {
  constructor(credentials) {
    this.client = axios.create({
      baseURL: BASE,
      auth: { username: credentials.username, password: credentials.apiKey },
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/seller/profile');
    return { success: true, seller: data.username };
  }

  async fetchOrders(sinceDate) {
    const params = { status: 'PENDING', pageNo: 1, pageSize: 50 };
    if (sinceDate) params.startDate = sinceDate;
    const all = [];
    while (true) {
      const { data } = await this.client.get('/orders/getOrders', { params });
      const orders = data.orders || [];
      all.push(...orders);
      if (orders.length < params.pageSize) break;
      params.pageNo++;
    }
    return all.map(o => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, quantity) {
    await this.client.post('/inventory/update', {
      skuCode: sku,
      inventory: quantity,
    });
    return { updated: true, sku, quantity };
  }

  async updateListing(sku, fields) {
    const update = { skuCode: sku };
    if (fields.qty !== undefined) update.inventory = fields.qty;
    if (fields.price !== undefined) update.sellingPrice = fields.price;
    if (fields.mrp !== undefined) update.mrp = fields.mrp;
    if (fields.title !== undefined) update.productName = fields.title;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.images !== undefined) update.images = fields.images;
    const { data } = await this.client.post('/products/update', update);
    return { channel: 'SNAPDEAL', sku, response: data };
  }

  async requestReview(orderCode) {
    const { data } = await this.client.post('/orders/requestReview', { orderCode });
    return { channel: 'SNAPDEAL', orderId: orderCode, response: data };
  }

  _transformOrder(o) {
    return {
      channelOrderId: String(o.orderCode || o.orderId),
      channelOrderNumber: o.orderCode,
      customer: {
        name: o.addressInfo?.name || 'Snapdeal Customer',
        email: null,
        phone: o.addressInfo?.phone || null,
      },
      shippingAddress: {
        line1: o.addressInfo?.address1 || '',
        line2: o.addressInfo?.address2 || '',
        city: o.addressInfo?.city || '',
        state: o.addressInfo?.state || '',
        pincode: o.addressInfo?.pincode || '',
        country: 'India',
      },
      items: (o.orderItems || []).map(i => ({
        channelSku: i.skuCode,
        name: i.productName,
        qty: i.quantity || 1,
        unitPrice: parseFloat(i.sellingPrice || 0),
        discount: 0,
        tax: 0,
      })),
      subtotal: parseFloat(o.subtotal || 0),
      shippingCharge: parseFloat(o.shippingCharge || 0),
      tax: 0,
      total: parseFloat(o.totalAmount || 0),
      discount: 0,
      paymentMethod: o.paymentMethod || 'Snapdeal',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.orderDate || Date.now()),
    };
  }
}

module.exports = SnapdealAdapter;
