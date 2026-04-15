const axios = require('axios');

// Zepto — 10-minute grocery delivery
// Credentials: { apiKey, sellerId }
// Apply for seller access: https://sell.zeptonow.com
// API access requires approval as a brand/distributor partner.

const BASE = 'https://seller-api.zeptonow.com/v1';

class ZeptoAdapter {
  constructor(credentials) {
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        'X-Seller-Id': credentials.sellerId,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/seller/info');
    return {
      success: true,
      sellerId: data.seller_id,
      sellerName: data.name || data.brand_name,
      status: data.status,
    };
  }

  // Fetch orders from Zepto
  async fetchOrders(sinceDate) {
    const params = { status: 'NEW', limit: 50, offset: 0 };
    if (sinceDate) params.created_after = sinceDate;

    const allOrders = [];
    while (true) {
      const { data } = await this.client.get('/orders', { params });
      const orders = data.orders || data.data || [];
      allOrders.push(...orders);
      if (orders.length < params.limit || !data.has_more) break;
      params.offset += params.limit;
    }

    return allOrders.map(o => this._transformOrder(o));
  }

  // Update inventory for a SKU across Zepto dark stores
  async updateInventoryLevel(sku, quantity) {
    await this.client.post('/inventory/update', {
      sku_id: sku,
      available_quantity: quantity,
    });
    return { updated: true, sku, quantity };
  }

  // Bulk inventory update
  async bulkUpdateInventory(items) {
    const { data } = await this.client.post('/inventory/bulk-update', {
      items: items.map(i => ({ sku_id: i.sku, available_quantity: i.quantity })),
    });
    return data;
  }

  // Get store-level inventory
  async getStoreInventory(storeId) {
    const params = storeId ? { store_id: storeId } : {};
    const { data } = await this.client.get('/inventory/stores', { params });
    return data.stores || data;
  }

  // Confirm order acceptance (required within SLA time)
  async confirmOrder(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/confirm`);
    return data;
  }

  // Mark order packed and ready for Zepto rider
  async markPacked(orderId, items) {
    // items: [{ sku, packed_qty }] — in case of partial fulfillment
    const { data } = await this.client.post(`/orders/${orderId}/pack`, { items });
    return data;
  }

  async updateListing(sku, fields) {
    const update = { sku_id: sku };
    if (fields.qty !== undefined) update.available_quantity = fields.qty;
    if (fields.price !== undefined) update.selling_price = fields.price;
    if (fields.mrp !== undefined) update.mrp = fields.mrp;
    if (fields.title !== undefined) update.name = fields.title;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.images !== undefined) update.images = fields.images;
    const { data } = await this.client.put('/catalog/update', update);
    return { channel: 'ZEPTO', sku, response: data };
  }

  async requestReview(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/request-review`, {});
    return { channel: 'ZEPTO', orderId, response: data };
  }

  _transformOrder(o) {
    return {
      channelOrderId: String(o.order_id || o.id),
      channelOrderNumber: o.order_number || o.order_id,
      customer: {
        name: o.customer?.name || 'Zepto Customer',
        email: null,
        phone: o.customer?.phone || null,
      },
      shippingAddress: {
        line1: o.delivery_address?.line1 || o.address?.line1 || '',
        line2: o.delivery_address?.line2 || '',
        city: o.delivery_address?.city || '',
        state: o.delivery_address?.state || '',
        pincode: o.delivery_address?.pincode || o.delivery_address?.zip || '',
        country: 'India',
      },
      items: (o.items || o.line_items || []).map(i => ({
        channelSku: i.sku_id || i.sku,
        name: i.product_name || i.name,
        qty: i.quantity,
        unitPrice: parseFloat(i.unit_price || i.price || 0),
        discount: parseFloat(i.discount || 0),
        tax: 0,
      })),
      subtotal: parseFloat(o.subtotal || o.order_value || 0),
      shippingCharge: 0,
      tax: parseFloat(o.tax || 0),
      total: parseFloat(o.total || o.order_value || 0),
      discount: parseFloat(o.discount || 0),
      paymentMethod: o.payment_method || 'Zepto',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.created_at || Date.now()),
    };
  }
}

module.exports = ZeptoAdapter;
