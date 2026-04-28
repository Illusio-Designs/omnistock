const axios = require('axios');

// Credentials shape: { apiKey: "your_meesho_api_key" }
// Get your API key: Meesho Supplier Portal → Settings → API Integration
// Apply for API access at: https://supplier.meesho.com
//
// Dev stub: pass apiKey="stub" while NODE_ENV !== 'production' to short-circuit
// every API call with deterministic fake data. Useful for end-to-end UI testing
// without a real Meesho supplier account.

const BASE = 'https://supplier.meesho.com/api/v3';

function isStubMode(apiKey) {
  return process.env.NODE_ENV !== 'production' && (apiKey || '').toLowerCase() === 'stub';
}

const STUB_ORDERS = [
  {
    channelOrderId: 'MSH-STUB-1001',
    channelOrderNumber: 'MSH-STUB-1001',
    customer: { name: 'Riya Sharma (stub)', email: null, phone: '+91 90000 11111' },
    shippingAddress: { line1: '12 MG Road', line2: '', city: 'Bangalore', state: 'Karnataka', pincode: '560001', country: 'India' },
    items: [{ channelSku: 'STUB-SKU-A', name: 'Cotton Kurta — Blue (M)', qty: 1, unitPrice: 499, discount: 0, tax: 0 }],
    subtotal: 499, shippingCharge: 0, tax: 0, total: 499, discount: 0,
    paymentMethod: 'Meesho', paymentStatus: 'PAID', status: 'PENDING',
    orderedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
  },
  {
    channelOrderId: 'MSH-STUB-1002',
    channelOrderNumber: 'MSH-STUB-1002',
    customer: { name: 'Arjun Mehta (stub)', email: null, phone: '+91 90000 22222' },
    shippingAddress: { line1: '47 Park Street', line2: 'Flat 3B', city: 'Kolkata', state: 'West Bengal', pincode: '700016', country: 'India' },
    items: [
      { channelSku: 'STUB-SKU-B', name: 'Denim Jacket — Black (L)', qty: 1, unitPrice: 1299, discount: 100, tax: 0 },
      { channelSku: 'STUB-SKU-C', name: 'Plain Tee — White (L)', qty: 2, unitPrice: 299, discount: 0, tax: 0 },
    ],
    subtotal: 1797, shippingCharge: 0, tax: 0, total: 1697, discount: 100,
    paymentMethod: 'Meesho', paymentStatus: 'PAID', status: 'PENDING',
    orderedAt: new Date(Date.now() - 1000 * 60 * 60 * 36),
  },
];

class MeeshoAdapter {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.stub = isStubMode(this.apiKey);
    if (!this.stub) {
      this.client = axios.create({
        baseURL: BASE,
        headers: {
          'meesho-api-key': credentials.apiKey,
          'Content-Type': 'application/json',
        },
      });
    }
  }

  async testConnection() {
    if (this.stub) {
      return { success: true, totalOrders: STUB_ORDERS.length, stub: true, message: 'Meesho stub mode (NODE_ENV=development).' };
    }
    // Fetch first page of orders to verify the key works
    const { data } = await this.client.get('/orders/v3', {
      params: { page: 1, pageSize: 1 },
    });
    return { success: true, totalOrders: data.totalElements || 0 };
  }

  // sinceDate: ISO string or null
  async fetchOrders(sinceDate) {
    if (this.stub) {
      // Filter by sinceDate if provided to mimic real behavior
      const cutoff = sinceDate ? new Date(sinceDate).getTime() : 0;
      return STUB_ORDERS.filter(o => o.orderedAt.getTime() >= cutoff);
    }
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
    if (this.stub) {
      return { updated: true, sku, stub: true, quantity };
    }
    await this.client.put('/listings/update', {
      listings: [{ sub_sku_id: sku, inventory: quantity }],
    });
    return { updated: true, sku };
  }

  // Create manifest for a list of sub_order_nos before shipping
  async createManifest(subOrderNos) {
    if (this.stub) return { stub: true, manifestId: `MFT-STUB-${Date.now()}`, orderCount: subOrderNos.length };
    const { data } = await this.client.post('/orders/manifest/create', {
      order_ids: subOrderNos,
    });
    return data;
  }

  // Download shipping label PDF (returns URL or base64)
  async getLabel(subOrderNo) {
    if (this.stub) return { stub: true, url: `https://example.com/stub-label-${subOrderNo}.pdf` };
    const { data } = await this.client.get(`/orders/${subOrderNo}/label`);
    return data;
  }

  async updateListing(sku, fields) {
    if (this.stub) return { channel: 'MEESHO', sku, stub: true, fields };
    const update = { sub_sku_id: sku };
    if (fields.qty !== undefined) update.inventory = fields.qty;
    if (fields.price !== undefined) update.price = fields.price;
    if (fields.mrp !== undefined) update.mrp = fields.mrp;
    if (fields.title !== undefined) update.product_name = fields.title;
    const { data } = await this.client.put('/listings/update', { listings: [update] });
    return { channel: 'MEESHO', sku, response: data };
  }

  async requestReview(subOrderNo) {
    if (this.stub) return { channel: 'MEESHO', orderId: subOrderNo, stub: true, message: 'Review request stubbed.' };
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
