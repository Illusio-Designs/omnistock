// Real adapters for the previously-pending QUICKCOM channels.
const { BaseAdapter, bearerClient, makeOrderShape } = require('../_base');

// Flipkart Minutes (uses Flipkart seller API with quickcom flag)
const FlipkartAdapter = require('../ecom/flipkart');
class FlipkartMinutesAdapter extends FlipkartAdapter {
  async fetchOrders(sinceDate) {
    const orders = await super.fetchOrders(sinceDate);
    return orders.filter(o => o.tags?.includes('quickcom') || o.fulfillmentType === 'minutes');
  }
}

// Tata 1mg — pharmacy quick commerce
class Tata1mgAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient('https://seller-api.1mg.com/v1', creds.apiKey, { 'X-Seller-Id': creds.sellerId }); }
  async fetchOrders() {
    const { data } = await this.client.get('/orders', { params: { status: 'PENDING', limit: 50 } });
    return (data?.orders || []).map(o => makeOrderShape({
      channelOrderId: o.order_id, total: parseFloat(o.total_amount || 0),
      orderedAt: new Date(o.created_at), paymentMethod: o.payment_mode || '1mg',
      shippingAddress: { line1: o.delivery_address?.line1, city: o.delivery_address?.city, state: o.delivery_address?.state, pincode: o.delivery_address?.pincode, country: 'India' },
    }));
  }
  async updateInventoryLevel(sku, qty) { await this.client.post('/inventory/update', { sku_id: sku, quantity: qty }); return { updated: true, sku, qty }; }
}

// Dunzo — hyperlocal
class DunzoAdapter extends BaseAdapter {
  constructor(creds) {
    super(creds);
    this.client = bearerClient('https://apis.dunzo.in/api/v1', creds.accessToken, { 'X-Client-Id': creds.clientId });
  }
  async fetchOrders() {
    const { data } = await this.client.get('/orders', { params: { status: 'placed' } });
    return (data?.orders || []).map(o => makeOrderShape({
      channelOrderId: o.order_id, total: parseFloat(o.total || 0),
      orderedAt: new Date(o.created_at),
      shippingAddress: { line1: o.drop?.address, city: o.drop?.city, country: 'India' },
    }));
  }
  async updateInventoryLevel(sku, qty) { await this.client.post('/inventory', { sku, available: qty }); return { updated: true, sku, qty }; }
}

// Country Delight — webhook receiver (no public API)
const CustomWebhookAdapter = require('../ownstore/custom-webhook');
class CountryDelightAdapter extends CustomWebhookAdapter {}

module.exports = { FlipkartMinutesAdapter, Tata1mgAdapter, DunzoAdapter, CountryDelightAdapter };
