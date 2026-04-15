const axios = require('axios');

// Credentials shape: { supplierId: "your_id", apiKey: "your_key", secretKey: "your_secret" }
// Apply for API access: https://vendorhub.myntra.com → Settings → API Access
// Myntra requires seller approval before granting API credentials.

const BASE = 'https://omnishipper.myntra.com/api/v2';

class MyntraAdapter {
  constructor(credentials) {
    this.supplierId = credentials.supplierId;
    this.apiKey = credentials.apiKey;
    this.secretKey = credentials.secretKey;
    this._token = null;
    this._tokenExpiry = null;
  }

  async _getToken() {
    if (this._token && this._tokenExpiry > Date.now()) return this._token;
    const { data } = await axios.post(`${BASE}/token`, {
      supplierId: this.supplierId,
      apiKey: this.apiKey,
      secretKey: this.secretKey,
    });
    this._token = data.access_token || data.token;
    // Tokens typically valid 24 hours; refresh after 23
    this._tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;
    return this._token;
  }

  async _req(method, path, payload = null, params = {}) {
    const token = await this._getToken();
    const { data } = await axios({
      method,
      url: `${BASE}${path}`,
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Supplier-Id': this.supplierId,
        'Content-Type': 'application/json',
      },
      params,
      data: payload,
    });
    return data;
  }

  async testConnection() {
    const data = await this._req('GET', '/supplier/info');
    return {
      success: true,
      supplierId: this.supplierId,
      supplierName: data.supplierName || data.name,
    };
  }

  async fetchOrders(sinceDate) {
    const params = {
      pageNo: 1,
      pageSize: 50,
      orderStatus: 'NEW',
    };
    if (sinceDate) params.fromDate = sinceDate.split('T')[0]; // Myntra uses YYYY-MM-DD

    const allOrders = [];

    while (true) {
      const data = await this._req('GET', '/orders', null, params);
      const orders = data.orderSummaryList || data.orders || [];
      allOrders.push(...orders);

      if (orders.length < params.pageSize || !data.nextPage) break;
      params.pageNo++;
    }

    // For each order summary, fetch full details
    const detailed = await Promise.all(
      allOrders.map(o => this._req('GET', `/orders/${o.orderId || o.orderNo}`).catch(() => o))
    );

    return detailed.map(o => this._transformOrder(o));
  }

  // Update inventory for a style-sku on Myntra
  async updateInventoryLevel(sku, quantity) {
    await this._req('POST', '/inventory/update', {
      inventoryList: [{ skuId: sku, quantity }],
    });
    return { updated: true, sku };
  }

  // Accept/acknowledge orders before shipping (required by Myntra before manifesting)
  async acceptOrders(orderIds) {
    const data = await this._req('POST', '/orders/accept', { orderIds });
    return data;
  }

  // Generate dispatch manifest for accepted orders
  async generateManifest(orderIds) {
    const data = await this._req('POST', '/shipment/manifest', { orderIds });
    return data;
  }

  // Mark orders as shipped with AWB
  async shipOrders(shipments) {
    // shipments: [{ orderId, skuId, quantity, courierName, awbNumber, invoiceDate }]
    const data = await this._req('POST', '/shipment/dispatch', { shipments });
    return data;
  }

  async updateListing(sku, fields) {
    const update = { skuId: sku };
    if (fields.qty !== undefined) update.quantity = fields.qty;
    if (fields.price !== undefined) update.sellingPrice = fields.price;
    if (fields.mrp !== undefined) update.mrp = fields.mrp;
    if (fields.title !== undefined) update.productName = fields.title;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.images !== undefined) update.images = fields.images;
    const data = await this._req('PUT', '/listings/update', { listings: [update] });
    return { channel: 'MYNTRA', sku, response: data };
  }

  async requestReview(orderId) {
    const data = await this._req('POST', `/orders/${orderId}/review-request`, {});
    return { channel: 'MYNTRA', orderId, response: data };
  }

  _transformOrder(o) {
    const items = o.orderItems || o.items || [];
    return {
      channelOrderId: String(o.orderId || o.orderNo),
      channelOrderNumber: o.myntraOrderNo || o.orderNo,
      customer: {
        name: o.customerName || o.shippingAddress?.name || 'Myntra Customer',
        email: null, // Myntra hides customer email from sellers
        phone: o.shippingAddress?.contactNo || o.customerPhone || null,
      },
      shippingAddress: {
        line1: o.shippingAddress?.addressLine1 || o.shippingAddress?.address1 || '',
        line2: o.shippingAddress?.addressLine2 || '',
        city: o.shippingAddress?.city || '',
        state: o.shippingAddress?.state || '',
        pincode: o.shippingAddress?.pinCode || o.shippingAddress?.pincode || '',
        country: 'India',
      },
      items: items.map(i => ({
        channelSku: i.skuId || i.sku,
        name: i.productName || i.name,
        qty: i.quantity || 1,
        unitPrice: parseFloat(i.sellingPrice || i.mrp || 0),
        discount: parseFloat(i.discount || 0),
        tax: 0,
      })),
      subtotal: parseFloat(o.orderAmount || o.totalAmount || 0),
      shippingCharge: 0,
      tax: 0,
      total: parseFloat(o.orderAmount || o.totalAmount || 0),
      discount: parseFloat(o.totalDiscount || 0),
      paymentMethod: 'Myntra',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.orderDate || o.createdAt || Date.now()),
    };
  }
}

module.exports = MyntraAdapter;
