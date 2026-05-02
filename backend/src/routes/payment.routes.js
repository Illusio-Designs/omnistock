const { Router } = require('express');
const { v4: uuid } = require('uuid');
const prisma = require('../utils/prisma');
const db = require('../utils/db');
const {
  authenticate, requireTenant, requirePermission, invalidateUserCache,
} = require('../middleware/auth.middleware');
const {
  createOrder, verifySignature, verifyWebhookSignature, getKeyId,
  createCustomer, applyTestMode,
} = require('../services/payment.service');
const wallet = require('../services/wallet.service');
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
    const paymentEntity = payload?.payment?.entity;
    const orderEntity = payload?.order?.entity;
    const subEntity = payload?.subscription?.entity;
    const tokenEntity = paymentEntity?.token_id;
    const notes = paymentEntity?.notes || orderEntity?.notes || subEntity?.notes || {};

    // ── Successful payment captured (one-shot OR recurring) ───────────────
    if (event === 'payment.captured' || event === 'order.paid') {
      const tenantId = notes.tenantId;
      const subscriptionId = notes.subscriptionId;
      const invoiceId = notes.invoiceId;
      const purpose = notes.purpose; // 'plan' | 'wallet' | 'autopay'
      const amountInr = paymentEntity?.amount ? Number(paymentEntity.amount) / 100 : null;

      if (invoiceId) {
        await prisma.billingInvoice.update({
          where: { id: invoiceId },
          data: { status: 'PAID', paidAt: new Date(), providerRef: paymentEntity?.id },
        });
      }
      if (subscriptionId) {
        await prisma.subscription.update({
          where: { id: subscriptionId },
          data: { status: 'ACTIVE', provider: 'razorpay' },
        });
      }
      if (tenantId) {
        await prisma.tenant.update({ where: { id: tenantId }, data: { status: 'ACTIVE' } });

        // Wallet top-ups (manual or autopay) flow through the webhook so the
        // ledger is the source of truth even if the client never returns.
        if (tenantId && (purpose === 'wallet' || purpose === 'autopay') && amountInr) {
          try {
            const existing = await db('wallet_transactions')
              .where({ tenantId, paymentRef: paymentEntity?.id }).first();
            if (!existing) {
              await wallet.topup(tenantId, amountInr, {
                paymentRef: paymentEntity?.id,
                description: purpose === 'autopay' ? 'Auto top-up (Razorpay)' : 'Top-up (Razorpay)',
                type: 'TOPUP',
              });
            }
          } catch (e) { console.warn('[payment.webhook] wallet topup credit failed:', e.message); }
        }

        // Persist the saved token if Razorpay returns one
        if (tokenEntity) {
          try {
            const customerId = paymentEntity?.customer_id;
            const card = paymentEntity?.card || {};
            const upi = paymentEntity?.vpa || paymentEntity?.upi?.vpa;
            const id = uuid();
            await db('tenant_payment_methods').insert({
              id,
              tenantId,
              provider: 'razorpay',
              providerCustomerId: customerId || null,
              providerTokenId: tokenEntity,
              method: paymentEntity?.method || null,
              brand: card.network || null,
              last4: card.last4 || null,
              expiryMonth: card.expiry_month || null,
              expiryYear: card.expiry_year || null,
              upiVpa: upi || null,
              label: card.last4 ? `${card.network || 'Card'} •••• ${card.last4}` : (upi || 'Saved method'),
              isDefault: 0,
              isActive: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            }).onConflict(['providerTokenId']).ignore?.() ?? null;
          } catch (e) { console.warn('[payment.webhook] save token failed:', e.message); }
        }
      }
    }

    // ── Subscription lifecycle events ─────────────────────────────────────
    if (event === 'subscription.charged' && subEntity) {
      const tenantId = subEntity.notes?.tenantId;
      if (tenantId) {
        await prisma.subscription.update({
          where: { tenantId },
          data: { status: 'ACTIVE' },
        }).catch(() => {});
      }
    }
    if (event === 'subscription.halted' || event === 'subscription.cancelled') {
      const tenantId = subEntity?.notes?.tenantId;
      if (tenantId) {
        await prisma.subscription.update({
          where: { tenantId },
          data: { status: event === 'subscription.cancelled' ? 'CANCELLED' : 'PAST_DUE' },
        }).catch(() => {});
      }
    }

    // ── Failed payments ───────────────────────────────────────────────────
    if (event === 'payment.failed') {
      const sid = notes.subscriptionId;
      if (sid) {
        await prisma.subscription.update({ where: { id: sid }, data: { status: 'PAST_DUE' } }).catch(() => {});
      }
      // Bump failure count on the saved method so autopay backs off
      const tokenId = paymentEntity?.token_id;
      if (tokenId) {
        await db('tenant_payment_methods')
          .where({ providerTokenId: tokenId })
          .update({
            failureCount: db.raw('failureCount + 1'),
            lastFailureAt: new Date(),
            lastFailureReason: paymentEntity?.error_description || 'Payment failed',
          })
          .catch(() => {});
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

// ── Plan checkout: create Razorpay order for a plan upgrade ────────────────
router.post('/checkout', requirePermission('billing.manage'), async (req, res) => {
  try {
    const { planCode, billingCycle = 'MONTHLY', savePaymentMethod } = req.body;
    const plan = await prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const amount = Number(billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice);
    const sub = await prisma.subscription.findUnique({ where: { tenantId: req.tenant.id } });

    let customerId = null;
    if (savePaymentMethod) {
      const customer = await createCustomer({
        name: req.user.name,
        email: req.user.email,
        contact: req.user.phone || undefined,
        notes: { tenantId: req.tenant.id },
      });
      customerId = customer.id;
    }

    const rzpOrder = await createOrder({
      amount, currency: plan.currency || 'INR',
      notes: {
        tenantId: req.tenant.id,
        subscriptionId: sub?.id || '',
        planCode: plan.code,
        billingCycle,
        purpose: 'plan',
      },
      customerId,
      savePaymentMethod: !!savePaymentMethod,
    });

    const keyId = (await getKeyId()) || rzpOrder.keyId;
    res.json({
      order: rzpOrder,
      keyId,
      customerId,
      plan: { code: plan.code, name: plan.name, amount },
      prefill: { email: req.user.email, name: req.user.name, contact: req.user.phone || '' },
    });
  } catch (err) {
    console.error('[payment.checkout]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Verify a successful plan checkout ──────────────────────────────────────
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

  await prisma.tenant.update({ where: { id: req.tenant.id }, data: { status: 'ACTIVE' } });
  invalidateUserCache(req.user.id);
  audit({ req, action: 'billing.payment.captured', resource: 'subscription', resourceId: sub.id, metadata: { planCode, paymentId: razorpay_payment_id } });

  res.json({ ok: true, subscription: sub });
});

// ── Wallet top-up checkout: create Razorpay order for arbitrary amount ─────
router.post('/wallet-checkout', requirePermission('billing.manage'), async (req, res) => {
  try {
    const { amount, savePaymentMethod } = req.body;
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount must be positive' });

    let customerId = null;
    if (savePaymentMethod) {
      const customer = await createCustomer({
        name: req.user.name,
        email: req.user.email,
        contact: req.user.phone || undefined,
        notes: { tenantId: req.tenant.id },
      });
      customerId = customer.id;
    }

    const rzpOrder = await createOrder({
      amount: Number(amount),
      currency: 'INR',
      notes: {
        tenantId: req.tenant.id,
        purpose: 'wallet',
        amount: String(amount),
      },
      customerId,
      savePaymentMethod: !!savePaymentMethod,
    });

    const keyId = (await getKeyId()) || rzpOrder.keyId;
    res.json({
      order: rzpOrder,
      keyId,
      customerId,
      prefill: { email: req.user.email, name: req.user.name, contact: req.user.phone || '' },
    });
  } catch (err) {
    console.error('[payment.wallet-checkout]', err);
    res.status(500).json({ error: err.message });
  }
});

// ── Verify wallet top-up + credit the wallet ───────────────────────────────
router.post('/wallet-verify', requirePermission('billing.manage'), async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, amount } = req.body;

  const ok = await verifySignature({
    orderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    signature: razorpay_signature,
  });
  if (!ok) return res.status(400).json({ error: 'Signature mismatch' });
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount required' });

  // Idempotent — if the webhook already credited this payment, skip the double credit
  const existing = await db('wallet_transactions')
    .where({ tenantId: req.tenant.id, paymentRef: razorpay_payment_id }).first();
  if (existing) {
    return res.json({ ok: true, alreadyCredited: true });
  }

  const result = await wallet.topup(req.tenant.id, Number(amount), {
    paymentRef: razorpay_payment_id,
    description: 'Top-up (Razorpay)',
    createdById: req.user.id,
    type: 'TOPUP',
  });
  audit({ req, action: 'wallet.topup.razorpay', resource: 'wallet', resourceId: result.transactionId, metadata: { amount, paymentId: razorpay_payment_id } });
  res.json({ ok: true, ...result });
});

// ──────────────────────────────────────────────────────────────────────────
// SAVED PAYMENT METHODS  (used by the autopay job to recurring-charge cards)
// ──────────────────────────────────────────────────────────────────────────
router.get('/methods', requirePermission('billing.read'), async (req, res) => {
  const rows = await db('tenant_payment_methods')
    .where({ tenantId: req.tenant.id, isActive: 1 })
    .orderBy([{ column: 'isDefault', order: 'desc' }, { column: 'createdAt', order: 'desc' }]);
  res.json(rows);
});

router.post('/methods/:id/default', requirePermission('billing.manage'), async (req, res) => {
  const id = req.params.id;
  await db.transaction(async (trx) => {
    await trx('tenant_payment_methods').where({ tenantId: req.tenant.id }).update({ isDefault: 0 });
    const updated = await trx('tenant_payment_methods')
      .where({ id, tenantId: req.tenant.id, isActive: 1 })
      .update({ isDefault: 1 });
    if (!updated) throw new Error('Payment method not found');
  });
  audit({ req, action: 'wallet.method.set_default', resource: 'payment_method', resourceId: id });
  res.json({ ok: true });
});

router.delete('/methods/:id', requirePermission('billing.manage'), async (req, res) => {
  const id = req.params.id;
  const updated = await db('tenant_payment_methods')
    .where({ id, tenantId: req.tenant.id })
    .update({ isActive: 0, isDefault: 0, updatedAt: new Date() });
  if (!updated) return res.status(404).json({ error: 'Payment method not found' });
  audit({ req, action: 'wallet.method.delete', resource: 'payment_method', resourceId: id });
  res.json({ ok: true });
});

// ──────────────────────────────────────────────────────────────────────────
// PLATFORM ADMIN — one-click test mode
// ──────────────────────────────────────────────────────────────────────────
router.post('/test-config', async (req, res) => {
  if (!req.user?.isPlatformAdmin) return res.status(403).json({ error: 'Platform admin only' });
  try {
    const { keyId, keySecret, webhookSecret } = req.body || {};
    const result = await applyTestMode({ keyId, keySecret, webhookSecret, updatedBy: req.user.email });
    audit({ req, action: 'platform.razorpay.test_mode', resource: 'settings', metadata: { keyId } });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
