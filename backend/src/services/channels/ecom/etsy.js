const axios = require('axios');

// Etsy Open API v3
// Credentials: { apiKey, accessToken, shopId }
// Docs: https://developers.etsy.com/documentation

const BASE = 'https://openapi.etsy.com/v3/application';

class EtsyAdapter {
  constructor(credentials) {
    this.apiKey = credentials.apiKey;
    this.shopId = credentials.shopId;
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        'x-api-key': credentials.apiKey,
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get(`/shops/${this.shopId}`);
    return { success: true, shopId: this.shopId, shopName: data.shop_name };
  }

  async fetchOrders(sinceDate) {
    const params = { limit: 50, offset: 0, was_paid: true, was_shipped: false };
    if (sinceDate) params.min_created = Math.floor(new Date(sinceDate).getTime() / 1000);
    const all = [];
    while (true) {
      const { data } = await this.client.get(`/shops/${this.shopId}/receipts`, { params });
      const receipts = data.results || [];
      all.push(...receipts);
      if (receipts.length < params.limit) break;
      params.offset += params.limit;
    }
    return all.map(r => this._transformOrder(r));
  }

  async updateInventoryLevel(listingId, quantity) {
    // Etsy inventory is managed per listing — listingId is used as "sku"
    await this.client.put(`/listings/${listingId}/inventory`, {
      products: [{ property_values: [], offerings: [{ price: 0, quantity, is_enabled: true }] }],
    });
    return { updated: true, sku: listingId, quantity };
  }

  // Etsy Open API — update a listing (listingId is used as "sku")
  async updateListing(listingId, fields) {
    const payload = {};
    if (fields.title) payload.title = fields.title;
    if (fields.description) payload.description = fields.description;
    if (fields.price !== undefined) payload.price = fields.price;
    if (fields.qty !== undefined) payload.quantity = fields.qty;
    const { data } = await this.client.put(
      `/shops/${this.shopId}/listings/${listingId}`,
      payload
    );
    return { channel: 'ETSY', sku: listingId, response: data };
  }

  // Etsy review requests are auto-sent by Etsy after delivery; no seller API.
  async requestReview(receiptId) {
    return {
      channel: 'ETSY',
      orderId: receiptId,
      skipped: true,
      note: 'Etsy auto-sends review prompts after delivery; no seller API call needed.',
    };
  }

  _transformOrder(r) {
    return {
      channelOrderId: String(r.receipt_id),
      channelOrderNumber: r.receipt_id,
      customer: {
        name: r.name || 'Etsy Customer',
        email: r.buyer_email || null,
        phone: null,
      },
      shippingAddress: {
        line1: r.first_line || '',
        line2: r.second_line || '',
        city: r.city || '',
        state: r.state || '',
        pincode: r.zip || '',
        country: r.country_iso || '',
      },
      items: (r.transactions || []).map(t => ({
        channelSku: String(t.listing_id),
        name: t.title,
        qty: t.quantity,
        unitPrice: parseFloat(t.price?.amount || 0) / (parseFloat(t.price?.divisor) || 1),
        discount: 0,
        tax: 0,
      })),
      subtotal: parseFloat(r.subtotal?.amount || 0) / (parseFloat(r.subtotal?.divisor) || 1),
      shippingCharge: parseFloat(r.total_shipping_cost?.amount || 0) / (parseFloat(r.total_shipping_cost?.divisor) || 1),
      tax: parseFloat(r.total_tax_cost?.amount || 0) / (parseFloat(r.total_tax_cost?.divisor) || 1),
      total: parseFloat(r.grandtotal?.amount || 0) / (parseFloat(r.grandtotal?.divisor) || 1),
      discount: parseFloat(r.discount_amt?.amount || 0) / (parseFloat(r.discount_amt?.divisor) || 1),
      paymentMethod: r.payment_method || 'Etsy',
      paymentStatus: r.is_paid ? 'PAID' : 'PENDING',
      status: 'PENDING',
      orderedAt: new Date((r.created_timestamp || Date.now() / 1000) * 1000),
    };
  }
}

module.exports = EtsyAdapter;
