const axios = require('axios');

// Instagram Shopping (Meta Graph API)
// Credentials: { accessToken, pageId }
// Docs: https://developers.facebook.com/docs/commerce-platform

const BASE = 'https://graph.facebook.com/v19.0';

class InstagramAdapter {
  constructor(credentials) {
    this.accessToken = credentials.accessToken;
    this.pageId = credentials.pageId;
    this.client = axios.create({ baseURL: BASE });
  }

  async testConnection() {
    const { data } = await this.client.get(`/${this.pageId}`, {
      params: { fields: 'id,name', access_token: this.accessToken },
    });
    return { success: true, pageId: data.id, pageName: data.name };
  }

  async fetchOrders(sinceDate) {
    const params = {
      access_token: this.accessToken,
      state: '["CREATED","IN_PROGRESS"]',
    };
    if (sinceDate) params.updated_after = Math.floor(new Date(sinceDate).getTime() / 1000);
    const { data } = await this.client.get(`/${this.pageId}/commerce_orders`, { params });
    return (data.data || []).map(o => this._transformOrder(o));
  }

  async updateInventoryLevel(catalogItemId, quantity) {
    await this.client.post(`/${catalogItemId}`, null, {
      params: { inventory: quantity, access_token: this.accessToken },
    });
    return { updated: true, sku: catalogItemId, quantity };
  }

  // Handle incoming Meta Graph webhook for commerce_orders
  parseWebhook(body) {
    const change = body?.entry?.[0]?.changes?.[0];
    if (!change || change.field !== 'commerce_orders') {
      throw new Error('Instagram webhook: not a commerce_orders event');
    }
    const v = change.value || {};
    return this._transformOrder({
      id: v.order_id,
      order_id: v.order_id,
      buyer_details: v.buyer_details,
      shipping_address: v.shipping_address,
      items: { data: v.items || [] },
      estimated_payment_details: v.estimated_payment_details,
      created: v.created_at || Math.floor(Date.now() / 1000),
    });
  }

  async requestReview(channelOrderId) {
    return { skipped: true, reason: 'Instagram review requests handled by Meta automatically' };
  }

  _transformOrder(o) {
    return {
      channelOrderId: String(o.id),
      channelOrderNumber: o.order_id || o.id,
      customer: {
        name: o.buyer_details?.name || 'Instagram Customer',
        email: o.buyer_details?.email || null,
        phone: null,
      },
      shippingAddress: {
        line1: o.shipping_address?.street1 || '',
        line2: o.shipping_address?.street2 || '',
        city: o.shipping_address?.city || '',
        state: o.shipping_address?.state || '',
        pincode: o.shipping_address?.postal_code || '',
        country: o.shipping_address?.country || '',
      },
      items: (o.items?.data || []).map(i => ({
        channelSku: i.retailer_id || i.product_id,
        name: i.product_name,
        qty: i.quantity,
        unitPrice: parseFloat(i.price_per_unit?.amount || 0),
        discount: 0,
        tax: parseFloat(i.tax_details?.amount || 0),
      })),
      subtotal: parseFloat(o.estimated_payment_details?.subtotal?.items?.amount || 0),
      shippingCharge: parseFloat(o.estimated_payment_details?.subtotal?.shipping?.amount || 0),
      tax: parseFloat(o.estimated_payment_details?.tax?.amount || 0),
      total: parseFloat(o.estimated_payment_details?.total_amount?.amount || 0),
      discount: 0,
      paymentMethod: 'Instagram Shopping',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.created * 1000 || Date.now()),
    };
  }
}

module.exports = InstagramAdapter;
