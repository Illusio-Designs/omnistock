// Payment gateway adapters. Channel-shape methods (fetchOrders/inventory)
// are no-ops; primary methods are createPayment, refund, verifyWebhook.

const { BaseAdapter, basicClient, bearerClient } = require('../_base');
const axios = require('axios');
const crypto = require('crypto');

class PaymentBase extends BaseAdapter {
  async fetchOrders() { return []; }
  async updateInventoryLevel() { return { success: true, skipped: true, reason: 'Payment gateway' }; }
  async createPayment() { throw new Error('createPayment not implemented'); }
  async refund() { throw new Error('refund not implemented'); }
  verifyWebhook() { return false; }
}

// Razorpay
class RazorpayAdapter extends PaymentBase {
  constructor(creds) { super(creds); this.client = basicClient('https://api.razorpay.com/v1', creds.keyId, creds.keySecret); this.keySecret = creds.keySecret; this.webhookSecret = creds.webhookSecret; }
  async createPayment({ amount, currency = 'INR', receipt, notes }) {
    const { data } = await this.client.post('/orders', { amount: Math.round(amount * 100), currency, receipt, notes });
    return { provider: 'razorpay', orderId: data.id, amount, currency, raw: data };
  }
  async refund({ paymentId, amount }) {
    const { data } = await this.client.post(`/payments/${paymentId}/refund`, { amount: amount ? Math.round(amount * 100) : undefined });
    return { refundId: data.id, raw: data };
  }
  verifyWebhook(rawBody, signature) {
    const expected = crypto.createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    return expected === signature;
  }
}

// PayU
class PayUAdapter extends PaymentBase {
  constructor(creds) { super(creds); this.merchantKey = creds.merchantKey; this.salt = creds.salt; this.client = axios.create({ baseURL: 'https://info.payu.in/merchant/postservice.php?form=2' }); }
  async createPayment({ amount, productInfo, firstname, email, phone, txnid }) {
    const hashStr = `${this.merchantKey}|${txnid}|${amount}|${productInfo}|${firstname}|${email}|||||||||||${this.salt}`;
    const hash = crypto.createHash('sha512').update(hashStr).digest('hex');
    return { provider: 'payu', txnid, hash, amount, key: this.merchantKey, redirectUrl: 'https://secure.payu.in/_payment' };
  }
  async refund({ paymentId, amount }) {
    const { data } = await this.client.post('', new URLSearchParams({ key: this.merchantKey, command: 'cancel_refund_transaction', var1: paymentId, var2: 'refund', var3: amount }));
    return { raw: data };
  }
}

// CCAvenue
class CCAvenueAdapter extends PaymentBase {
  constructor(creds) { super(creds); this.merchantId = creds.merchantId; this.workingKey = creds.workingKey; this.accessCode = creds.accessCode; }
  async createPayment({ amount, orderId, currency = 'INR' }) {
    const data = `merchant_id=${this.merchantId}&order_id=${orderId}&currency=${currency}&amount=${amount}`;
    const cipher = crypto.createCipheriv('aes-128-cbc', crypto.createHash('md5').update(this.workingKey).digest(), Buffer.alloc(16));
    const encRequest = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
    return { provider: 'ccavenue', encRequest, accessCode: this.accessCode, redirectUrl: 'https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction' };
  }
}

// Cashfree
class CashfreeAdapter extends PaymentBase {
  constructor(creds) {
    super(creds);
    this.client = axios.create({ baseURL: 'https://api.cashfree.com/pg', headers: { 'x-api-version': '2023-08-01', 'x-client-id': creds.clientId, 'x-client-secret': creds.clientSecret, 'Content-Type': 'application/json' } });
  }
  async createPayment({ amount, orderId, currency = 'INR', customer }) {
    const { data } = await this.client.post('/orders', { order_id: orderId, order_amount: amount, order_currency: currency, customer_details: customer });
    return { provider: 'cashfree', orderId: data.order_id, sessionId: data.payment_session_id, raw: data };
  }
  async refund({ orderId, amount, refundId }) {
    const { data } = await this.client.post(`/orders/${orderId}/refunds`, { refund_amount: amount, refund_id: refundId });
    return { raw: data };
  }
}

