const axios = require('axios');
const { makeOrderShape } = require('../_base');

// Rakuten Ichiba (Japan) adapter — Rakuten Merchant Server (RMS) API.
//
// Auth model — per-seller credentials (no founder app):
//   Each seller activates RMS and is issued a Service Secret + License Key
//   from the R-Login system. Both are combined into a single base64-encoded
//   value sent in the `Authorization: ESA <base64>` header. There is no
//   platform OAuth; each tenant pastes their own pair.
//
// Per-tenant credentials shape (encrypted on the channel row):
//   { serviceSecret, licenseKey }
//
// Docs:
//   https://webservice.rakuten.co.jp/documentation
//   https://webservice.rakuten.co.jp/explorer/api/Order/SearchOrder/

const HOST = 'https://api.rms.rakuten.co.jp/es/2.0';

class RakutenAdapter {
  constructor(credentials = {}) {
    this.creds = credentials;
    this.client = axios.create({
      baseURL: HOST,
      headers: this._authHeaders(credentials),
    });
  }

  _authHeaders({ serviceSecret, licenseKey }) {
    if (!serviceSecret || !licenseKey) {
      // Defer the error to the actual call so testConnection can surface it.
      return { 'Content-Type': 'application/json', Accept: 'application/json' };
    }
    const token = Buffer.from(`${serviceSecret}:${licenseKey}`).toString('base64');
    return {
      Authorization: `ESA ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  async testConnection() {
    if (!this.creds.serviceSecret || !this.creds.licenseKey) {
      return { success: false, error: 'Missing serviceSecret or licenseKey from R-Login.' };
    }
    try {
      // searchOrder with a tiny date window is the lowest-cost auth check.
      const startDatetime = new Date(Date.now() - 5 * 60 * 1000).toISOString().slice(0, 19) + '+0900';
      const endDatetime   = new Date().toISOString().slice(0, 19) + '+0900';
      const { data } = await this.client.post('/order/searchOrder/', {
        orderSearchModelV2: {
          orderProgressList: [100, 200, 300, 400, 500, 600, 700],
          dateType: 1,
          startDatetime,
          endDatetime,
          PaginationRequestModel: { requestRecordsAmount: 1, requestPage: 1 },
        },
      });
      const errors = data?.MessageModelList?.filter((m) => m.messageType === 'ERROR') || [];
      if (errors.length) {
        return { success: false, error: errors[0].message };
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.message || err.message };
    }
  }

  async fetchOrders(sinceDate) {
    const since = sinceDate ? new Date(sinceDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const startDatetime = since.toISOString().slice(0, 19) + '+0900';
    const endDatetime   = new Date().toISOString().slice(0, 19) + '+0900';

    // Step 1: searchOrder returns just orderNumberList. We then call
    // getOrder (50 max per call) to hydrate each order.
    const orderNumbers = [];
    let page = 1;
    let safety = 0;
    while (++safety < 50) {
      const { data } = await this.client.post('/order/searchOrder/', {
        orderSearchModelV2: {
          orderProgressList: [100, 200, 300], // Pending / accepted / preparing
          dateType: 1,
          startDatetime,
          endDatetime,
          PaginationRequestModel: { requestRecordsAmount: 1000, requestPage: page },
        },
      });
      const list = data?.orderNumberList || [];
      orderNumbers.push(...list);
      const totalPages = data?.PaginationResponseModel?.totalPages || 1;
      if (page >= totalPages || list.length === 0) break;
      page += 1;
    }

    if (orderNumbers.length === 0) return [];

    // Step 2: getOrder in chunks of 50.
    const detailed = [];
    for (let i = 0; i < orderNumbers.length; i += 50) {
      const chunk = orderNumbers.slice(i, i + 50);
      const { data } = await this.client.post('/order/getOrder/', {
        orderGetModel: { orderNumberList: chunk, version: 6 },
      });
      detailed.push(...(data?.OrderModelList || []));
    }

    return detailed.map((o) => this._transformOrder(o));
  }

  async updateInventoryLevel(sku, qty) {
    await this.client.post('/inventory/updateInventory/', {
      inventoryUpdateRequestModel: {
        inventoryList: [{
          manageNumber: sku,
          inventoryType: 1, // 通常商品 (regular)
          inventoryOperation: 1, // 全件上書き (overwrite)
          inventoryQuantity: parseInt(qty, 10) || 0,
        }],
      },
    });
    return { updated: true, sku, qty };
  }

  async updateListing(sku, fields) {
    const item = { itemUrl: sku };
    if (fields.price !== undefined) item.itemPrice = parseFloat(fields.price);
    if (fields.title !== undefined) item.itemName  = fields.title;
    const { data } = await this.client.post('/item/update/', { itemUpdateRequest: { item } });
    return { channel: 'RAKUTEN', sku, response: data };
  }

  _transformOrder(o) {
    const ship = o.SenderModel || o.ShippingModelList?.[0] || {};
    const buyer = o.OrdererModel || {};
    return makeOrderShape({
      channelOrderId: o.orderNumber,
      channelOrderNumber: o.orderNumber,
      customer: {
        name: `${buyer.familyName || ''} ${buyer.firstName || ''}`.trim() || 'Rakuten Customer',
        email: buyer.emailAddress || null,
        phone: buyer.phoneNumber1 || null,
      },
      shippingAddress: {
        line1: ship.address1 || ship.addressLine1,
        line2: ship.address2 || ship.addressLine2,
        city: ship.city,
        state: ship.prefecture,
        pincode: ship.zipCode1 ? `${ship.zipCode1}-${ship.zipCode2 || ''}`.trim() : ship.zipCode,
        country: 'JP',
      },
      items: (o.PackageModelList?.flatMap((p) => p.ItemModelList || []) || []).map((it) => ({
        channelSku: it.manageNumber || it.itemNumber,
        name: it.itemName,
        qty: parseInt(it.units || 1, 10),
        unitPrice: parseFloat(it.priceTaxIncl || it.price || 0),
      })),
      total: parseFloat(o.totalPrice || 0),
      paymentMethod: o.SettlementModel?.settlementMethod || 'Rakuten',
      paymentStatus: 'PAID',
      status: 'PENDING',
      orderedAt: new Date(o.orderDatetime || Date.now()),
    });
  }
}

module.exports = RakutenAdapter;
module.exports.HOST = HOST;
