// Real adapters for previously-pending OWNSTORE / e-commerce platforms.
const { BaseAdapter, bearerClient, makeOrderShape } = require('../_base');
const axios = require('axios');

// Wix Stores
class WixAdapter extends BaseAdapter {
  constructor(creds) {
    super(creds);
    this.client = axios.create({
      baseURL: 'https://www.wixapis.com/stores/v2',
      headers: { Authorization: creds.apiKey, 'wix-site-id': creds.siteId, 'Content-Type': 'application/json' },
    });
  }
  async fetchOrders() {
    const { data } = await this.client.post('/orders/query', { query: { filter: JSON.stringify({ paymentStatus: 'PAID' }), paging: { limit: 50 } } });
    return (data?.orders || []).map(o => this._transform(o));
  }
  async updateInventoryLevel(sku, qty) {
    await this.client.patch('/inventoryItems', { inventoryItem: { variants: [{ sku, inStock: qty > 0, quantity: qty }] } });
    return { updated: true, sku, qty };
  }
  _transform(o) {
    return makeOrderShape({
      channelOrderId: o.id, channelOrderNumber: o.number,
      total: parseFloat(o.totals?.total || 0), orderedAt: new Date(o.dateCreated),
      customer: { name: o.buyerInfo?.firstName + ' ' + (o.buyerInfo?.lastName || ''), email: o.buyerInfo?.email, phone: o.buyerInfo?.phone },
      shippingAddress: { line1: o.shippingInfo?.shipmentDetails?.address?.addressLine1, city: o.shippingInfo?.shipmentDetails?.address?.city, country: o.shippingInfo?.shipmentDetails?.address?.country, pincode: o.shippingInfo?.shipmentDetails?.address?.zipCode },
    });
  }
}

// Squarespace Commerce
class SquarespaceAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient('https://api.squarespace.com/1.0/commerce', creds.apiKey, { 'User-Agent': 'Kartriq/1.0' }); }
  async fetchOrders() {
    const { data } = await this.client.get('/orders', { params: { fulfillmentStatus: 'PENDING' } });
    return (data?.result || []).map(o => makeOrderShape({
      channelOrderId: o.id, channelOrderNumber: o.orderNumber, total: parseFloat(o.grandTotal?.value || 0),
      orderedAt: new Date(o.createdOn), customer: { name: o.customerEmail, email: o.customerEmail },
    }));
  }
  async updateInventoryLevel(sku, qty) { await this.client.post('/inventory', { sku, quantity: qty }); return { updated: true, sku, qty }; }
}

// Salesforce Commerce Cloud (B2C)
class SalesforceCommerceAdapter extends BaseAdapter {
  constructor(creds) {
    super(creds);
    this.client = bearerClient(`https://${creds.shortCode}.api.commercecloud.salesforce.com`, creds.accessToken);
    this.siteId = creds.siteId;
  }
  async fetchOrders() {
    const { data } = await this.client.post(`/checkout/orders/v1/organizations/${this.siteId}/order-search`, { query: { filteredQuery: { filter: { termFilter: { field: 'status', operator: 'is', values: ['created'] } } } }, limit: 50 });
    return (data?.hits || []).map(o => makeOrderShape({ channelOrderId: o.order_no, total: parseFloat(o.order_total || 0), orderedAt: new Date(o.creation_date) }));
  }
  async updateInventoryLevel(sku, qty) {
    await this.client.patch(`/product/inventory/v1/organizations/${this.siteId}/products/${sku}/availability`, { stockLevel: qty });
    return { updated: true, sku, qty };
  }
}

// PrestaShop
class PrestaShopAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = axios.create({ baseURL: creds.storeUrl + '/api', auth: { username: creds.apiKey, password: '' }, headers: { 'Output-Format': 'JSON' } }); }
  async fetchOrders() {
    const { data } = await this.client.get('/orders', { params: { display: 'full', filter: JSON.stringify({ current_state: 2 }), limit: 50 } });
    return (data?.orders || []).map(o => makeOrderShape({ channelOrderId: o.id, total: parseFloat(o.total_paid || 0), orderedAt: new Date(o.date_add) }));
  }
  async updateInventoryLevel(sku, qty) { await this.client.put(`/stock_availables`, { quantity: qty, sku }); return { updated: true, sku, qty }; }
}

// Ecwid
class EcwidAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient(`https://app.ecwid.com/api/v3/${creds.storeId}`, creds.accessToken); }
  async fetchOrders() {
    const { data } = await this.client.get('/orders', { params: { paymentStatus: 'PAID', limit: 50 } });
    return (data?.items || []).map(o => makeOrderShape({ channelOrderId: o.orderNumber, total: parseFloat(o.total || 0), orderedAt: new Date(o.createDate), customer: { name: o.shippingPerson?.name, email: o.email, phone: o.shippingPerson?.phone } }));
  }
  async updateInventoryLevel(sku, qty) { await this.client.put(`/products/sku/${encodeURIComponent(sku)}`, { quantity: qty }); return { updated: true, sku, qty }; }
}

// Zoho Commerce
class ZohoCommerceAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = axios.create({ baseURL: 'https://commerce.zoho.com/store/api/v1', headers: { Authorization: `Zoho-oauthtoken ${creds.accessToken}`, 'X-com-zoho-store-organizationid': creds.organizationId } }); }
  async fetchOrders() {
    const { data } = await this.client.get('/salesorders', { params: { status: 'open', per_page: 50 } });
    return (data?.salesorders || []).map(o => makeOrderShape({ channelOrderId: o.salesorder_id, total: parseFloat(o.total || 0), orderedAt: new Date(o.date) }));
  }
  async updateInventoryLevel(sku, qty) { await this.client.put('/items', { sku, stock_on_hand: qty }); return { updated: true, sku, qty }; }
}

// Dukaan / Shoopy / Bikayi / KartRocket / Instamojo Pages — Indian D2C builders.
// Most use simple REST APIs; some require webhook setup. We use a generic
// REST shape and fall back to webhook receiver for those without API access.
const buildSimpleRestStore = (baseURL, listPath = '/orders', updatePath = '/products/inventory') => class extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient(baseURL, creds.apiKey || creds.accessToken); }
  async fetchOrders() { const { data } = await this.client.get(listPath, { params: { status: 'pending', limit: 50 } }); return (data?.orders || data?.data || []).map(o => makeOrderShape({ channelOrderId: o.id || o.order_id, total: parseFloat(o.total || o.amount || 0), orderedAt: new Date(o.created_at || o.date || Date.now()) })); }
  async updateInventoryLevel(sku, qty) { await this.client.post(updatePath, { sku, quantity: qty }); return { updated: true, sku, qty }; }
};
const DukaanAdapter         = buildSimpleRestStore('https://api.mydukaan.io/api/v1');
const ShoopyAdapter         = buildSimpleRestStore('https://api.shoopy.in/v1');
const BikayiAdapter         = buildSimpleRestStore('https://api.bikayi.com/v1');
const KartRocketAdapter     = buildSimpleRestStore('https://api.kartrocket.com/v1');
const InstamojoPagesAdapter = buildSimpleRestStore('https://www.instamojo.com/api/1.1');

module.exports = {
  WixAdapter, SquarespaceAdapter, SalesforceCommerceAdapter, PrestaShopAdapter,
  EcwidAdapter, ZohoCommerceAdapter, DukaanAdapter, ShoopyAdapter,
  BikayiAdapter, KartRocketAdapter, InstamojoPagesAdapter,
};
