// Payment gateway seam — Razorpay is the default provider.
// Credentials are loaded from the PlatformSetting table via settings.service,
// with fallback to RAZORPAY_* env vars. In dev leave them blank to run in
// stub mode (no real charges).

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
async function createOrder({ amount, currency = 'INR', notes = {} }) {
  const client = await getClient();
  const { keyId } = await getCreds();
  const amountPaise = Math.round(amount * 100);

  if (!client) {
    return {
      id: `order_stub_${Date.now()}`,
      amount: amountPaise,
      currency,
      stub: true,
      keyId: keyId || 'rzp_test_stub',
    };
  }

  const order = await client.orders.create({ amount: amountPaise, currency, notes });
  return { ...order, keyId };
}

// ── Verify a Razorpay checkout callback signature ──────────────────────────
async function verifySignature({ orderId, paymentId, signature }) {
  const { keySecret } = await getCreds();
  if (!keySecret) return true; // stub mode: trust everything
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

module.exports = {
  createOrder,
  verifySignature,
  verifyWebhookSignature,
  getKeyId,
  resetClient,
};
