const axios = require('axios');

// eBay Sell API (OAuth 2.0)
// Credentials: { clientId, clientSecret, refreshToken }
// Docs: https://developer.ebay.com/docs

const BASE = 'https://api.ebay.com';

class EbayAdapter {
  constructor(credentials) {
    this.clientId = credentials.clientId;
    this.clientSecret = credentials.clientSecret;
    this.refreshToken = credentials.refreshToken;
    this._accessToken = null;
    this._tokenExpiry = 0;
  }

  async _getAccessToken() {
    if (this._accessToken && this._tokenExpiry > Date.now()) return this._accessToken;
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const { data } = await axios.post(
      `${BASE}/identity/v1/oauth2/token`,
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.fulfillment',
      }).toString(),
      { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    this._accessToken = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return this._accessToken;
  }

  async _req(method, path, payload = null, params = {}) {
    const token = await this._getAccessToken();
    const { data } = await axios({
      method,
      url: `${BASE}${path}`,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      params,
      data: payload,
    });
    return data;
  }

  async testConnection() {
    const data = await this._req('GET', '/sell/account/v1/privilege');
    return { success: true, sellerRegistered: data.sellerRegistrationCompleted };
  }

  async fetchOrders(sinceDate) {
    const params = { limit: 50 };
    if (sinceDate) params.filter = `creationdate:[${sinceDate}..]`;
    const data = await this._req('GET', '/sell/fulfillment/v1/order', null, params);
    return (data.orders || []).map(o => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, quantity) {
    await this._req('PUT', `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`, {
      availability: { shipToLocationAvailability: { quantity } },
    });
    return { updated: true, sku, quantity };
  }

  // eBay Sell Inventory API — update an inventory item + offer
  async updateListing(sku, fields) {
    const results = {};
    // Inventory item (qty, title, description, images)
    if (fields.qty !== undefined || fields.title || fields.description || fields.images) {
      const itemPayload = { product: {} };
      if (fields.title) itemPayload.product.title = fields.title;
      if (fields.description) itemPayload.product.description = fields.description;
      if (fields.images) itemPayload.product.imageUrls = fields.images;
      if (fields.qty !== undefined)
        itemPayload.availability = { shipToLocationAvailability: { quantity: fields.qty } };
      results.inventory = await this._req(
        'PUT',
        `/sell/inventory/v1/inventory_item/${encodeURIComponent(sku)}`,
        itemPayload
      );
    }
    // Price via offer update — needs offerId from listing lookup
    if (fields.price !== undefined) {
      const offers = await this._req('GET', '/sell/inventory/v1/offer', null, { sku });
      const offer = offers.offers?.[0];
      if (offer) {
        results.price = await this._req('PUT', `/sell/inventory/v1/offer/${offer.offerId}`, {
          pricingSummary: { price: { value: String(fields.price), currency: 'INR' } },
        });
      }
    }
    return { channel: 'EBAY', sku, ...results };
  }

  // eBay has no direct "request review" API for sellers — feedback flow
  // is initiated by the buyer. We post a best-effort note instead.
  async requestReview(orderId) {
    return {
      channel: 'EBAY',
      orderId,
      skipped: true,
      note: 'eBay feedback is buyer-initiated; no seller-triggered review API exists.',
    };
  }

  _transformOrder(o) {
    const lineItems = o.lineItems || [];
    const shipTo = o.fulfillmentStartInstructions?.[0]?.shippingStep?.shipTo || {};
    return {
      channelOrderId: String(o.orderId),
      channelOrderNumber: o.legacyOrderId || o.orderId,
      customer: {
        name: shipTo.fullName || o.buyer?.username || 'eBay Customer',
        email: o.buyer?.taxAddress?.email || null,
        phone: shipTo.primaryPhone?.phoneNumber || null,
      },
      shippingAddress: {
        line1: shipTo.contactAddress?.addressLine1 || '',
        line2: shipTo.contactAddress?.addressLine2 || '',
        city: shipTo.contactAddress?.city || '',
        state: shipTo.contactAddress?.stateOrProvince || '',
        pincode: shipTo.contactAddress?.postalCode || '',
        country: shipTo.contactAddress?.countryCode || '',
      },
      items: lineItems.map(i => ({
        channelSku: i.sku,
        name: i.title,
        qty: i.quantity,
        unitPrice: parseFloat(i.lineItemCost?.value || 0),
        discount: 0,
        tax: parseFloat(i.taxes?.[0]?.amount?.value || 0),
      })),
      subtotal: parseFloat(o.pricingSummary?.priceSubtotal?.value || 0),
      shippingCharge: parseFloat(o.pricingSummary?.deliveryCost?.value || 0),
      tax: parseFloat(o.pricingSummary?.tax?.value || 0),
      total: parseFloat(o.pricingSummary?.total?.value || 0),
      discount: parseFloat(o.pricingSummary?.priceDiscountSubtotal?.value || 0),
      paymentMethod: 'eBay',
      paymentStatus: o.orderPaymentStatus === 'PAID' ? 'PAID' : 'PENDING',
      status: 'PENDING',
      orderedAt: new Date(o.creationDate || Date.now()),
    };
  }
}

module.exports = EbayAdapter;