// Stripe
class StripeAdapter extends PaymentBase {
  constructor(creds) { super(creds); this.client = axios.create({ baseURL: 'https://api.stripe.com/v1', auth: { username: creds.secretKey, password: '' }, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); this.webhookSecret = creds.webhookSecret; }
  async createPayment({ amount, currency = 'INR', customer, description }) {
    const { data } = await this.client.post('/payment_intents', new URLSearchParams({ amount: Math.round(amount * 100), currency, description: description || '', customer: customer || '' }));
    return { provider: 'stripe', paymentIntentId: data.id, clientSecret: data.client_secret, raw: data };
  }
  async refund({ paymentIntentId, amount }) {
    const { data } = await this.client.post('/refunds', new URLSearchParams({ payment_intent: paymentIntentId, amount: amount ? Math.round(amount * 100) : '' }));
    return { refundId: data.id, raw: data };
  }
}

// PayPal
class PayPalAdapter extends PaymentBase {
  constructor(creds) {
    super(creds);
    this.client = axios.create({ baseURL: creds.live ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com', auth: { username: creds.clientId, password: creds.clientSecret } });
  }
  async _token() {
    if (this._tk && this._tkExp > Date.now()) return this._tk;
    const { data } = await this.client.post('/v1/oauth2/token', 'grant_type=client_credentials', { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    this._tk = data.access_token; this._tkExp = Date.now() + (data.expires_in - 60) * 1000;
    return this._tk;
  }
  async createPayment({ amount, currency = 'USD' }) {
    const token = await this._token();
    const { data } = await this.client.post('/v2/checkout/orders', { intent: 'CAPTURE', purchase_units: [{ amount: { currency_code: currency, value: amount.toFixed(2) } }] }, { headers: { Authorization: `Bearer ${token}` } });
    return { provider: 'paypal', orderId: data.id, raw: data };
  }
  async refund({ captureId, amount, currency = 'USD' }) {
    const token = await this._token();
    const { data } = await this.client.post(`/v2/payments/captures/${captureId}/refund`, { amount: { value: amount.toFixed(2), currency_code: currency } }, { headers: { Authorization: `Bearer ${token}` } });
    return { raw: data };
  }
}

// Paytm Payments
class PaytmPgAdapter extends PaymentBase {
  constructor(creds) { super(creds); this.mid = creds.mid; this.key = creds.merchantKey; this.client = axios.create({ baseURL: creds.live ? 'https://securegw.paytm.in' : 'https://securegw-stage.paytm.in' }); }
  async createPayment({ amount, orderId, customerId }) {
    const { data } = await this.client.post(`/theia/api/v1/initiateTransaction?mid=${this.mid}&orderId=${orderId}`, { body: { requestType: 'Payment', mid: this.mid, orderId, txnAmount: { value: String(amount), currency: 'INR' }, userInfo: { custId: customerId }, websiteName: 'WEBSTAGING', callbackUrl: 'https://merchant.com/callback' } });
    return { provider: 'paytm', txnToken: data?.body?.txnToken, raw: data };
  }
}

// PhonePe Business
class PhonePeAdapter extends PaymentBase {
  constructor(creds) { super(creds); this.merchantId = creds.merchantId; this.saltKey = creds.saltKey; this.saltIndex = creds.saltIndex || 1; this.client = axios.create({ baseURL: creds.live ? 'https://api.phonepe.com/apis/hermes' : 'https://api-preprod.phonepe.com/apis/pg-sandbox' }); }
  async createPayment({ amount, orderId, mobile, callbackUrl }) {
    const payload = Buffer.from(JSON.stringify({ merchantId: this.merchantId, merchantTransactionId: orderId, amount: Math.round(amount * 100), redirectUrl: callbackUrl, redirectMode: 'POST', mobileNumber: mobile, paymentInstrument: { type: 'PAY_PAGE' } })).toString('base64');
    const checksum = crypto.createHash('sha256').update(payload + '/pg/v1/pay' + this.saltKey).digest('hex') + '###' + this.saltIndex;
    const { data } = await this.client.post('/pg/v1/pay', { request: payload }, { headers: { 'X-VERIFY': checksum, 'Content-Type': 'application/json' } });
    return { provider: 'phonepe', redirectUrl: data?.data?.instrumentResponse?.redirectInfo?.url, raw: data };
  }
}

// Instamojo
class InstamojoAdapter extends PaymentBase {
  constructor(creds) { super(creds); this.client = axios.create({ baseURL: 'https://api.instamojo.com/api/1.1', headers: { 'X-Api-Key': creds.apiKey, 'X-Auth-Token': creds.authToken } }); }
  async createPayment({ amount, purpose, buyerName, buyerEmail, buyerPhone }) {
    const { data } = await this.client.post('/payment-requests/', new URLSearchParams({ amount: String(amount), purpose, buyer_name: buyerName || '', email: buyerEmail || '', phone: buyerPhone || '' }), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
    return { provider: 'instamojo', paymentRequestId: data?.payment_request?.id, longurl: data?.payment_request?.longurl, raw: data };
  }
  async refund({ paymentId, amount, type = 'QFL' }) {
    const { data } = await this.client.post('/refunds/', new URLSearchParams({ payment_id: paymentId, type, body: 'Refund', refund_amount: String(amount) }));
    return { raw: data };
  }
}

module.exports = {
  RazorpayAdapter, PayUAdapter, CCAvenueAdapter, CashfreeAdapter, StripeAdapter,
  PayPalAdapter, PaytmPgAdapter, PhonePeAdapter, InstamojoAdapter,
};
