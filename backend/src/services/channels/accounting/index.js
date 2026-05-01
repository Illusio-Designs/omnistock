// Accounting & ERP adapters.
// These don't fit the order-pull/inventory-push channel shape — they expose
// invoice push, voucher push, and ledger sync. The standard channel methods
// (fetchOrders / updateInventoryLevel) return skipped results so cron jobs
// don't error; category-specific methods do the real work.

const { BaseAdapter, bearerClient } = require('../_base');
const axios = require('axios');

class AccountingBase extends BaseAdapter {
  async fetchOrders() { return []; }
  async updateInventoryLevel() { return { success: true, skipped: true, reason: 'Accounting integration — use pushInvoice / syncLedger' }; }
  async pushInvoice() { throw new Error('pushInvoice not implemented'); }
  async pushVoucher() { throw new Error('pushVoucher not implemented'); }
  async syncLedger() { throw new Error('syncLedger not implemented'); }
}

// Tally / Tally Prime — communicates over XML on a local TCP port (typically
// 9000) where Tally listens. We POST XML envelopes via http://host:port.
const buildTally = (variant) => class extends AccountingBase {
  constructor(creds) {
    super(creds);
    this.host = creds.host || 'localhost';
    this.port = creds.port || 9000;
    this.client = axios.create({ baseURL: `http://${this.host}:${this.port}`, headers: { 'Content-Type': 'text/xml' } });
    this.companyName = creds.companyName;
    this.variant = variant;
  }
  async testConnection() {
    try {
      const xml = `<ENVELOPE><HEADER><TALLYREQUEST>EXPORT</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>Company Info</REPORTNAME></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>`;
      const { data } = await this.client.post('/', xml);
      return { success: true, variant: this.variant, response: data };
    } catch (e) { return { success: false, error: e.message }; }
  }
  async pushInvoice(invoice) {
    const xml = `<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>Vouchers</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>${this.companyName}</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC><REQUESTDATA><TALLYMESSAGE><VOUCHER VCHTYPE="Sales" ACTION="Create"><DATE>${invoice.date}</DATE><PARTYLEDGERNAME>${invoice.customer}</PARTYLEDGERNAME><AMOUNT>${invoice.total}</AMOUNT></VOUCHER></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`;
    const { data } = await this.client.post('/', xml);
    return { pushed: true, variant: this.variant, response: data };
  }
};
const TallyAdapter      = buildTally('Tally ERP 9');
const TallyPrimeAdapter = buildTally('Tally Prime');

// Zoho Books
class ZohoBooksAdapter extends AccountingBase {
  constructor(creds) {
    super(creds);
    this.client = axios.create({ baseURL: 'https://www.zohoapis.in/books/v3', headers: { Authorization: `Zoho-oauthtoken ${creds.accessToken}` } });
    this.organizationId = creds.organizationId;
  }
  async pushInvoice(invoice) {
    const { data } = await this.client.post('/invoices', { customer_id: invoice.customerId, line_items: invoice.lineItems, date: invoice.date }, { params: { organization_id: this.organizationId } });
    return { pushed: true, invoiceId: data?.invoice?.invoice_id, raw: data };
  }
  async syncLedger() {
    const { data } = await this.client.get('/contacts', { params: { organization_id: this.organizationId } });
    return data?.contacts || [];
  }
}

// QuickBooks
class QuickBooksAdapter extends AccountingBase {
  constructor(creds) {
    super(creds);
    this.realmId = creds.realmId;
    this.client = bearerClient(`https://quickbooks.api.intuit.com/v3/company/${creds.realmId}`, creds.accessToken, { Accept: 'application/json' });
  }
  async pushInvoice(invoice) {
    const { data } = await this.client.post('/invoice', {
      Line: invoice.lineItems.map(l => ({ DetailType: 'SalesItemLineDetail', Amount: l.amount, SalesItemLineDetail: { ItemRef: { value: l.itemId } } })),
      CustomerRef: { value: invoice.customerId },
    });
    return { pushed: true, invoiceId: data?.Invoice?.Id, raw: data };
  }
}

// Xero
class XeroAdapter extends AccountingBase {
  constructor(creds) {
    super(creds);
    this.client = bearerClient('https://api.xero.com/api.xro/2.0', creds.accessToken, { 'Xero-tenant-id': creds.tenantId, Accept: 'application/json' });
  }
  async pushInvoice(invoice) {
    const { data } = await this.client.post('/Invoices', { Invoices: [{ Type: 'ACCREC', Contact: { ContactID: invoice.customerId }, LineItems: invoice.lineItems, Date: invoice.date }] });
    return { pushed: true, invoiceId: data?.Invoices?.[0]?.InvoiceID, raw: data };
  }
}

