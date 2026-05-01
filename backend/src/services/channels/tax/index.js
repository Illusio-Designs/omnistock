// Tax / GST / e-Invoice adapters.
// Primary methods: pushEInvoice, generateIRN, fetchGSTReturns.

const { BaseAdapter, bearerClient } = require('../_base');
const axios = require('axios');

class TaxBase extends BaseAdapter {
  async fetchOrders() { return []; }
  async updateInventoryLevel() { return { success: true, skipped: true, reason: 'Tax compliance integration' }; }
  async pushEInvoice() { throw new Error('pushEInvoice not implemented'); }
  async generateIRN() { throw new Error('generateIRN not implemented'); }
}

// ClearTax
class ClearTaxAdapter extends TaxBase {
  constructor(creds) { super(creds); this.client = bearerClient('https://api.cleartax.in/v1', creds.apiKey, { 'X-Auth-Token': creds.authToken }); }
  async pushEInvoice(invoice) {
    const { data } = await this.client.post('/einvoice/generate', invoice);
    return { irn: data?.irn, qrCode: data?.qrCode, raw: data };
  }
  async generateIRN(invoice) { return this.pushEInvoice(invoice); }
  async fetchGSTReturns({ gstin, period }) {
    const { data } = await this.client.get('/gst/returns', { params: { gstin, period } });
    return data;
  }
}

// GSTZen
class GSTZenAdapter extends TaxBase {
  constructor(creds) { super(creds); this.client = bearerClient('https://my.gstzen.in/api', creds.apiKey); }
  async pushEInvoice(invoice) {
    const { data } = await this.client.post('/einvoice/generate', invoice);
    return { irn: data?.IRN, raw: data };
  }
}

// TaxCloud (Government IRP)
class TaxCloudIRPAdapter extends TaxBase {
  constructor(creds) {
    super(creds);
    this.client = axios.create({ baseURL: 'https://einvoice1.gst.gov.in/api/eInvoice', headers: { 'client-id': creds.clientId, 'client-secret': creds.clientSecret, 'gstin': creds.gstin, 'user_name': creds.username, 'AuthToken': creds.authToken } });
  }
  async pushEInvoice(invoice) {
    const { data } = await this.client.post('/v1.03/Invoice', invoice);
    return { irn: data?.Irn, qrCode: data?.SignedQRCode, raw: data };
  }
  async generateIRN(invoice) { return this.pushEInvoice(invoice); }
}

// Avalara
class AvalaraAdapter extends TaxBase {
  constructor(creds) {
    super(creds);
    this.client = axios.create({ baseURL: 'https://rest.avatax.com/api/v2', auth: { username: creds.accountId, password: creds.licenseKey } });
  }
  async calculateTax(transaction) {
    const { data } = await this.client.post('/transactions/create', transaction);
    return data;
  }
  async pushEInvoice(invoice) { return this.calculateTax(invoice); }
}

// Zoho GST (uses Zoho Books GST endpoints)
class ZohoGstAdapter extends TaxBase {
  constructor(creds) {
    super(creds);
    this.client = axios.create({ baseURL: 'https://www.zohoapis.in/books/v3', headers: { Authorization: `Zoho-oauthtoken ${creds.accessToken}` } });
    this.organizationId = creds.organizationId;
  }
  async pushEInvoice(invoice) {
    const { data } = await this.client.post('/einvoicing/invoices', invoice, { params: { organization_id: this.organizationId } });
    return { irn: data?.einvoice?.irn, raw: data };
  }
  async fetchGSTReturns({ period }) {
    const { data } = await this.client.get('/gstr1', { params: { organization_id: this.organizationId, period } });
    return data;
  }
}

module.exports = { ClearTaxAdapter, GSTZenAdapter, TaxCloudIRPAdapter, AvalaraAdapter, ZohoGstAdapter };
