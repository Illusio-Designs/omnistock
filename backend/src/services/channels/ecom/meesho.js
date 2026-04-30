const axios = require('axios');

// Credentials shape: { apiKey: "your_meesho_api_key" }
// Get your API key: Meesho Supplier Portal → Settings → API Integration
// Apply for API access at: https://supplier.meesho.com

const BASE = 'https://supplier.meesho.com/api/v3';

class MeeshoAdapter {
  constructor(credentials) {
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        'meesho-api-key': credentials.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    // Fetch first page of orders to verify the key works
    const { data } = await this.client.get('/orders/v3', {
      params: { page: 1, pageSize: 1 },
    });
    return { success: true, totalOrders: data.totalElements || 0 };
  }

  // sinceDate: ISO string or null
  async fetchOrders(sinceDate) {
    const allOrders = [];
    let page = 1;
    const pageSize = 25;

    while (true) {
      const params = { page, pageSize, status: 'ACCEPTED' };
      if (sinceDate) params.from = sinceDate;

      const { data } = await this.client.get('/orders/v3', { params });
      const orders = data.data || [];
      allOrders.push(...orders);

      if (orders.length < pageSize || allOrders.length >= (data.totalElements || 0)) break;
      page++;
    }

    return allOrders.map(o => this._transformOrder(o));
  }

  // Meesho inventory update — updates available stock for a sub_sku
  async updateInventoryLevel(sku, quantity) {
    await this.client.put('/listings/update', {
      listings: [{ sub_sku_id: sku, inventory: quantity }],
    });
    return { updated: true, sku };
  }

  // Create manifest for a list of sub_order_nos before shipping
  async createManifest(subOrderNos) {
    const { data } = await this.client.post('/orders/manifest/create', {
      order_ids: subOrderNos,
    });
    return data;
  }

  // Download shipping label PDF (returns URL or base64)
  async getLabel(subOrderNo) {
    const { data } = await this.client.get(`/orders/${subOrderNo}/label`);
    return data;
  }

  async updateListing(sku, fields) {
    const update = { sub_sku_id: sku };
    if (fields.qty !== undefined) update.inventory = fields.qty;
    if (fields.price !== undefined) update.price = fields.price;
    if (fields.mrp !== undefined) update.mrp = fields.mrp;
    if (fields.title !== undefined) update.product_name = fields.title;
    const { data } = await this.client.put('/listings/update', { listings: [update] });
    return { channel: 'MEESHO', sku, response: data };
  }

  async requestReview(subOrderNo) {
    const { data } = await this.client.post(`/orders/${subOrderNo}/review-request`, {});
    return { channel: 'MEESHO', orderId: subOrderNo, response: data };
  }

  _transformOrder(o) {
    // Meesho order: sub_order_no is the unique line-item order identifier
    const subOrders = o.subOrders || [o];
    return {
      channelOrderId: String(o.order_id || o.sub_order_no),
      channelOrderNumber: o.channel_order_id || o.order_id,
      customer: {
        name: o.billing?.name || o.customer_name || 'Meesho Customer',
        email: null, // Meesho hides buyer emails
        phone: o.billing?.contact_number || o.customer_phone || null,
      },
      shippingAddress: {
        line1: o.shipping_address?.address1 || o.address1 || '',
        line2: o.shipping_address?.address2 || o.address2 || '',
        city: o.shipping_address?.city || o.city || '',
        state: o.shipping_address?.state || o.state || '',
        pincode: o.shipping_address?.zipcode || o.pincode || '',
        country: 'India',
      },
      items: subOrders.map(sub => ({
        channelSku: sub.sku_id || sub.sub_sku_id,
        name: sub.product_name || sub.sku_name,
        qty: sub.quantity || 1,
        unitPrice: parseFloat(sub.amount || sub.selling_price || 0),
        discount: 0,
        tax: 0,
      })),
      subtotal: parseFloat(o.amount || o.order_value || 0),
      shippingCharge: 0,
      tax: 0,
      total: parseFloat(o.amount || o.order_value || 0),
      discount: 0,
      paymentMethod: 'Meesho',
      paymentStatus: 'PAID', // Meesho collects payment; sellers get settled
      status: 'PENDING',
      orderedAt: new Date(o.created_at || o.order_date || Date.now()),
    };
  }
}

module.exports = MeeshoAdapter;
