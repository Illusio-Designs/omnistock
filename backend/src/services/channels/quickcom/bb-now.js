const axios = require('axios');

// BB Now (BigBasket Now) — instant grocery delivery by BigBasket / Tata
// Credentials: { apiKey, vendorId }
// Apply at: https://www.bigbasket.com/sell/ (BigBasket Vendor Hub)
// API access is available for approved FMCG brands and suppliers.

const BASE = 'https://vendor-api.bigbasket.com/v1';

class BBNowAdapter {
  constructor(credentials) {
    this.client = axios.create({
      baseURL: BASE,
      headers: {
        'BB-Api-Key': credentials.apiKey,
        'BB-Vendor-Id': credentials.vendorId,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/vendor/profile');
    return {
      success: true,
      vendorId: data.vendor_id,
      vendorName: data.vendor_name,
      activeCities: data.active_cities || [],
    };
  }

  // Fetch orders from BB Now
  async fetchOrders(sinceDate) {
    const params = { order_status: 'PENDING', page_no: 1, page_size: 50 };
    if (sinceDate) params.start_date = sinceDate;

    const allOrders = [];
    while (true) {
      const { data } = await this.client.get('/orders', { params });
      const orders = data.orders || [];
      allOrders.push(...orders);
      if (orders.length < params.page_size || !data.next_page) break;
      params.page_no++;
    }

    return allOrders.map(o => this._transformOrder(o));
  }

  // Update inventory for a product at BigBasket fulfillment centres
  async updateInventoryLevel(sku, quantity) {
    await this.client.post('/inventory/update', {
      vendor_sku: sku,
      available_qty: quantity,
    });
    return { updated: true, sku, quantity };
  }

  // Bulk inventory update
  async bulkUpdateInventory(items) {
    const { data } = await this.client.post('/inventory/bulk-update', {
      items: items.map(i => ({ vendor_sku: i.sku, available_qty: i.quantity })),
    });
    return data;
  }

  // Get current stock levels across BB fulfilment centres
  async getWarehouseInventory() {
    const { data } = await this.client.get('/inventory/warehouse-summary');
    return data.warehouses || data;
  }

  // Confirm acceptance of an order (BB Now has strict SLA)
  async confirmOrder(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/confirm`);
    return data;
  }

  // Update order status as packed
  async markPacked(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/pack`);
    return data;
  }

  // Cancel an order with reason
  async cancelOrder(orderId, reason) {
    const { data } = await this.client.post(`/orders/${orderId}/cancel`, { reason });
    return data;
  }

  // Get purchase orders / replenishment requests from BigBasket
  async getPurchaseOrders(status) {
    const params = status ? { status } : {};
    const { data } = await this.client.get('/purchase-orders', { params });
    return data.purchase_orders || [];
  }

  async updateListing(sku, fields) {
    const update = { vendor_sku: sku };
    if (fields.qty !== undefined) update.available_qty = fields.qty;
    if (fields.price !== undefined) update.selling_price = fields.price;
    if (fields.mrp !== undefined) update.mrp = fields.mrp;
    if (fields.title !== undefined) update.product_name = fields.title;
    if (fields.description !== undefined) update.description = fields.description;
    if (fields.images !== undefined) update.images = fields.images;
    const { data } = await this.client.put('/catalog/update', update);
    return { channel: 'BB_NOW', sku, response: data };
  }

  async requestReview(orderId) {
    const { data } = await this.client.post(`/orders/${orderId}/request-review`, {});
    return { channel: 'BB_NOW', orderId, response: data };
  }

  _transformOrder(o) {
    return {
      channelOrderId: String(o.bb_order_id || o.order_id),
      channelOrderNumber: o.order_number || o.bb_order_id,
      customer: {
        name: o.customer_details?.name || 'BB Now Customer',
        email: null,
        phone: o.customer_details?.mobile || null,
      },
      shippingAddress: {
        line1: o.delivery_address?.address_line1 || '',
        line2: o.delivery_address?.address_line2 || '',
        city: o.delivery_address?.city || '',
        state: o.delivery_address?.state || '',
        pincode: o.delivery_address?.pin_code || '',
        country: 'India',
      },
      items: (o.order_items || o.items || []).map(i => ({
        channelSku: i.vendor_sku || i.bb_sku || i.sku,
        name: i.product_name || i.name,
        qty: i.ordered_qty || i.quantity,
        unitPrice: parseFloat(i.selling_price || i.unit_price || 0),
        discount: parseFloat(i.discount || 0),
        tax: parseFloat(i.tax_amount || 0),
      })),
      subtotal: parseFloat(o.sub_total || o.order_value || 0),
      shippingCharge: 0,
      tax: parseFloat(o.total_tax || 0),
      total: parseFloat(o.order_total || o.order_value || 0),
      discount: parseFloat(o.total_discount || 0),
      paymentMethod: o.payment_mode || 'BB Now',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.order_date || o.created_at || Date.now()),
    };
  }
}

module.exports = BBNowAdapter;
