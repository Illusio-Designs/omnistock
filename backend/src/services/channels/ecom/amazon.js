const axios = require('axios');
const settings = require('../../settings.service');

// Per-channel credentials (stored encrypted per tenant):
//   { sellerId, refreshToken, region: "IN" | "US" | "EU" }
//
// Global OAuth app credentials (configured via Admin → Settings → Amazon):
//   amazon.clientId, amazon.clientSecret
//
// For backwards compat, legacy channels that stored clientId/clientSecret
// per tenant still work — per-tenant values win over platform settings.
// Docs: https://developer-docs.amazon.com/sp-api/

const ENDPOINTS = {
  IN: 'https://sellingpartnerapi-eu.amazon.com',
  US: 'https://sellingpartnerapi-na.amazon.com',
  EU: 'https://sellingpartnerapi-eu.amazon.com',
};

const LWA_URL = 'https://api.amazon.com/auth/o2/token';

async function getAppCredentials(creds) {
  const clientId     = creds.clientId     || (await settings.get('amazon.clientId'));
  const clientSecret = creds.clientSecret || (await settings.get('amazon.clientSecret'));
  if (!clientId || !clientSecret) {
    throw new Error('Amazon OAuth app not configured. Set amazon.clientId and amazon.clientSecret in Admin → Settings.');
  }
  return { clientId, clientSecret };
}

class AmazonAdapter {
  constructor(credentials) {
    this.creds = credentials;
    this.endpoint = ENDPOINTS[credentials.region || 'IN'];
    this._accessToken = null;
    this._tokenExpiry = null;
  }

  async _getAccessToken() {
    if (this._accessToken && this._tokenExpiry > Date.now()) {
      return this._accessToken;
    }
    const { clientId, clientSecret } = await getAppCredentials(this.creds);
    const { data } = await axios.post(LWA_URL, {
      grant_type: 'refresh_token',
      refresh_token: this.creds.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });
    this._accessToken = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this._accessToken;
  }

  async _request(method, path, params = {}) {
    const token = await this._getAccessToken();
    const { data } = await axios({
      method,
      url: `${this.endpoint}${path}`,
      headers: { 'x-amz-access-token': token, 'Content-Type': 'application/json' },
      params,
    });
    return data;
  }

  async testConnection() {
    const data = await this._request('GET', '/sellers/v1/marketplaceParticipations');
    const participations = data.payload || [];
    return { success: true, marketplaces: participations.map(p => p.marketplace?.name) };
  }

  async fetchOrders(sinceDate) {
    const params = {
      MarketplaceIds: 'A21TJRUUN4KGV', // Amazon.in marketplace ID
      OrderStatuses: 'Unshipped,PartiallyShipped,Shipped,Pending',
    };
    if (sinceDate) params.CreatedAfter = sinceDate;
    const data = await this._request('GET', '/orders/v0/orders', params);
    const orders = data.payload?.Orders || [];
    return orders.map(o => this._transformOrder(o));
  }

  // Amazon SP-API Solicitations: request product review & seller feedback
  // Sends the "Request a Review" button action programmatically.
  // Can only be called between 5 and 30 days after delivery.
  // Docs: https://developer-docs.amazon.com/sp-api/docs/solicitations-api-v1-reference
  async requestReview(amazonOrderId) {
    const token = await this._getAccessToken();
    const { data } = await axios.post(
      `${this.endpoint}/solicitations/v1/orders/${amazonOrderId}/solicitations/productReviewAndSellerFeedback`,
      {},
      {
        headers: { 'x-amz-access-token': token, 'Content-Type': 'application/json' },
        params: { marketplaceIds: 'A21TJRUUN4KGV' },
      }
    );
    return { channel: 'AMAZON', orderId: amazonOrderId, response: data };
  }

  // Amazon SP-API Listings Items — partial update of an existing listing
  // fields: { price?, qty?, title?, description?, images? }
  async updateListing(sku, fields) {
    const token = await this._getAccessToken();
    const patches = [];
    if (fields.title !== undefined)
      patches.push({ op: 'replace', path: '/attributes/item_name', value: [{ value: fields.title }] });
    if (fields.description !== undefined)
      patches.push({ op: 'replace', path: '/attributes/product_description', value: [{ value: fields.description }] });
    if (fields.price !== undefined)
      patches.push({
        op: 'replace',
        path: '/attributes/purchasable_offer',
        value: [{ our_price: [{ schedule: [{ value_with_tax: fields.price }] }] }],
      });
    if (fields.qty !== undefined)
      patches.push({
        op: 'replace',
        path: '/attributes/fulfillment_availability',
        value: [{ fulfillment_channel_code: 'DEFAULT', quantity: fields.qty }],
      });
    if (fields.images !== undefined)
      patches.push({
        op: 'replace',
        path: '/attributes/main_product_image_locator',
        value: (fields.images || []).map(url => ({ media_location: url })),
      });

    const { data } = await axios.patch(
      `${this.endpoint}/listings/2021-08-01/items/${this.creds.sellerId}/${encodeURIComponent(sku)}`,
      { productType: 'PRODUCT', patches },
      {
        headers: { 'x-amz-access-token': token, 'Content-Type': 'application/json' },
        params: { marketplaceIds: 'A21TJRUUN4KGV' },
      }
    );
    return { channel: 'AMAZON', sku, submissionId: data.submissionId, status: data.status };
  }

  async updateInventoryLevel(sku, quantity) {
    // Amazon inventory updates go through Feeds API (FBA) or through
    // Listings API for MFN sellers. This requires additional setup.
    // See: https://developer-docs.amazon.com/sp-api/docs/feeds-api-v2021-06-30-reference
    throw new Error('Amazon inventory sync requires Feeds API setup. Please update stock via Seller Central or use the Listings API.');
  }

  _transformOrder(o) {
    return {
      channelOrderId: o.AmazonOrderId,
      channelOrderNumber: o.AmazonOrderId,
      customer: {
        name: o.BuyerInfo?.BuyerName || 'Amazon Customer',
        email: o.BuyerInfo?.BuyerEmail,
        phone: null,
      },
      shippingAddress: {
        line1: o.ShippingAddress?.AddressLine1,
        line2: o.ShippingAddress?.AddressLine2,
        city: o.ShippingAddress?.City,
        state: o.ShippingAddress?.StateOrRegion,
        pincode: o.ShippingAddress?.PostalCode,
        country: o.ShippingAddress?.CountryCode,
      },
      items: [], // Requires separate call to getOrderItems endpoint
      subtotal: parseFloat(o.OrderTotal?.Amount || 0),
      shippingCharge: 0,
      tax: 0,
      total: parseFloat(o.OrderTotal?.Amount || 0),
      discount: 0,
      paymentMethod: o.PaymentMethod,
      paymentStatus: o.PaymentExecutionDetail ? 'PAID' : 'PENDING',
      status: o.OrderStatus === 'Shipped' ? 'SHIPPED' : 'PENDING',
      orderedAt: new Date(o.PurchaseDate),
      // Fulfillment model: AFN = Amazon FBA, MFN = Merchant Fulfilled
      fulfillment_channel: o.FulfillmentChannel,
      fulfillmentCenter: o.ShippingAddress?.CountryCode
        ? `${o.FulfillmentChannel}-${o.ShippingAddress?.StateOrRegion || ''}`
        : null,
      // FBA orders ship with AWB already assigned
      awb: o.ShipmentServiceLevelCategory || null,
      trackingUrl: o.AmazonOrderId ? `https://www.amazon.in/gp/your-account/order-details?orderID=${o.AmazonOrderId}` : null,
    };
  }
}

module.exports = AmazonAdapter;
