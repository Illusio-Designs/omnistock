const axios = require('axios');

// OpenCart REST API (via standard REST API extension)
// Credentials: { storeUrl, username, apiKey }

class OpenCartAdapter {
  constructor(credentials) {
    this.client = axios.create({
      baseURL: `${credentials.storeUrl.replace(/\/$/, '')}/api`,
      auth: { username: credentials.username, password: credentials.apiKey },
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/store/info');
    return { success: true, storeName: data.name };
  }

  async fetchOrders(sinceDate) {
    const params = { status: 'pending', limit: 50, page: 1 };
    if (sinceDate) params.date_from = sinceDate;
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

  async updateListing(sku, fields) {
    const update = { sku };
    if (fields.qty !== undefined) update.quantity = fields.qty;
    if (fields.price !== undefined) update.price = fields.price;
    if (fields.title !== undefined) update.name = fields.title;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.images !== undefined) update.images = fields.images;
    const { data } = await this.client.put('/products', update);
    return { channel: 'OPENCART', sku, response: data };
  }

  async updateInventoryLevel(sku, quantity) {
    await this.client.put('/products/stock', { sku, quantity });
    return { updated: true, sku, quantity };
  }

  _transformOrder(o) {
    return {
      channelOrderId: String(o.order_id),
      channelOrderNumber: o.order_id,
      customer: {
        name: `${o.firstname || ''} ${o.lastname || ''}`.trim(),
        email: o.email || null,
        phone: o.telephone || null,
      },
      shippingAddress: {
        line1: o.shipping_address_1 || '',
        line2: o.shipping_address_2 || '',
        city: o.shipping_city || '',
        state: o.shipping_zone || '',
        pincode: o.shipping_postcode || '',
        country: o.shipping_country || '',
      },
      items: (o.products || []).map(i => ({
        channelSku: i.sku || i.model,
        name: i.name,
        qty: i.quantity,
        unitPrice: parseFloat(i.price || 0),
        discount: 0,
        tax: parseFloat(i.tax || 0),
      })),
      subtotal: parseFloat(o.sub_total || 0),
      shippingCharge: parseFloat(o.shipping || 0),
      tax: parseFloat(o.tax || 0),
      total: parseFloat(o.total || 0),
      discount: 0,
      paymentMethod: o.payment_method || 'OpenCart',
      paymentStatus: 'PENDING',
      status: 'PENDING',
      orderedAt: new Date(o.date_added || Date.now()),
    };
  }
}

module.exports = OpenCartAdapter;
