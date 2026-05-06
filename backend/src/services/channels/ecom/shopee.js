const axios = require('axios');
const crypto = require('crypto');
const settings = require('../../settings.service');
const { makeOrderShape } = require('../_base');
const { getEndpoint } = require('../../../config/channel-endpoints');

// Shopee Open Platform adapter — multi-region (SG/MY/TH/ID/VN/PH/TW/BR/MX/CO/CL/PL).
//
// Auth model — founder-app OAuth:
//   1. Kartriq registers a Shopee Open Platform app at https://open.shopee.com
//      and receives partner_id + partner_key. These are stored once, platform-
//      wide, in settings.service under shopee.partnerId / shopee.partnerKey.
//   2. Seller (tenant) is sent to /shop/auth_partner with a signed link, logs
//      in, picks a shop, and Shopee redirects back with code + shop_id. We
//      exchange the code for access_token + refresh_token via /auth/token/get.
//   3. Every shop-scoped call signs a canonical string with partner_key.
//
// Per-tenant credentials shape (encrypted on the channel row):
//   { accessToken, refreshToken, shopId, region,
//     expiresAt?, refreshExpiresAt? }
//
// Docs:
//   https://open.shopee.com/documents?module=63&type=2&id=51    (Auth)
//   https://open.shopee.com/documents?module=94&type=1&id=560   (Order)

// Shopee unified all SEA regions onto partner.shopeemobile.com; LATAM/PL
// ride the same host today. CHANNEL_MODE in .env flips between production
// and sandbox (partner.test-stable.shopeemobile.com).
const HOST = getEndpoint('SHOPEE');

// Shopee Seller Center login origin per market — used as the `redirect`
// parameter target the seller is bounced back to after authorization. We
// keep this for documentation; the adapter itself only talks to the API host.
const REGION_NAMES = {
  SG: 'Singapore',
  MY: 'Malaysia',
  TH: 'Thailand',
  ID: 'Indonesia',
  VN: 'Vietnam',
  PH: 'Philippines',
  TW: 'Taiwan',
  BR: 'Brazil',
  MX: 'Mexico',
  CO: 'Colombia',
  CL: 'Chile',
  PL: 'Poland',
};

// Sign string for shop-scoped APIs:
//   partner_id + path + timestamp + access_token + shop_id
// HMAC-SHA256 (partner_key as key) → lowercase hex.
function signShop(partnerId, path, timestamp, partnerKey, accessToken, shopId) {
  const baseString = `${partnerId}${path}${timestamp}${accessToken}${shopId}`;
  return crypto.createHmac('sha256', partnerKey).update(baseString).digest('hex');
}

// Sign string for public (no-token) APIs (e.g. auth_partner, token/get,
// token/refresh): partner_id + path + timestamp.
function signPublic(partnerId, path, timestamp, partnerKey) {
  return crypto.createHmac('sha256', partnerKey).update(`${partnerId}${path}${timestamp}`).digest('hex');
}

class ShopeeAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
    this.region = credentials.region || 'SG';
    this.shopId = credentials.shopId;
    this.host = HOST;
  }

  async _getAppCredentials() {
    const partnerId  = this.creds.partnerId  || (await settings.get('shopee.partnerId'));
    const partnerKey = this.creds.partnerKey || (await settings.get('shopee.partnerKey'));
    if (!partnerId || !partnerKey) {
      throw new Error('Shopee app not configured. Set shopee.partnerId and shopee.partnerKey in Admin → Settings.');
    }
    return { partnerId: Number(partnerId), partnerKey };
  }

  async _shopRequest({ method = 'GET', path, params = {}, body = null }) {
    if (!this.creds.accessToken || !this.shopId) {
      throw new Error('Not authorised — run the Shopee OAuth flow first.');
    }
    const { partnerId, partnerKey } = await this._getAppCredentials();
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = signShop(partnerId, path, timestamp, partnerKey, this.creds.accessToken, this.shopId);

    const queryParams = {
      partner_id: partnerId,
      timestamp,
      access_token: this.creds.accessToken,
      shop_id: Number(this.shopId),
      sign,
      ...params,
    };

    const resp = await axios({
      method,
      url: `${this.host}${path}`,
      params: queryParams,
      data: body,
      headers: { 'Content-Type': 'application/json' },
    });
    if (resp.data?.error) {
      const err = new Error(resp.data.message || resp.data.error);
      err.shopeeError = resp.data.error;
      throw err;
    }
    return resp.data;
  }

  async testConnection() {
    if (!this.creds.accessToken || !this.shopId) {
      return { success: false, error: 'Not authorised yet — run the Shopee OAuth flow first.' };
    }
    try {
      const data = await this._shopRequest({ path: '/api/v2/shop/get_shop_info' });
      return {
        success: true,
        region: data?.region || this.region,
        shopId: this.shopId,
        shopName: data?.shop_name,
        status: data?.status,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  async fetchOrders(sinceDate) {
    const tsNow = Math.floor(Date.now() / 1000);
    const since = sinceDate ? Math.floor(new Date(sinceDate).getTime() / 1000) : tsNow - 7 * 24 * 60 * 60;
    const all = [];
    let cursor = '';
    let safety = 0;

    while (++safety < 50) {
      const params = {
        time_range_field: 'create_time',
        time_from: since,
        time_to: tsNow,
        page_size: 50,
        cursor,
        order_status: 'READY_TO_SHIP',
      };
      const data = await this._shopRequest({ path: '/api/v2/order/get_order_list', params });
      const list = data?.response?.order_list || [];
      all.push(...list);
      const more = data?.response?.more;
      cursor = data?.response?.next_cursor || '';
      if (!more || !cursor) break;
    }

    if (all.length === 0) return [];

    // Hydrate detail (Shopee's get_order_list returns order_sn only; we need
    // get_order_detail for line items, address, totals).
    const detail = await this._shopRequest({
      path: '/api/v2/order/get_order_detail',
      params: {
        order_sn_list: all.map((o) => o.order_sn).join(','),
        response_optional_fields: 'buyer_user_id,buyer_username,recipient_address,item_list,total_amount,payment_method,order_status,create_time',
      },
    });
    const orders = detail?.response?.order_list || [];
    return orders.map((o) => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, qty) {
    // Shopee inventory is keyed by item_id + model_id, not SKU. Sellers must
    // map their internal SKU → Shopee item_id. We expect creds.skuMap to be
    // a JSON map { sku: { itemId, modelId? } } if present; otherwise fall
    // back to treating `sku` as item_id directly.
    const mapping = (this.creds.skuMap && this.creds.skuMap[sku]) || null;
    const itemId = mapping?.itemId ?? Number(sku);
    if (!itemId || Number.isNaN(itemId)) {
      throw new Error(`Cannot resolve Shopee item_id for SKU ${sku}. Add a skuMap entry on the channel.`);
    }
    const stockList = [{ stock_list: [{ stock_type: 1, normal_stock: parseInt(qty, 10) || 0 }] }];
    if (mapping?.modelId) {
      stockList[0].model_id = mapping.modelId;
    }
    await this._shopRequest({
      method: 'POST',
      path: '/api/v2/product/update_stock',
      body: { item_id: itemId, stock_list: stockList[0].stock_list },
    });
    return { updated: true, sku, qty, itemId };
  }

  // OAuth helpers — invoked from /api/v1/oauth/shopee/{start,callback}.
  async exchangeAuthCode(code, shopId) {
    const { partnerId, partnerKey } = await this._getAppCredentials();
    const path = '/api/v2/auth/token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = signPublic(partnerId, path, timestamp, partnerKey);
    const { data } = await axios.post(
      `${this.host}${path}`,
      { code, shop_id: Number(shopId), partner_id: partnerId },
      {
        params: { partner_id: partnerId, timestamp, sign },
        headers: { 'Content-Type': 'application/json' },
      }
    );
    if (data?.error) throw new Error(data.message || data.error);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expire_in || 0) * 1000,
    };
  }

  async refreshAccessToken() {
    if (!this.creds.refreshToken || !this.shopId) {
      throw new Error('Cannot refresh — refresh_token or shop_id missing.');
    }
    const { partnerId, partnerKey } = await this._getAppCredentials();
    const path = '/api/v2/auth/access_token/get';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = signPublic(partnerId, path, timestamp, partnerKey);
    const { data } = await axios.post(
      `${this.host}${path}`,
      { refresh_token: this.creds.refreshToken, partner_id: partnerId, shop_id: Number(this.shopId) },
      {
        params: { partner_id: partnerId, timestamp, sign },
        headers: { 'Content-Type': 'application/json' },
      }
    );
    if (data?.error) throw new Error(data.message || data.error);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expire_in || 0) * 1000,
    };
  }

  // Build the consent URL the seller's browser is redirected to.
  static async buildAuthorizeUrl(redirectUri) {
    const partnerId  = await settings.get('shopee.partnerId');
    const partnerKey = await settings.get('shopee.partnerKey');
    if (!partnerId || !partnerKey) throw new Error('shopee.partnerId / shopee.partnerKey not set in Admin → Settings.');
    const path = '/api/v2/shop/auth_partner';
    const timestamp = Math.floor(Date.now() / 1000);
    const sign = signPublic(Number(partnerId), path, timestamp, partnerKey);
    const params = new URLSearchParams({
      partner_id: String(partnerId),
      redirect: redirectUri,
      timestamp: String(timestamp),
      sign,
    });
    return `${HOST}${path}?${params.toString()}`;
  }

  _transformOrder(o) {
    const ship = o.recipient_address || {};
    return makeOrderShape({
      channelOrderId: o.order_sn,
      channelOrderNumber: o.order_sn,
      customer: {
        name: ship.name || o.buyer_username || 'Shopee Customer',
        phone: ship.phone || null,
      },
      shippingAddress: {
        line1: ship.full_address,
        city: ship.city,
        state: ship.state,
        pincode: ship.zipcode,
        country: ship.region || this.region,
      },
      items: (o.item_list || []).map((i) => ({
        channelSku: i.item_sku || i.model_sku || String(i.item_id),
        name: i.item_name,
        qty: parseInt(i.model_quantity_purchased || i.quantity_purchased || 1, 10),
        unitPrice: parseFloat(i.model_discounted_price || i.model_original_price || 0),
      })),
      total: parseFloat(o.total_amount || 0),
      paymentMethod: o.payment_method || 'Shopee',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date((o.create_time || Math.floor(Date.now() / 1000)) * 1000),
    });
  }
}

module.exports = ShopeeAdapter;
module.exports.HOST = HOST;
module.exports.REGION_NAMES = REGION_NAMES;
module.exports.signShop = signShop;
module.exports.signPublic = signPublic;
