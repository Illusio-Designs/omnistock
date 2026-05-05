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

// Per-region SP-API host + marketplace ID. Sources:
//   https://developer-docs.amazon.com/sp-api/docs/sp-api-endpoints
//   https://developer-docs.amazon.com/sp-api/docs/marketplace-ids
const REGION_CONFIG = {
  IN: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'A21TJRUUN4KGV' },
  US: { endpoint: 'https://sellingpartnerapi-na.amazon.com', marketplaceId: 'ATVPDKIKX0DER' },
  CA: { endpoint: 'https://sellingpartnerapi-na.amazon.com', marketplaceId: 'A2EUQ1WTGCTBG2' },
  MX: { endpoint: 'https://sellingpartnerapi-na.amazon.com', marketplaceId: 'A1AM78C64UM0Y8' },
  BR: { endpoint: 'https://sellingpartnerapi-na.amazon.com', marketplaceId: 'A2Q3Y263D00KWC' },
  UK: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'A1F83G8C2ARO7P' },
  DE: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'A1PA6795UKMFR9' },
  FR: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'A13V1IB3VIYZZH' },
  IT: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'APJ6JRA9NG5V4'  },
  ES: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'A1RKKUPIHCS9HS' },
  NL: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'A1805IZSGTT6HS' },
  SE: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'A2NODRKZP88ZB9' },
  PL: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'A1C3SOZRARQ6R3' },
  TR: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'A33AVAJ2PDY3EV' },
  AE: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'A2VIGQ35RCS4UG' },
  SA: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'A17E79C6D8DWNP' },
  EG: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'ARBP9OOSHTCHU'  },
  ZA: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'AE08WJ6YKNBMC'  },
  JP: { endpoint: 'https://sellingpartnerapi-fe.amazon.com', marketplaceId: 'A1VC38T7YXB528' },
  AU: { endpoint: 'https://sellingpartnerapi-fe.amazon.com', marketplaceId: 'A39IBJ37TRP1C6' },
  SG: { endpoint: 'https://sellingpartnerapi-fe.amazon.com', marketplaceId: 'A19VAU5U5O7RUS' },
  // Legacy aliases — historic creds may pass region: 'EU' or 'NA'
  EU: { endpoint: 'https://sellingpartnerapi-eu.amazon.com', marketplaceId: 'A1F83G8C2ARO7P' },
  NA: { endpoint: 'https://sellingpartnerapi-na.amazon.com', marketplaceId: 'ATVPDKIKX0DER' },
};

const LWA_URL = 'https://api.amazon.com/auth/o2/token';

function getRegionConfig(region) {
  return REGION_CONFIG[region] || REGION_CONFIG.IN;
}

async function getAppCredentials(creds) {
  const clientId     = creds.clientId     || (await settings.get('amazon.clientId'));
  const clientSecret = creds.clientSecret || (await settings.get('amazon.clientSecret'));
  if (!clientId || !clientSecret) {
    throw new Error('Amazon OAuth app not configured. Set amazon.clientId and amazon.clientSecret in Admin → Settings.');
  }
  return { clientId, clientSecret };
}

// Sandbox endpoints serve mock data and accept Draft-state apps. Set
// `sandbox: true` in channel credentials (or pass amazon.sandbox=true in
// Admin → Settings) to test against them while the production app is still
// in Sandbox status on the Amazon Developer Console.
function toSandboxHost(prodEndpoint) {
  return prodEndpoint.replace('https://sellingpartnerapi-', 'https://sandbox.sellingpartnerapi-');
}

class AmazonAdapter {
  constructor(credentials) {
    this.creds = credentials || {};
    this.region = this.creds.region || 'IN';
    const cfg = getRegionConfig(this.region);
    this.sandbox = this.creds.sandbox === true
                || this.creds.sandbox === 'true'
                || String(this.creds.mode || '').toLowerCase() === 'sandbox';
    this.endpoint = this.sandbox ? toSandboxHost(cfg.endpoint) : cfg.endpoint;
    this.marketplaceId = cfg.marketplaceId;
    this._accessToken = null;
    this._tokenExpiry = null;
  }

  async _getAccessToken() {
    if (this._accessToken && this._tokenExpiry > Date.now()) {
      return this._accessToken;
    }
    if (!this.creds.refreshToken) {
      throw new Error('Amazon connection missing refreshToken — complete the seller OAuth flow first.');
    }
    const { clientId, clientSecret } = await getAppCredentials(this.creds);
    let data;
    try {
      ({ data } = await axios.post(LWA_URL, {
        grant_type: 'refresh_token',
        refresh_token: this.creds.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }));
    } catch (err) {
      const body = err.response?.data;
      const reason = body?.error_description || body?.error || err.message;
      throw new Error(`Amazon LWA token exchange failed (${err.response?.status || '?'}): ${reason}`);
    }
    this._accessToken = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this._accessToken;
  }

  async _request(method, path, params = {}) {
    const token = await this._getAccessToken();
    try {
      const { data } = await axios({
        method,
        url: `${this.endpoint}${path}`,
        headers: { 'x-amz-access-token': token, 'Content-Type': 'application/json' },
        params,
      });
      return data;
    } catch (err) {
      const status = err.response?.status;
      const body   = err.response?.data;
      // SP-API errors: { errors: [{ code, message, details }] }
      const apiMsg = body?.errors?.[0]?.message
                  || body?.errors?.[0]?.code
                  || body?.message
                  || err.message;
      const hint = status === 403
        ? ' — common causes: (1) the seller has not authorized this SP-API role, (2) the refresh token is from a different region than the configured endpoint, or (3) the app is in Draft state and not approved for this role on Amazon Developer Console.'
        : '';
      throw new Error(`Amazon SP-API ${method} ${path} failed (${status || '?'}): ${apiMsg}${hint}`);
    }
  }

  async testConnection() {
    const data = await this._request('GET', '/sellers/v1/marketplaceParticipations');
    const participations = data.payload || [];
    return { success: true, marketplaces: participations.map(p => p.marketplace?.name) };
  }

  async fetchOrders(sinceDate) {
    const params = {
      MarketplaceIds: this.marketplaceId,
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
        params: { marketplaceIds: this.marketplaceId },
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
        params: { marketplaceIds: this.marketplaceId },
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
