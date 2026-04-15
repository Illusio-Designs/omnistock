const axios = require('axios');

// Credentials shape: { siteUrl: "https://mystore.com", consumerKey: "ck_xxx", consumerSecret: "cs_xxx" }

class WooCommerceAdapter {
  constructor(credentials) {
    this.client = axios.create({
      baseURL: `${credentials.siteUrl.replace(/\/$/, '')}/wp-json/wc/v3`,
      auth: {
        username: credentials.consumerKey,
        password: credentials.consumerSecret,
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/system_status');
    return { success: true, name: data.environment?.site_url, version: data.environment?.version };
  }

  async fetchOrders(sinceDate) {
    const params = { per_page: 100, status: 'any' };
    if (sinceDate) params.after = sinceDate;
    const { data } = await this.client.get('/orders', { params });
    return data.map(o => this._transformOrder(o));
  }

  async updateListing(sku, fields) {
    const { data: products } = await this.client.get('/products', { params: { sku, per_page: 5 } });
    if (!products.length) throw new Error(`WooCommerce: product with SKU ${sku} not found`);
    const product = products[0];

    const payload = {};
    if (fields.title) payload.name = fields.title;
    if (fields.description) payload.description = fields.description;
    if (fields.price !== undefined) payload.regular_price = String(fields.price);
    if (fields.mrp !== undefined) payload.sale_price = String(fields.price);
    if (fields.qty !== undefined) { payload.stock_quantity = fields.qty; payload.manage_stock = true; }
    if (fields.images) payload.images = fields.images.map(src => ({ src }));

    if (product.type === 'variable') {
      const { data: variations } = await this.client.get(`/products/${product.id}/variations`, { params: { sku, per_page: 10 } });
      const match = variations.find(v => v.sku === sku);
      if (match) {
        const { data } = await this.client.put(`/products/${product.id}/variations/${match.id}`, payload);
        return { channel: 'WOOCOMMERCE', sku, response: data };
      }
      throw new Error(`WooCommerce: variation with SKU ${sku} not found`);
    }
    const { data } = await this.client.put(`/products/${product.id}`, payload);
    return { channel: 'WOOCOMMERCE', sku, response: data };
  }

  async updateInventoryLevel(sku, quantity) {
    // Find product by SKU
    const { data: products } = await this.client.get('/products', { params: { sku, per_page: 5 } });
    if (!products.length) return { updated: false, reason: 'SKU not found' };

    const product = products[0];

    if (product.type === 'variable') {
      const { data: variations } = await this.client.get(`/products/${product.id}/variations`, { params: { sku, per_page: 10 } });
      const match = variations.find(v => v.sku === sku);
      if (match) {
        await this.client.put(`/products/${product.id}/variations/${match.id}`, {
          stock_quantity: quantity,
          manage_stock: true,
        });
      }
    } else {
      await this.client.put(`/products/${product.id}`, {
        stock_quantity: quantity,
        manage_stock: true,
      });
    }
    return { updated: true, sku };
  }

  _transformOrder(o) {
    const statusMap = {
      pending: 'PENDING',
      processing: 'CONFIRMED',
      'on-hold': 'PENDING',
      completed: 'DELIVERED',
      cancelled: 'CANCELLED',
      refunded: 'RETURNED',
      failed: 'CANCELLED',
    };
    return {
      channelOrderId: String(o.id),
      channelOrderNumber: o.number,
      customer: {
        name: `${o.billing.first_name} ${o.billing.last_name}`.trim(),
        email: o.billing.email,
        phone: o.billing.phone,
      },
      shippingAddress: {
        line1: o.shipping.address_1,
        line2: o.shipping.address_2,
        city: o.shipping.city,
        state: o.shipping.state,
        pincode: o.shipping.postcode,
        country: o.shipping.country,
      },
      items: o.line_items.map(i => ({
        channelSku: i.sku,
        name: i.name,
        qty: i.quantity,
        unitPrice: parseFloat(i.price),
        discount: parseFloat(i.total_discount || 0) / Math.max(i.quantity, 1),
        tax: parseFloat(i.total_tax || 0) / Math.max(i.quantity, 1),
      })),
      subtotal: parseFloat(o.subtotal),
      shippingCharge: parseFloat(o.shipping_total),
      tax: parseFloat(o.total_tax),
      total: parseFloat(o.total),
      discount: parseFloat(o.discount_total || 0),
      paymentMethod: o.payment_method_title,
      paymentStatus: ['processing', 'completed'].includes(o.status) ? 'PAID' : 'PENDING',
      status: statusMap[o.status] || 'PENDING',
      orderedAt: new Date(o.date_created),
    };
  }
}

module.exports = WooCommerceAdapter;
