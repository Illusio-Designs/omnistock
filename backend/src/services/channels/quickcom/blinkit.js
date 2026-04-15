const axios = require('axios');

// Blinkit (formerly Grofers) — 10-minute quick commerce
// Credentials: { apiKey, sellerId }
// Apply for partner access: https://partners.blinkit.com
// API access is granted only to approved FMCG brands and distributors.

const BASE = 'https://partner-api.blinkit.com/v1';

class BlinkitAdapter {
  constructor(credentials) {
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        'X-Api-Key': credentials.apiKey,
        'X-Seller-Id': credentials.sellerId,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/seller/profile');
    return {
      success: true,
      sellerId: data.seller_id,
      sellerName: data.seller_name,
      cities: data.active_cities || [],
    };
  }

  // Fetch new / pending orders from Blinkit dark stores
  async fetchOrders(sinceDate) {
    const params = { status: 'PENDING', page: 1, page_size: 50 };
    if (sinceDate) params.from_date = sinceDate;

    const allOrders = [];
    while (true) {
      const { data } = await this.client.get('/orders', { params });
      const orders = data.orders || [];
      allOrders.push(...orders);
      if (!data.has_next_page || orders.length < params.page_size) break;
      params.page++;
    }

    return allOrders.map(o => this._transformOrder(o));
  }

  // Update stock at a specific Blinkit dark store / city hub
  // quantity is the available stock count at that location
  async updateInventoryLevel(sku, quantity, locationId) {
    await this.client.put('/inventory/update', {
      items: [{ seller_sku: sku, available_qty: quantity, location_id: locationId }],
    });
    return { updated: true, sku, quantity };
  }

  // Bulk inventory update across all dark stores
  async bulkUpdateInventory(items) {
    // items: [{ sku, quantity, locationId }]
    const { data } = await this.client.put('/inventory/bulk-update', {
      items: items.map(i => ({
        seller_sku: i.sku,
        available_qty: i.quantity,
        location_id: i.locationId,
      })),
    });
    return data;
  }

  // Get current stock levels at all Blinkit dark stores for your SKUs
  async getDarkStoreInventory() {
    const { data } = await this.client.get('/inventory/locations');
    return data.locations || [];
  }

  // Accept / confirm an order (required before Blinkit dispatches a rider)
  async acceptOrder(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/accept`);
    return data;
  }

  // Mark order as packed and ready for pickup by rider
  async markReady(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/ready`);
    return data;
  }

  async updateListing(sku, fields) {
    const update = { seller_sku: sku };
    if (fields.qty !== undefined) update.available_qty = fields.qty;
    if (fields.price !== undefined) update.selling_price = fields.price;
    if (fields.mrp !== undefined) update.mrp = fields.mrp;
    if (fields.title !== undefined) update.product_name = fields.title;
    if (fields.images !== undefined) update.images = fields.images;
    const { data } = await this.client.put('/catalog/update', update);
    return { channel: 'BLINKIT', sku, response: data };
  }

  async requestReview(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/request-review`, {});
    return { channel: 'BLINKIT', orderId, response: data };
  }

  _transformOrder(o) {
    return {
      channelOrderId: String(o.order_id),
      channelOrderNumber: o.order_ref || o.order_id,
      customer: {
        name: o.customer_name || 'Blinkit Customer',
        email: null, // Blinkit hides customer contact
        phone: o.customer_phone || null,
      },
      shippingAddress: {
        line1: o.delivery_address?.address_line1 || '',
        line2: o.delivery_address?.address_line2 || '',
        city: o.delivery_address?.city || '',
        state: o.delivery_address?.state || '',
        pincode: o.delivery_address?.pincode || '',
        country: 'India',
      },
      items: (o.items || []).map(i => ({
        channelSku: i.seller_sku || i.sku,
        name: i.product_name || i.name,
        qty: i.quantity,
        unitPrice: parseFloat(i.selling_price || i.price || 0),
        discount: parseFloat(i.discount || 0),
        tax: 0,
      })),
      subtotal: parseFloat(o.subtotal || o.order_amount || 0),
      shippingCharge: 0, // Blinkit handles delivery
      tax: parseFloat(o.tax_amount || 0),
      total: parseFloat(o.total_amount || o.order_amount || 0),
      discount: parseFloat(o.discount_amount || 0),
      paymentMethod: o.payment_mode || 'Blinkit',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.created_at || Date.now()),
    };
  }
}

module.exports = BlinkitAdapter;
