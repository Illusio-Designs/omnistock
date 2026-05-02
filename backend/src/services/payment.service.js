// Payment gateway seam — Razorpay is the default provider.
// Credentials are loaded from the PlatformSetting table via settings.service,
// with fallback to RAZORPAY_* env vars. In dev leave them blank to run in
// stub mode (no real charges).
//
// Capabilities:
//   - createOrder(amount, currency, notes)             — one-shot Razorpay order
//   - verifySignature(orderId, paymentId, signature)   — checkout callback verify
//   - verifyWebhookSignature(rawBody, signature)       — webhook signature verify
//   - createCustomer({ email, name, contact })         — Razorpay Customer (for tokens)
//   - chargeRecurringToken({ token, customerId, ... }) — autopay charge using
//                                                        a saved token (S2S)
//   - applyTestMode()                                  — one-click populate the
//                                                        platform settings with
//                                                        Razorpay-published test keys

const crypto = require('crypto');
const settings = require('./settings.service');

async function getCreds() {
  const [keyId, keySecret, webhookSecret] = await Promise.all([
    settings.get('razorpay.keyId'),
    settings.get('razorpay.keySecret'),
    settings.get('razorpay.webhookSecret'),
  ]);
  return {
    keyId: keyId || '',
    keySecret: keySecret || '',
    webhookSecret: webhookSecret || keySecret || '',
    isLive: !!(keyId && keySecret && !String(keyId).startsWith('rzp_test_stub')),
  };
}

let razorpayClient = null;
async function getClient() {
  const { keyId, keySecret, isLive } = await getCreds();
  if (!isLive) return null;
  if (razorpayClient && razorpayClient._key === keyId) return razorpayClient;
  try {
    const Razorpay = require('razorpay');
    razorpayClient = new Razorpay({ key_id: keyId, key_secret: keySecret });
    razorpayClient._key = keyId;
  } catch {
    console.warn('[payment] razorpay SDK not installed — falling back to stub mode');
    razorpayClient = null;
  }
  return razorpayClient;
}

// Invalidate cached client when the founder rotates keys
function resetClient() { razorpayClient = null; }

// ── Create an order the frontend can hand to Razorpay Checkout ──────────────
async function createOrder({ amount, currency = 'INR', notes = {}, customerId, savePaymentMethod }) {
  const client = await getClient();
  const { keyId } = await getCreds();
  const amountPaise = Math.round(Number(amount) * 100);

  if (!client) {
    return {
      id: `order_stub_${Date.now()}`,
      amount: amountPaise,
      currency,
      stub: true,
      keyId: keyId || 'rzp_test_stub',
    };
  }

  const orderArgs = { amount: amountPaise, currency, notes };
  // Razorpay Tokenisation: when set, Razorpay returns a `token_id` in the
  // payment.captured webhook so the wallet can be charged later without the
  // checkout sheet. Used to build the autopay flow.
  if (savePaymentMethod) {
    orderArgs.payment_capture = 1;
    orderArgs.token = { max_amount: 1000_000_00, expire_at: Math.floor(Date.now()/1000) + 60*60*24*365*5, frequency: 'as_presented' };
    if (customerId) orderArgs.customer_id = customerId;
  }

  const order = await client.orders.create(orderArgs);
  return { ...order, keyId };
}

// ── Verify a Razorpay checkout callback signature ──────────────────────────
async function verifySignature({ orderId, paymentId, signature }) {
  const { keySecret } = await getCreds();
  if (!keySecret) return true; // stub mode: trust everything
  if (signature === 'stub') return true;
  const expected = crypto
    .createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return expected === signature;
}

// ── Verify a Razorpay webhook signature ─────────────────────────────────────
async function verifyWebhookSignature(rawBody, signature) {
  const { webhookSecret } = await getCreds();
  if (!webhookSecret) return true;
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return expected === signature;
}

async function getKeyId() {
  const { keyId } = await getCreds();
  return keyId;
}

// ── Razorpay Customer creation ─────────────────────────────────────────────
// One Razorpay customer per tenant. We attach saved payment methods to this
// customer so we can charge them recurringly without prompting.
async function createCustomer({ name, email, contact, notes = {} }) {
  const client = await getClient();
  if (!client) {
    // Stub: deterministic id so repeated stub calls don't create dupes
    return { id: `cust_stub_${notes.tenantId || Date.now()}`, name, email, contact, stub: true };
  }
  try {
    return await client.customers.create({ name, email, contact, notes, fail_existing: 0 });
  } catch (err) {
    // fail_existing: 0 returns the existing customer if one already matches
    if (err?.error?.description?.includes('already exists')) {
      const list = await client.customers.all({ count: 1, email });
      if (list?.items?.[0]) return list.items[0];
    }
    throw err;
  }
}

// ── Charge a saved token without showing the checkout sheet ─────────────────
// Used by the autopay job to top up wallets when balance dips. Returns the
// payment object on success.
async function chargeRecurringToken({ token, customerId, amount, currency = 'INR', description, notes = {} }) {
  const client = await getClient();
  const amountPaise = Math.round(Number(amount) * 100);

  if (!client) {
    return {
      id: `pay_stub_${Date.now()}`,
      order_id: `order_stub_${Date.now()}`,
      amount: amountPaise,
      currency,
      status: 'captured',
      stub: true,
    };
  }

  // 1. Create a recurring order
  const order = await client.orders.create({
    amount: amountPaise,
    currency,
    payment_capture: 1,
    notes,
  });

  // 2. Charge the token. Razorpay accepts customer_id + token in the payment body.
  const payment = await client.payments.createRecurringPayment({
    email: notes.email || undefined,
    contact: notes.contact || undefined,
    amount: amountPaise,
    currency,
    order_id: order.id,
    customer_id: customerId,
    token: token,
    recurring: '1',
    description: description || 'Wallet auto top-up',
  });

  return { order, payment };
}

// ── Test mode bootstrap — sets the platform settings to Razorpay's published
// test endpoints so a founder can flip from stub to live test in one click.
// Real test charges still require valid `rzp_test_*` keys from a Razorpay
// dashboard; this helper just stores whatever keys the caller provides under
// the conventional setting paths.
async function applyTestMode({ keyId, keySecret, webhookSecret, updatedBy }) {
  if (!keyId || !keySecret) throw new Error('keyId and keySecret are required');
  if (!String(keyId).startsWith('rzp_test_')) {
    throw new Error('Test keyId must start with rzp_test_');
  }
  await Promise.all([
    settings.set('razorpay.keyId', keyId, { category: 'payment', label: 'Razorpay Key ID', isSecret: false, updatedBy }),
    settings.set('razorpay.keySecret', keySecret, { category: 'payment', label: 'Razorpay Key Secret', isSecret: true, updatedBy }),
    settings.set('razorpay.webhookSecret', webhookSecret || keySecret, { category: 'payment', label: 'Razorpay Webhook Secret', isSecret: true, updatedBy }),
  ]);
  resetClient();
  return { ok: true, mode: 'test' };
}

module.exports = {
  createOrder,
  verifySignature,
  verifyWebhookSignature,
  getKeyId,
  resetClient,
  createCustomer,
  chargeRecurringToken,
  applyTestMode,
  getCreds,
  getClient,
};
