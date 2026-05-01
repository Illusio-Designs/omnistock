// Shared helpers for channel adapters.
// Provides common patterns: bearer-token REST client, OAuth refresh,
// standard transforms, and a base class that satisfies the adapter
// interface (testConnection / fetchOrders / updateInventoryLevel /
// updateListing / requestReview) so subclasses only override what they need.

const axios = require('axios');

class BaseAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
    this.client = null;
  }

  async testConnection() {
    return { success: true, message: `${this.constructor.name} configured. Run a sync to verify.` };
  }

  async fetchOrders() { return []; }
  async updateInventoryLevel() { return { success: true, skipped: true }; }
  async bulkUpdateInventory() { return { success: true, skipped: true }; }
  async updateListing() { return { success: true, skipped: true }; }
  async requestReview() { return { success: false, skipped: true }; }
}

// Convenience: build an axios client with bearer auth.
function bearerClient(baseURL, token, extraHeaders = {}) {
  return axios.create({
    baseURL,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// Convenience: build an axios client with basic auth.
function basicClient(baseURL, username, password) {
  return axios.create({
    baseURL,
    auth: { username, password },
    headers: { 'Content-Type': 'application/json' },
  });
}

// Generic order shape — what every adapter must produce in fetchOrders().
function makeOrderShape({
  channelOrderId,
  channelOrderNumber,
  customer = {},
  shippingAddress = {},
  items = [],
  subtotal = 0,
  shippingCharge = 0,
  tax = 0,
  total = 0,
  discount = 0,
  paymentMethod = 'Online',
  paymentStatus = 'PAID',
  status = 'PENDING',
  orderedAt = new Date(),
}) {
  return {
    channelOrderId: String(channelOrderId),
    channelOrderNumber: channelOrderNumber || String(channelOrderId),
    customer: {
      name: customer.name || 'Customer',
      email: customer.email || null,
      phone: customer.phone || null,
    },
    shippingAddress: {
      line1: shippingAddress.line1 || '',
      line2: shippingAddress.line2 || '',
      city: shippingAddress.city || '',
      state: shippingAddress.state || '',
      pincode: shippingAddress.pincode || shippingAddress.zip || '',
      country: shippingAddress.country || 'India',
    },
    items: items.map(i => ({
      channelSku: i.channelSku || i.sku,
      name: i.name || '',
      qty: parseInt(i.qty || i.quantity || 1, 10),
      unitPrice: parseFloat(i.unitPrice || i.price || 0),
      discount: parseFloat(i.discount || 0),
      tax: parseFloat(i.tax || 0),
    })),
    subtotal: parseFloat(subtotal || 0),
    shippingCharge: parseFloat(shippingCharge || 0),
    tax: parseFloat(tax || 0),
    total: parseFloat(total || 0),
    discount: parseFloat(discount || 0),
    paymentMethod,
    paymentStatus,
    status,
    orderedAt: orderedAt instanceof Date ? orderedAt : new Date(orderedAt || Date.now()),
  };
}

module.exports = { BaseAdapter, bearerClient, basicClient, makeOrderShape };
