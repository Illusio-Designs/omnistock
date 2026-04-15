const axios = require('axios');

// Nykaa Seller API — beauty & lifestyle marketplace
// Credentials: { sellerId, apiKey }
// Apply at: https://seller.nykaa.com (requires brand approval)

const BASE = 'https://sellerapi.nykaa.com/v1';

class NykaaAdapter {
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
    return { success: true, sellerId: this.sellerId, sellerName: data.seller_name };
  }

  async fetchOrders(sinceDate) {
    const params = { status: 'PENDING', page: 1, limit: 50 };
    if (sinceDate) params.from_date = sinceDate;

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
    await this.client.post('/inventory/update', {
      seller_sku: sku,
      stock: quantity,
    });
    return { updated: true, sku, quantity };
  }

  async confirmOrder(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/accept`);
    return data;
  }

  async cancelOrder(orderId, reason) {
    const { data } = await this.client.post(`/orders/${orderId}/cancel`, { reason });
    return data;
  }

  async updateListing(sku, fields) {
    const update = { seller_sku: sku };
    if (fields.qty !== undefined) update.stock = fields.qty;
    if (fields.price !== undefined) update.selling_price = fields.price;
    if (fields.mrp !== undefined) update.mrp = fields.mrp;
    if (fields.title !== undefined) update.product_name = fields.title;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.images !== undefined) update.images = fields.images;
    const { data } = await this.client.put('/listings/update', update);
    return { channel: 'NYKAA', sku, response: data };
  }

  async requestReview(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/request-review`, {});
    return { channel: 'NYKAA', orderId, response: data };
  }

  _transformOrder(o) {
    return {
      channelOrderId: String(o.order_id),
      channelOrderNumber: o.order_number || o.order_id,
      customer: {
        name: o.customer?.name || 'Nykaa Customer',
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
        channelSku: i.seller_sku || i.sku,
        name: i.product_name,
        qty: i.quantity,
        unitPrice: parseFloat(i.unit_price || 0),
        discount: parseFloat(i.discount || 0),
        tax: parseFloat(i.tax || 0),
      })),
      subtotal: parseFloat(o.subtotal || 0),
      shippingCharge: parseFloat(o.shipping_charges || 0),
      tax: parseFloat(o.tax || 0),
      total: parseFloat(o.total || 0),
      discount: parseFloat(o.discount || 0),
      paymentMethod: o.payment_method || 'Nykaa',
      paymentStatus: o.payment_status === 'PAID' ? 'PAID' : 'PENDING',
      status: 'PENDING',
      orderedAt: new Date(o.order_date || Date.now()),
    };
  }
}

module.exports = NykaaAdapter;
