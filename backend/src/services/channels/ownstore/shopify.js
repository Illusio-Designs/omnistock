const axios = require('axios');

// Credentials shape: { shopUrl: "mystore.myshopify.com", accessToken: "shpat_xxx" }

class ShopifyAdapter {
  constructor(credentials) {
    this.client = axios.create({
      baseURL: `https://${credentials.shopUrl}/admin/api/2024-01`,
      headers: {
        'X-Shopify-Access-Token': credentials.accessToken,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/shop.json');
    return { success: true, name: data.shop.name, domain: data.shop.domain };
  }

  async fetchOrders(sinceDate) {
    const params = { status: 'any', limit: 250 };
    if (sinceDate) params.created_at_min = sinceDate;
    const { data } = await this.client.get('/orders.json', { params });
    return data.orders.map(o => this._transformOrder(o));
  }

  // Shopify — partial product update. Finds variant by SKU then PUTs changes.
  async updateListing(sku, fields) {
    const { data: search } = await this.client.get('/products.json', { params: { limit: 250 } });
    for (const product of search.products) {
      for (const variant of product.variants) {
        if (variant.sku !== sku) continue;
        const variantPayload = { id: variant.id };
        if (fields.price !== undefined) variantPayload.price = String(fields.price);
        if (fields.mrp !== undefined) variantPayload.compare_at_price = String(fields.mrp);
        if (fields.qty !== undefined) variantPayload.inventory_quantity = fields.qty;
        const productPayload = { id: product.id, variants: [variantPayload] };
        if (fields.title) productPayload.title = fields.title;
        if (fields.description) productPayload.body_html = fields.description;
        if (fields.images) productPayload.images = fields.images.map(src => ({ src }));
        const { data } = await this.client.put(`/products/${product.id}.json`, { product: productPayload });
        return { channel: 'SHOPIFY', sku, response: data };
      }
    }
    throw new Error(`Shopify: variant with SKU ${sku} not found`);
  }

  async updateInventoryLevel(sku, quantity) {
    // Look up variant by SKU
    const { data: vData } = await this.client.get('/variants.json', { params: { limit: 1 } });
    const { data: search } = await this.client.get(`/products.json?handle=${sku}`);
    // Use inventory_levels/set to push qty
    const { data: locData } = await this.client.get('/locations.json');
    const locationId = locData.locations[0]?.id;
    if (!locationId) return;

    // Find the inventory_item_id via variant search
    const { data: varData } = await this.client.get('/products.json', { params: { limit: 250 } });
    for (const product of varData.products) {
      for (const variant of product.variants) {
        if (variant.sku === sku) {
          await this.client.post('/inventory_levels/set.json', {
            inventory_item_id: variant.inventory_item_id,
            location_id: locationId,
            available: quantity,
          });
          return { updated: true, sku };
        }
      }
    }
    return { updated: false, reason: 'SKU not found' };
  }

  _transformOrder(o) {
    return {
      channelOrderId: String(o.id),
      channelOrderNumber: o.order_number,
      customer: {
        name: `${o.customer?.first_name || ''} ${o.customer?.last_name || ''}`.trim() || 'Guest',
        email: o.email || o.customer?.email,
        phone: o.phone || o.billing_address?.phone,
      },
      shippingAddress: o.shipping_address ? {
        line1: o.shipping_address.address1,
        line2: o.shipping_address.address2,
        city: o.shipping_address.city,
        state: o.shipping_address.province,
        pincode: o.shipping_address.zip,
        country: o.shipping_address.country,
      } : {},
      items: o.line_items.map(i => ({
        channelSku: i.sku,
        name: i.name,
        qty: i.quantity,
        unitPrice: parseFloat(i.price),
        discount: parseFloat(i.total_discount || 0) / Math.max(i.quantity, 1),
        tax: 0,
      })),
      subtotal: parseFloat(o.subtotal_price),
      shippingCharge: parseFloat(o.total_shipping_price_set?.shop_money?.amount || 0),
      tax: parseFloat(o.total_tax),
      total: parseFloat(o.total_price),
      discount: parseFloat(o.total_discounts || 0),
      paymentMethod: o.payment_gateway,
      paymentStatus: o.financial_status === 'paid' ? 'PAID' : 'PENDING',
      status: o.fulfillment_status === 'fulfilled' ? 'SHIPPED' : 'PENDING',
      orderedAt: new Date(o.created_at),
    };
  }
}

module.exports = ShopifyAdapter;