// SAP Business One (Service Layer)
class SapB1Adapter extends AccountingBase {
  constructor(creds) {
    super(creds);
    this.client = axios.create({ baseURL: `${creds.serviceLayerUrl}/b1s/v1`, headers: { Cookie: `B1SESSION=${creds.sessionId}` } });
  }
  async pushInvoice(invoice) {
    const { data } = await this.client.post('/Invoices', { CardCode: invoice.customerCode, DocumentLines: invoice.lineItems });
    return { pushed: true, invoiceId: data?.DocEntry, raw: data };
  }
}

// SAP S/4HANA — uses OData services
class SapS4HanaAdapter extends AccountingBase {
  constructor(creds) {
    super(creds);
    this.client = axios.create({ baseURL: creds.baseUrl, auth: { username: creds.username, password: creds.password } });
  }
  async pushInvoice(invoice) {
    const { data } = await this.client.post('/sap/opu/odata/sap/API_BILLING_DOCUMENT_SRV/A_BillingDocument', invoice);
    return { pushed: true, raw: data };
  }
}

// ERPNext (Frappe REST)
class ERPNextAdapter extends AccountingBase {
  constructor(creds) {
    super(creds);
    this.client = axios.create({ baseURL: creds.siteUrl + '/api', headers: { Authorization: `token ${creds.apiKey}:${creds.apiSecret}` } });
  }
  async pushInvoice(invoice) {
    const { data } = await this.client.post('/resource/Sales Invoice', { customer: invoice.customer, items: invoice.lineItems, posting_date: invoice.date });
    return { pushed: true, invoiceId: data?.data?.name, raw: data };
  }
}

// Microsoft Dynamics 365 Business Central
class Dynamics365Adapter extends AccountingBase {
  constructor(creds) {
    super(creds);
    this.client = bearerClient(`https://api.businesscentral.dynamics.com/v2.0/${creds.tenantId}/${creds.environment}/api/v2.0/companies(${creds.companyId})`, creds.accessToken);
  }
  async pushInvoice(invoice) {
    const { data } = await this.client.post('/salesInvoices', { customerId: invoice.customerId, salesInvoiceLines: invoice.lineItems });
    return { pushed: true, invoiceId: data?.id, raw: data };
  }
}

// NetSuite (SuiteTalk REST)
class NetSuiteAdapter extends AccountingBase {
  constructor(creds) {
    super(creds);
    this.client = bearerClient(`https://${creds.accountId}.suitetalk.api.netsuite.com/services/rest/record/v1`, creds.accessToken);
  }
  async pushInvoice(invoice) {
    const { data } = await this.client.post('/invoice', { entity: { id: invoice.customerId }, item: { items: invoice.lineItems } });
    return { pushed: true, raw: data };
  }
}

// Odoo (XML-RPC over JSON-RPC bridge)
class OdooAdapter extends AccountingBase {
  constructor(creds) {
    super(creds);
    this.client = axios.create({ baseURL: creds.url + '/jsonrpc' });
    this.db = creds.database; this.uid = creds.uid; this.password = creds.apiKey;
  }
  async pushInvoice(invoice) {
    const { data } = await this.client.post('', { jsonrpc: '2.0', method: 'call', params: { service: 'object', method: 'execute_kw', args: [this.db, this.uid, this.password, 'account.move', 'create', [{ partner_id: invoice.customerId, invoice_line_ids: invoice.lineItems, move_type: 'out_invoice' }]] } });
    return { pushed: true, raw: data };
  }
}

// Busy Accounting (local Windows app — REST extension or DB sync)
class BusyAdapter extends AccountingBase {
  constructor(creds) { super(creds); this.client = axios.create({ baseURL: `http://${creds.host}:${creds.port || 8080}/api`, headers: { 'X-Api-Key': creds.apiKey } }); }
  async pushInvoice(invoice) {
    const { data } = await this.client.post('/sales-voucher', invoice);
    return { pushed: true, raw: data };
  }
}

// Marg ERP
class MargAdapter extends AccountingBase {
  constructor(creds) { super(creds); this.client = axios.create({ baseURL: `${creds.serverUrl}/api`, headers: { 'Marg-Api-Key': creds.apiKey } }); }
  async pushInvoice(invoice) {
    const { data } = await this.client.post('/sale/invoice', invoice);
    return { pushed: true, raw: data };
  }
}

// LOGIC ERP
class LogicErpAdapter extends AccountingBase {
  constructor(creds) { super(creds); this.client = bearerClient(creds.serverUrl + '/api', creds.apiKey); }
  async pushInvoice(invoice) {
    const { data } = await this.client.post('/invoices', invoice);
    return { pushed: true, raw: data };
  }
}

module.exports = {
  TallyAdapter, TallyPrimeAdapter, ZohoBooksAdapter, QuickBooksAdapter,
  XeroAdapter, SapB1Adapter, SapS4HanaAdapter, ERPNextAdapter,
  Dynamics365Adapter, NetSuiteAdapter, OdooAdapter, BusyAdapter,
  MargAdapter, LogicErpAdapter,
};
