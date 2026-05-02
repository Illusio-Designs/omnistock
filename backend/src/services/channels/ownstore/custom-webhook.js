const crypto = require('crypto');

// Custom Webhook adapter — universal webhook receiver for any custom store.
//
// How it works:
// 1. Kartriq exposes a webhook URL: POST /api/v1/channels/:id/webhook
// 2. You configure your custom store / middleware to POST orders to it.
// 3. This adapter validates an HMAC-SHA256 signature (optional) and
//    normalizes the payload into Kartriq's order shape.
//
// Credentials: { webhookSecret?, fieldMap? }
//   - webhookSecret: optional HMAC secret; if set, incoming requests must
//                    include an `x-kartriq-signature` header = hex HMAC.
//   - fieldMap:       optional JSON mapping custom keys → canonical keys.
//                     Example: { "customer_name": "customer.name", "total_amount": "total" }
//
// Supported payload shape (default — if no fieldMap):
// {
//   channelOrderId, channelOrderNumber,
//   customer: { name, email, phone },
//   shippingAddress: { line1, line2, city, state, pincode, country },
//   items: [{ channelSku, name, qty, unitPrice, discount?, tax? }],
//   subtotal, shippingCharge?, tax?, discount?, total,
//   paymentMethod?, paymentStatus?, status?, orderedAt?
// }

class CustomWebhookAdapter {
  constructor(credentials = {}) {
    this.webhookSecret = credentials.webhookSecret || null;
    this.fieldMap = credentials.fieldMap || null;
  }

  // Trivial "connection test" — webhook adapters don't pull, they receive
  async testConnection() {
    return {
      success: true,
      mode: 'webhook',
      signatureValidation: this.webhookSecret ? 'enabled' : 'disabled',
      message: 'Webhook is ready. POST orders to /api/v1/channels/:id/webhook',
    };
  }

  // Webhooks don't pull — return empty so generic sync endpoint is a no-op
  async fetchOrders() {
    return [];
  }

  // No outbound inventory push for generic webhooks
  async updateInventoryLevel() {
    throw new Error('Custom Webhook is receive-only. Configure your store to pull inventory from Kartriq if needed.');
  }

  // Validate HMAC-SHA256 signature on raw body
  validateWebhookSignature(rawBody, signatureHeader) {
    if (!this.webhookSecret) return true; // validation disabled
    if (!signatureHeader) return false;
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signatureHeader.replace(/^sha256=/, ''), 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  // Parse incoming webhook body into Kartriq order shape.
  // If a fieldMap is provided, apply it first.
  parseWebhook(body) {
    const src = this.fieldMap ? this._applyFieldMap(body, this.fieldMap) : body;

    return {
      channelOrderId: String(src.channelOrderId || src.order_id || src.id || `WH-${Date.now()}`),
      channelOrderNumber: src.channelOrderNumber || src.order_number || src.channelOrderId,
      customer: {
        name: src.customer?.name || src.customer_name || 'Custom Customer',
        email: src.customer?.email || src.customer_email || null,
        phone: src.customer?.phone || src.customer_phone || null,
      },
      shippingAddress: {
        line1:   src.shippingAddress?.line1   || src.shipping_line1   || '',
        line2:   src.shippingAddress?.line2   || src.shipping_line2   || '',
        city:    src.shippingAddress?.city    || src.shipping_city    || '',
        state:   src.shippingAddress?.state   || src.shipping_state   || '',
        pincode: src.shippingAddress?.pincode || src.shipping_pincode || '',
        country: src.shippingAddress?.country || src.shipping_country || 'India',
      },
      items: (src.items || src.line_items || []).map(i => ({
        channelSku: i.channelSku || i.sku,
        name: i.name || i.product_name || '',
        qty: parseInt(i.qty || i.quantity || 1),
        unitPrice: parseFloat(i.unitPrice || i.price || 0),
        discount: parseFloat(i.discount || 0),
        tax: parseFloat(i.tax || 0),
      })),
      subtotal: parseFloat(src.subtotal || 0),
      shippingCharge: parseFloat(src.shippingCharge || src.shipping || 0),
      tax: parseFloat(src.tax || 0),
      discount: parseFloat(src.discount || 0),
      total: parseFloat(src.total || src.grand_total || 0),
      paymentMethod: src.paymentMethod || src.payment_method || 'Custom',
      paymentStatus: src.paymentStatus || src.payment_status || 'PENDING',
      status: src.status || 'PENDING',
      orderedAt: new Date(src.orderedAt || src.ordered_at || src.created_at || Date.now()),
    };
  }

  // Apply a simple dot-path fieldMap: { "src_key": "target.path" }
  _applyFieldMap(body, map) {
    const out = JSON.parse(JSON.stringify(body));
    for (const [srcKey, targetPath] of Object.entries(map)) {
      const val = body[srcKey];
      if (val === undefined) continue;
      const parts = targetPath.split('.');
      let cursor = out;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!cursor[parts[i]]) cursor[parts[i]] = {};
        cursor = cursor[parts[i]];
      }
      cursor[parts[parts.length - 1]] = val;
    }
    return out;
  }
}

module.exports = CustomWebhookAdapter;
