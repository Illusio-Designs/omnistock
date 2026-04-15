const { Router } = require('express');
const prisma = require('../utils/prisma');
const {
  authenticate, requireTenant, requirePermission, invalidateUserCache,
} = require('../middleware/auth.middleware');
const {
  createOrder, verifySignature, verifyWebhookSignature, getKeyId,
} = require('../services/payment.service');
const { audit } = require('../services/audit.service');
const { snapshotInvoiceForSubscription } = require('../jobs/billing.job');

const router = Router();

// ══════════════════════════════════════════════════════════════════════════
// PUBLIC WEBHOOK — Razorpay → us
// Mount BEFORE the authenticated middleware stack.
// ══════════════════════════════════════════════════════════════════════════
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] || '';
    const rawBody = JSON.stringify(req.body);
    if (!(await verifyWebhookSignature(rawBody, signature))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body?.event;
    const payload = req.body?.payload;

    // Handle the events we care about
    if (event === 'payment.captured' || event === 'order.paid') {
      const orderId = payload?.payment?.entity?.order_id || payload?.order?.entity?.id;
      const notes = payload?.payment?.entity?.notes || payload?.order?.entity?.notes || {};
      const tenantId = notes.tenantId;
      const subscriptionId = notes.subscriptionId;
      const invoiceId = notes.invoiceId;

      if (invoiceId) {
        await prisma.billingInvoice.update({
          where: { id: invoiceId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            providerRef: payload?.payment?.entity?.id || orderId,
          },
        });
      }
      if (subscriptionId) {
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: { status: 'ACTIVE', provider: 'razorpay' },
        });
      }
      if (tenantId) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { status: 'ACTIVE' },
        });
      }
    }

    if (event === 'payment.failed') {
      const notes = payload?.payment?.entity?.notes || {};
      if (notes.subscriptionId) {
        await prisma.subscription.update({
          where: { id: notes.subscriptionId },
          data: { status: 'PAST_DUE' },
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[payment.webhook]', err);
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// AUTHENTICATED ROUTES
// ══════════════════════════════════════════════════════════════════════════
router.use(authenticate, requireTenant);

// ── Begin checkout: create Razorpay order for the current subscription ─────
router.post('/checkout', requirePermission('billing.manage'), async (req, res) => {
  try {
    const { planCode, billingCycle = 'MONTHLY' } = req.body;
    const plan = await prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const amount = Number(billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice);
    const sub = await prisma.subscription.findUnique({ where: { tenantId: req.tenant.id } });

    const rzpOrder = await createOrder({
      amount,
      currency: plan.currency || 'INR',
      notes: {
        tenantId: req.tenant.id,
        subscriptionId: sub?.id || '',
        planCode: plan.code,
        billingCycle,
      },
    });

    const keyId = (await getKeyId()) || rzpOrder.keyId;
    res.json({
      order: rzpOrder,
      keyId,
      plan: { code: plan.code, name: plan.name, amount },
      prefill: { email: req.user.email, name: req.user.name },
    });
  } catch (err) {
    console.error('[payment.checkout]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Verify a successful checkout (called from the client after Razorpay modal) ─
router.post('/verify', requirePermission('billing.manage'), async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planCode, billingCycle = 'MONTHLY' } = req.body;

  const ok = await verifySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!ok) return res.status(400).json({ error: 'Signature mismatch' });

  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const periodEnd = new Date();
  if (billingCycle === 'YEARLY') periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const sub = await prisma.subscription.update({
    where: { tenantId: req.tenant.id },
    data: {
      planId: plan.id,
      billingCycle,
      status: 'ACTIVE',
      provider: 'razorpay',
      providerSubscriptionId: razorpay_order_id,
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    },
    include: { plan: true },
  });

  // Snapshot a PAID invoice for this period
  try {
    const inv = await snapshotInvoiceForSubscription({ ...sub, plan }, new Date().toISOString().slice(0, 7));
    await prisma.billingInvoice.update({
      where: { id: inv.id },
      data: { status: 'PAID', paidAt: new Date(), providerRef: razorpay_payment_id },
    });
  } catch (err) {
    console.error('[payment.verify] invoice snapshot failed:', err.message);
  }

  // Re-activate tenant if it was past-due/trial-expired
  await prisma.tenant.update({ where: { id: req.tenant.id }, data: { status: 'ACTIVE' } });
  invalidateUserCache(req.user.id);
  audit({ req, action: 'billing.payment.captured', resource: 'subscription', resourceId: sub.id, metadata: { planCode, paymentId: razorpay_payment_id } });

  res.json({ ok: true, subscription: sub });
});

module.exports = router;
