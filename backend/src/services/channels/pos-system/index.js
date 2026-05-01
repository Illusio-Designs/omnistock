// POS system adapters (real, vs. the manual POS placeholder).
// These pull sales transactions ("orders") and push inventory updates.

const { BaseAdapter, bearerClient, makeOrderShape } = require('../_base');
const axios = require('axios');

// Shopify POS — same Admin API as Shopify channel; we filter to POS-source orders.
const ShopifyAdapter = require('../ownstore/shopify');
class ShopifyPosAdapter extends ShopifyAdapter {
  async fetchOrders(sinceDate) {
    const orders = await super.fetchOrders(sinceDate);
    return orders.filter(o => o.source_name === 'pos' || o.location_id);
  }
}

// Square POS
class SquarePosAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient('https://connect.squareup.com/v2', creds.accessToken, { 'Square-Version': '2024-01-18' }); this.locationId = creds.locationId; }
  async fetchOrders() {
    const { data } = await this.client.post('/orders/search', { location_ids: [this.locationId], query: { filter: { state_filter: { states: ['COMPLETED'] } } } });
    return (data?.orders || []).map(o => makeOrderShape({
      channelOrderId: o.id, total: parseFloat(o.total_money?.amount || 0) / 100,
      orderedAt: new Date(o.created_at), paymentMethod: 'Square POS',
      items: (o.line_items || []).map(li => ({ channelSku: li.catalog_object_id, name: li.name, qty: parseInt(li.quantity || 1, 10), unitPrice: parseFloat(li.base_price_money?.amount || 0) / 100 })),
    }));
  }
  async updateInventoryLevel(sku, qty) {
    await this.client.post('/inventory/changes/batch-create', { changes: [{ type: 'PHYSICAL_COUNT', physical_count: { catalog_object_id: sku, quantity: String(qty), location_id: this.locationId } }] });
    return { updated: true, sku, qty };
  }
}

// Lightspeed POS (Retail R-Series)
class LightspeedPosAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient(`https://api.lightspeedapp.com/API/V3/Account/${creds.accountId}`, creds.accessToken); }
  async fetchOrders() {
    const { data } = await this.client.get('/Sale.json', { params: { completed: true, limit: 50 } });
    return (data?.Sale || []).map(s => makeOrderShape({ channelOrderId: s.saleID, total: parseFloat(s.total || 0), orderedAt: new Date(s.timeStamp), paymentMethod: 'Lightspeed POS' }));
  }
  async updateInventoryLevel(sku, qty) { await this.client.put(`/Item.json?customSku=${encodeURIComponent(sku)}`, { Item: { quantity: qty } }); return { updated: true, sku, qty }; }
}

// LoyVerse POS
class LoyVersePosAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient('https://api.loyverse.com/v1.0', creds.accessToken); }
  async fetchOrders() {
    const { data } = await this.client.get('/receipts', { params: { limit: 50 } });
    return (data?.receipts || []).map(r => makeOrderShape({ channelOrderId: r.receipt_number, total: parseFloat(r.total_money || 0), orderedAt: new Date(r.created_at), paymentMethod: 'LoyVerse POS' }));
  }
  async updateInventoryLevel(sku, qty) { await this.client.post('/inventory', { stocks: [{ variant_id: sku, in_stock: qty }] }); return { updated: true, sku, qty }; }
}

// GoFrugal POS
class GoFrugalAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = axios.create({ baseURL: `${creds.serverUrl}/RayMedi_HQ/api/v1`, headers: { 'X-Auth-Token': creds.apiKey } }); }
  async fetchOrders() {
    const { data } = await this.client.get('/salesHeader', { params: { limit: 50 } });
    return (data?.salesHeader || []).map(s => makeOrderShape({ channelOrderId: s.billNo, total: parseFloat(s.netAmount || 0), orderedAt: new Date(s.billDate) }));
  }
  async updateInventoryLevel(sku, qty) { await this.client.post('/itemMaster/stockUpdate', { itemCode: sku, stock: qty }); return { updated: true, sku, qty }; }
}

// Posist (UrbanPiper)
class PosistAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient('https://api.posist.com/v1', creds.apiKey); }
  async fetchOrders() {
    const { data } = await this.client.get('/orders', { params: { status: 'completed' } });
    return (data?.orders || []).map(o => makeOrderShape({ channelOrderId: o.order_id, total: parseFloat(o.total || 0), orderedAt: new Date(o.created_at) }));
  }
  async updateInventoryLevel(sku, qty) { await this.client.post('/inventory/update', { item_id: sku, stock: qty }); return { updated: true, sku, qty }; }
}

// Petpooja
class PetpoojaAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient('https://api.petpooja.com/v1', creds.apiKey, { 'X-Restaurant-Id': creds.restaurantId }); }
  async fetchOrders() {
    const { data } = await this.client.get('/orders', { params: { status: 'completed' } });
    return (data?.orders || []).map(o => makeOrderShape({ channelOrderId: o.order_id, total: parseFloat(o.total || 0), orderedAt: new Date(o.order_time) }));
  }
  async updateInventoryLevel(sku, qty) { await this.client.post('/inventory', { item_id: sku, in_stock: qty }); return { updated: true, sku, qty }; }
}

// Vyapar
class VyaparAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient('https://vyaparapp.in/api/v1', creds.apiKey); }
  async fetchOrders() {
    const { data } = await this.client.get('/sale/list');
    return (data?.sales || []).map(s => makeOrderShape({ channelOrderId: s.id, total: parseFloat(s.total || 0), orderedAt: new Date(s.invoice_date) }));
  }
  async updateInventoryLevel(sku, qty) { await this.client.post('/items/stock', { item_code: sku, stock: qty }); return { updated: true, sku, qty }; }
}

// Zoho Inventory POS (uses Zoho Inventory REST)
class ZohoPosAdapter extends BaseAdapter {
  constructor(creds) {
    super(creds);
    this.client = axios.create({ baseURL: 'https://www.zohoapis.in/inventory/v1', headers: { Authorization: `Zoho-oauthtoken ${creds.accessToken}` } });
    this.organizationId = creds.organizationId;
  }
  async fetchOrders() {
    const { data } = await this.client.get('/salesorders', { params: { organization_id: this.organizationId, status: 'open' } });
    return (data?.salesorders || []).map(s => makeOrderShape({ channelOrderId: s.salesorder_id, total: parseFloat(s.total || 0), orderedAt: new Date(s.date) }));
  }
  async updateInventoryLevel(sku, qty) { await this.client.put('/items', { sku, stock_on_hand: qty }, { params: { organization_id: this.organizationId } }); return { updated: true, sku, qty }; }
}

module.exports = {
  ShopifyPosAdapter, SquarePosAdapter, LightspeedPosAdapter, LoyVersePosAdapter,
  GoFrugalAdapter, PosistAdapter, PetpoojaAdapter, VyaparAdapter, ZohoPosAdapter,
};
