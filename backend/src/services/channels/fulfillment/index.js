// Fulfillment / 3PL adapters.
// Primary methods: createFulfillment, syncStock, fetchInventory.

const { BaseAdapter, bearerClient } = require('../_base');
const axios = require('axios');

class FulfillmentBase extends BaseAdapter {
  async fetchOrders() { return []; }
  async updateInventoryLevel() { return { success: true, skipped: true, reason: '3PL fulfillment — push via createFulfillment' }; }
}

// Amazon FBA — uses SP-API FBA Inventory & Fulfillment endpoints.
const AmazonAdapter = require('../ecom/amazon');
class AmazonFbaAdapter extends AmazonAdapter {
  async fetchOrders() { return []; }
  async fetchInventory() {
    // Uses FBA Inventory API
    const { data } = await this.client.get('/fba/inventory/v1/summaries', { params: { granularityType: 'Marketplace', granularityId: 'A21TJRUUN4KGV', marketplaceIds: 'A21TJRUUN4KGV' } });
    return data?.payload?.inventorySummaries || [];
  }
  async createFulfillment(order) {
    const { data } = await this.client.post('/fba/outbound/2020-07-01/fulfillmentOrders', {
      sellerFulfillmentOrderId: order.orderId,
      displayableOrderId: order.orderNumber,
      displayableOrderDate: new Date().toISOString(),
      shippingSpeedCategory: 'Standard',
      destinationAddress: order.shipAddress,
      items: order.items,
    });
    return { fulfillmentId: data?.payload?.fulfillmentOrderId, raw: data };
  }
}

// Flipkart Smart Fulfillment
const FlipkartAdapter = require('../ecom/flipkart');
class FlipkartSmartFulfillmentAdapter extends FlipkartAdapter {
  async createFulfillment(order) {
    const { data } = await this.client.post('/sellers/listings/v3/fulfillment/sf/orders', { orderId: order.orderId, items: order.items });
    return { fulfillmentId: data?.fulfillment_id, raw: data };
  }
}

// WareIQ
class WareIQAdapter extends FulfillmentBase {
  constructor(creds) { super(creds); this.client = bearerClient('https://api.wareiq.com/v1', creds.apiKey); }
  async createFulfillment(order) {
    const { data } = await this.client.post('/fulfillment-orders', order);
    return { fulfillmentId: data?.id, raw: data };
  }
  async fetchInventory() {
    const { data } = await this.client.get('/inventory');
    return data?.items || [];
  }
}

// LogiNext
class LogiNextAdapter extends FulfillmentBase {
  constructor(creds) { super(creds); this.client = bearerClient('https://api.loginextsolutions.com/Track/v2', creds.apiKey, { 'X-Account-Id': creds.accountId }); }
  async createFulfillment(order) {
    const { data } = await this.client.post('/orders', order);
    return { fulfillmentId: data?.orderId, raw: data };
  }
}

// Holisol Logistics
class HolisolAdapter extends FulfillmentBase {
  constructor(creds) { super(creds); this.client = bearerClient('https://api.holisollogistics.com/v1', creds.apiKey); }
  async createFulfillment(order) {
    const { data } = await this.client.post('/orders', order);
    return { fulfillmentId: data?.id, raw: data };
  }
  async fetchInventory() {
    const { data } = await this.client.get('/inventory');
    return data?.inventory || [];
  }
}

module.exports = { AmazonFbaAdapter, FlipkartSmartFulfillmentAdapter, WareIQAdapter, LogiNextAdapter, HolisolAdapter };
