const axios = require('axios');

// BigCommerce API v2/v3
// Credentials: { storeHash, accessToken }
// Docs: https://developer.bigcommerce.com/docs/rest-management

class BigCommerceAdapter {
  constructor(credentials) {
    this.storeHash = credentials.storeHash;
    this.base = `https://api.bigcommerce.com/stores/${credentials.storeHash}`;
    this.headers = {
      'X-Auth-Token': credentials.accessToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  async testConnection() {
    const { data } = await axios.get(`${this.base}/v2/store`, { headers: this.headers });
    return { success: true, storeName: data.name, domain: data.domain };
  }

  async fetchOrders(sinceDate) {
    const params = { status_id: 11, limit: 50, page: 1 }; // 11 = Awaiting Fulfillment
    if (sinceDate) params.min_date_created = sinceDate;
    const all = [];
    while (true) {
      const { data } = await axios.get(`${this.base}/v2/orders`, { headers: this.headers, params });
      const orders = Array.isArray(data) ? data : [];
      all.push(...orders);
      if (orders.length < params.limit) break;
      params.page++;
    }

    // Fetch products + shipping for each order
    const results = [];
    for (const o of all) {
      const [products, shippingAddresses] = await Promise.all([
        axios.get(`${this.base}/v2/orders/${o.id}/products`, { headers: this.headers }).then(r => r.data).catch(() => []),
        axios.get(`${this.base}/v2/orders/${o.id}/shipping_addresses`, { headers: this.headers }).then(r => r.data).catch(() => []),
      ]);
      results.push(this._transformOrder(o, products, shippingAddresses[0] || {}));
    }
    return results;
  }

  async updateListing(sku, fields) {
    const { data } = await axios.get(`${this.base}/v3/catalog/variants`, {
      headers: this.headers,
      params: { sku },
    });
    const variant = data.data?.[0];
    if (!variant) throw new Error(`BigCommerce: variant with SKU ${sku} not found`);
    const variantPayload = {};
    if (fields.price !== undefined) variantPayload.price = fields.price;
    if (fields.mrp !== undefined) variantPayload.retail_price = fields.mrp;
    if (fields.qty !== undefined) variantPayload.inventory_level = fields.qty;
    if (Object.keys(variantPayload).length) {
      await axios.put(
        `${this.base}/v3/catalog/products/${variant.product_id}/variants/${variant.id}`,
        variantPayload,
        { headers: this.headers }
      );
    }
    const productPayload = {};
    if (fields.title) productPayload.name = fields.title;
    if (fields.description) productPayload.description = fields.description;
    if (fields.images) productPayload.images = fields.images.map(url => ({ image_url: url }));
    if (Object.keys(productPayload).length) {
      await axios.put(
        `${this.base}/v3/catalog/products/${variant.product_id}`,
        productPayload,
        { headers: this.headers }
      );
    }
    return { channel: 'BIGCOMMERCE', sku };
  }

  async updateInventoryLevel(sku, quantity) {
    // v3: need product/variant ID. For simplicity, look up by SKU
    const { data } = await axios.get(`${this.base}/v3/catalog/variants`, {
      headers: this.headers,
      params: { sku },
    });
    const variant = data.data?.[0];
    if (!variant) throw new Error(`No variant found for SKU ${sku}`);
    await axios.put(
      `${this.base}/v3/catalog/products/${variant.product_id}/variants/${variant.id}`,
      { inventory_level: quantity },
      { headers: this.headers }
    );
    return { updated: true, sku, quantity };
  }

  _transformOrder(o, products, ship) {
    return {
      channelOrderId: String(o.id),
      channelOrderNumber: String(o.id),
      customer: {
        name: `${o.billing_address?.first_name || ''} ${o.billing_address?.last_name || ''}`.trim(),
        email: o.billing_address?.email || null,
        phone: o.billing_address?.phone || null,
      },
      shippingAddress: {
        line1: ship.street_1 || '',
        line2: ship.street_2 || '',
        city: ship.city || '',
        state: ship.state || '',
        pincode: ship.zip || '',
        country: ship.country_iso2 || '',
      },
      items: products.map(p => ({
        channelSku: p.sku,
        name: p.name,
        qty: p.quantity,
        unitPrice: parseFloat(p.price_inc_tax || 0),
        discount: 0,
        tax: parseFloat(p.total_tax || 0),
      })),
      subtotal: parseFloat(o.subtotal_inc_tax || 0),
      shippingCharge: parseFloat(o.shipping_cost_inc_tax || 0),
      tax: parseFloat(o.total_tax || 0),
      total: parseFloat(o.total_inc_tax || 0),
      discount: parseFloat(o.discount_amount || 0),
      paymentMethod: o.payment_method || 'BigCommerce',
      paymentStatus: o.payment_status === 'captured' ? 'PAID' : 'PENDING',
      status: 'PENDING',
      orderedAt: new Date(o.date_created || Date.now()),
    };
  }
}

module.exports = BigCommerceAdapter;
