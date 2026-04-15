const axios = require('axios');

// WhatsApp Business Cloud API (Meta)
// Credentials: { phoneNumberId, accessToken }
// Docs: https://developers.facebook.com/docs/whatsapp
//
// WhatsApp "orders" come via webhook messages (order type).
// This adapter provides: test, send message, webhook parsing.

const BASE = 'https://graph.facebook.com/v19.0';

class WhatsAppBusinessAdapter {
  constructor(credentials) {
    this.accessToken = credentials.accessToken;
    this.phoneNumberId = credentials.phoneNumberId;
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get(`/${this.phoneNumberId}`);
    return { success: true, phoneNumberId: data.id, displayName: data.verified_name };
  }

  // WhatsApp has no batch-order fetch — orders arrive via webhooks
  async fetchOrders() {
    return [];
  }

  // No inventory sync for WhatsApp
  async updateInventoryLevel() {
    throw new Error('WhatsApp Business does not support inventory sync.');
  }

  // Send a message to a customer (e.g. order confirmation)
  async sendMessage(toPhone, text) {
    const { data } = await this.client.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: 'whatsapp',
      to: toPhone,
      type: 'text',
      text: { body: text },
    });
    return data;
  }

  // Parse an incoming webhook payload (order message from a customer)
  parseWebhook(body) {
    const entry = body.entry?.[0]?.changes?.[0]?.value;
    const msg = entry?.messages?.[0];
    if (!msg) throw new Error('WhatsApp webhook: no message found');
    const order = msg.order;
    if (!order) throw new Error('WhatsApp webhook: message is not an order');

    return {
      channelOrderId: String(msg.id),
      channelOrderNumber: msg.id,
      customer: {
        name: entry.contacts?.[0]?.profile?.name || 'WhatsApp Customer',
        email: null,
        phone: msg.from,
      },
      shippingAddress: { line1: '', line2: '', city: '', state: '', pincode: '', country: 'India' },
      items: (order.product_items || []).map(i => ({
        channelSku: i.product_retailer_id,
        name: i.product_retailer_id,
        qty: i.quantity,
        unitPrice: parseFloat(i.item_price || 0),
        discount: 0,
        tax: 0,
      })),
      subtotal: (order.product_items || []).reduce((s, i) => s + parseFloat(i.item_price || 0) * i.quantity, 0),
      shippingCharge: 0,
      tax: 0,
      total: (order.product_items || []).reduce((s, i) => s + parseFloat(i.item_price || 0) * i.quantity, 0),
      discount: 0,
      paymentMethod: 'WhatsApp',
      paymentStatus: 'PENDING',
      status: 'PENDING',
      orderedAt: new Date(parseInt(msg.timestamp) * 1000 || Date.now()),
    };
  }
}

module.exports = WhatsAppBusinessAdapter;
