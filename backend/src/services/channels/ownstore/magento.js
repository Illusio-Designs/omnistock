const axios = require('axios');

// Magento / Adobe Commerce REST API
// Credentials: { baseUrl, accessToken }
// Docs: https://developer.adobe.com/commerce/webapi/rest/

class MagentoAdapter {
  constructor(credentials) {
    this.client = axios.create({
      baseURL: `${credentials.baseUrl.replace(/\/$/, '')}/rest/V1`,
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Content-Type': 'application/json',
      },
    });
  }

  async testConnection() {
    const { data } = await this.client.get('/store/storeConfigs');
    return { success: true, stores: data.length };
  }

  async fetchOrders(sinceDate) {
    const params = {
      'searchCriteria[filter_groups][0][filters][0][field]': 'status',
      'searchCriteria[filter_groups][0][filters][0][value]': 'pending',
      'searchCriteria[pageSize]': 50,
    };
    if (sinceDate) {
      params['searchCriteria[filter_groups][1][filters][0][field]'] = 'created_at';
      params['searchCriteria[filter_groups][1][filters][0][value]'] = sinceDate;
      params['searchCriteria[filter_groups][1][filters][0][condition_type]'] = 'gteq';
    }
    const { data } = await this.client.get('/orders', { params });
    return (data.items || []).map(o => this._transformOrder(o));
  }

  async updateListing(sku, fields) {
    const product = {};
    if (fields.title) product.name = fields.title;
    if (fields.price !== undefined) product.price = fields.price;
    if (fields.description) product.custom_attributes = [{ attribute_code: 'description', value: fields.description }];
    if (fields.qty !== undefined) product.extension_attributes = { stock_item: { qty: fields.qty, is_in_stock: fields.qty > 0 } };
    const { data } = await this.client.put(`/products/${encodeURIComponent(sku)}`, { product });
    return { channel: 'MAGENTO', sku, response: data };
  }

  async updateInventoryLevel(sku, quantity) {
    await this.client.put(`/products/${encodeURIComponent(sku)}/stockItems/1`, {
      stockItem: { qty: quantity, is_in_stock: quantity > 0 },
    });
    return { updated: true, sku, quantity };
  }

  _transformOrder(o) {
    const addr = o.billing_address || {};
    return {
      channelOrderId: String(o.entity_id),
      channelOrderNumber: o.increment_id,
      customer: {
        name: `${addr.firstname || ''} ${addr.lastname || ''}`.trim(),
        email: o.customer_email || null,
        phone: addr.telephone || null,
      },
      shippingAddress: {
        line1: addr.street?.[0] || '',
        line2: addr.street?.[1] || '',
        city: addr.city || '',
        state: addr.region || '',
        pincode: addr.postcode || '',
        country: addr.country_id || '',
      },
      items: (o.items || []).map(i => ({
        channelSku: i.sku,
        name: i.name,
        qty: i.qty_ordered,
        unitPrice: parseFloat(i.price || 0),
        discount: parseFloat(i.discount_amount || 0),
        tax: parseFloat(i.tax_amount || 0),
      })),
      subtotal: parseFloat(o.subtotal || 0),
      shippingCharge: parseFloat(o.shipping_amount || 0),
      tax: parseFloat(o.tax_amount || 0),
      total: parseFloat(o.grand_total || 0),
      discount: parseFloat(o.discount_amount || 0),
      paymentMethod: o.payment?.method || 'Magento',
      paymentStatus: o.status === 'complete' ? 'PAID' : 'PENDING',
      status: 'PENDING',
      orderedAt: new Date(o.created_at || Date.now()),
    };
  }
}

module.exports = MagentoAdapter;
