// Returns / Reverse logistics adapters.
// Primary methods: createReturn, fetchReturns, refund.

const { BaseAdapter, bearerClient } = require('../_base');
const axios = require('axios');

class ReturnsBase extends BaseAdapter {
  async fetchOrders() { return []; }
  async updateInventoryLevel() { return { success: true, skipped: true, reason: 'Returns integration' }; }
}

// Return Prime
class ReturnPrimeAdapter extends ReturnsBase {
  constructor(creds) { super(creds); this.client = bearerClient('https://api.returnprime.com/v1', creds.apiKey); }
  async createReturn(input) {
    const { data } = await this.client.post('/returns', input);
    return { id: data.id, raw: data };
  }
  async fetchReturns() {
    const { data } = await this.client.get('/returns', { params: { status: 'requested' } });
    return data?.returns || [];
  }
}

// WeReturn
class WeReturnAdapter extends ReturnsBase {
  constructor(creds) { super(creds); this.client = bearerClient('https://api.wereturn.in/v1', creds.apiKey); }
  async createReturn(input) {
    const { data } = await this.client.post('/return-requests', input);
    return { id: data.id, raw: data };
  }
  async fetchReturns() {
    const { data } = await this.client.get('/return-requests');
    return data?.requests || [];
  }
}

// Anchanto Returns
class AnchantoReturnsAdapter extends ReturnsBase {
  constructor(creds) {
    super(creds);
    this.client = axios.create({ baseURL: `https://${creds.subdomain}.api.anchanto.com/sc/v1`, headers: { 'Authorization': `Bearer ${creds.accessToken}`, 'X-Tenant-Id': creds.tenantId } });
  }
  async createReturn(input) {
    const { data } = await this.client.post('/returns', input);
    return { id: data.return_id, raw: data };
  }
  async fetchReturns() {
    const { data } = await this.client.get('/returns');
    return data?.returns || [];
  }
}

// EasyVMS — returns fraud detection
class EasyVMSAdapter extends ReturnsBase {
  constructor(creds) { super(creds); this.client = bearerClient('https://api.vms.easyecom.io/v1', creds.apiKey); }
  async createReturn(input) {
    const { data } = await this.client.post('/return-requests', input);
    return { id: data.requestId, fraudScore: data.fraudScore, raw: data };
  }
  async checkFraud(orderId) {
    const { data } = await this.client.get(`/fraud-check/${orderId}`);
    return data;
  }
}

module.exports = { ReturnPrimeAdapter, WeReturnAdapter, AnchantoReturnsAdapter, EasyVMSAdapter };
