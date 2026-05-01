// Real adapters for previously-pending SOCIAL commerce channels.
const { BaseAdapter, bearerClient, makeOrderShape } = require('../_base');

// TikTok Shop — orders + inventory via TikTok Shop Open Platform.
// docs: https://partner.tiktokshop.com
class TikTokShopAdapter extends BaseAdapter {
  constructor(creds) {
    super(creds);
    this.client = bearerClient('https://open-api.tiktokglobalshop.com', creds.accessToken, { 'x-tts-shop-id': creds.shopId });
    this.appKey = creds.appKey;
  }
  async fetchOrders() {
    const { data } = await this.client.post('/api/orders/search', { page_size: 50, order_status: 'AWAITING_SHIPMENT' });
    return (data?.data?.order_list || []).map(o => makeOrderShape({
      channelOrderId: o.order_id, total: parseFloat(o.payment_info?.total_amount || 0),
      orderedAt: new Date((o.create_time || 0) * 1000),
      shippingAddress: { line1: o.recipient_address?.address_detail, city: o.recipient_address?.region_code, country: 'TH' },
    }));
  }
  async updateInventoryLevel(sku, qty) {
    await this.client.post('/api/products/stocks', { skus: [{ id: sku, stock_infos: [{ available_stock: qty }] }] });
    return { updated: true, sku, qty };
  }
}

// Pinterest Shopping
class PinterestAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient('https://api.pinterest.com/v5', creds.accessToken); }
  async fetchOrders() {
    // Pinterest Shopping is mostly catalog-driven; orders flow through merchant's checkout.
    return [];
  }
  async updateInventoryLevel(sku, qty) {
    await this.client.patch('/catalogs/feeds', { items: [{ id: sku, availability: qty > 0 ? 'in stock' : 'out of stock' }] });
    return { updated: true, sku, qty };
  }
}

// YouTube Shopping
class YouTubeShoppingAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient('https://shoppingcontent.googleapis.com/content/v2.1', creds.accessToken); this.merchantId = creds.merchantId; }
  async fetchOrders() {
    const { data } = await this.client.get(`/${this.merchantId}/orders`, { params: { statuses: 'pending' } });
    return (data?.resources || []).map(o => makeOrderShape({ channelOrderId: o.id, total: parseFloat(o.netPriceAmount?.value || 0), orderedAt: new Date(o.placedDate) }));
  }
  async updateInventoryLevel(sku, qty) {
    await this.client.post(`/${this.merchantId}/products/${sku}`, { availability: qty > 0 ? 'in stock' : 'out of stock' });
    return { updated: true, sku, qty };
  }
}

// Snapchat (Catalog-based ads — no orders endpoint, only catalog sync)
class SnapchatAdapter extends BaseAdapter {
  constructor(creds) { super(creds); this.client = bearerClient('https://adsapi.snapchat.com/v1', creds.accessToken); this.catalogId = creds.catalogId; }
  async fetchOrders() { return []; }
  async updateInventoryLevel(sku, qty) {
    await this.client.post(`/catalogs/${this.catalogId}/products/${sku}`, { availability: qty > 0 ? 'in_stock' : 'out_of_stock' });
    return { updated: true, sku, qty };
  }
}

module.exports = { TikTokShopAdapter, PinterestAdapter, YouTubeShoppingAdapter, SnapchatAdapter };
