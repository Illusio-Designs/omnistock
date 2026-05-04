const { Router } = require('express');
const prisma = require('../utils/prisma');
const {
  authenticate, requireTenant, requirePermission, invalidateUserCache,
} = require('../middleware/auth.middleware');
const { audit } = require('../services/audit.service');
const wallet = require('../services/wallet.service');

const router = Router();
router.use(authenticate, requireTenant);

// ── Wallet endpoints ────────────────────────────────────────────────────────
router.get('/wallet', requirePermission('billing.read'), async (req, res) => {
  try {
    const w = await wallet.getOrCreateWallet(req.tenant.id);
    const low = Number(w.balance) < Number(w.lowBalanceThreshold);
    res.json({
      id: w.id,
      balance: Number(w.balance),
      currency: w.currency,
      lowBalanceThreshold: Number(w.lowBalanceThreshold),
      lowBalance: low,
      autoTopupEnabled: !!w.autoTopupEnabled,
      autoTopupAmount: w.autoTopupAmount ? Number(w.autoTopupAmount) : null,
      autoTopupTriggerBelow: w.autoTopupTriggerBelow ? Number(w.autoTopupTriggerBelow) : null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/wallet/transactions', requirePermission('billing.read'), async (req, res) => {
  try {
    const limit = Math.min(200, Number(req.query.limit) || 50);
    const txns = await wallet.history(req.tenant.id, limit);
    res.json(txns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Direct wallet top-up — for use by:
//   1. Platform admins doing manual credits / refunds (audited)
//   2. Internal callers (autopay job, /payments/wallet-verify) which
//      pass a verified Razorpay paymentId — checked here against the
//      Razorpay API before crediting.
//
// Tenants cannot self-credit by calling this endpoint directly with an
// invented paymentRef — the payment is fetched from Razorpay and rejected
// unless its status === 'captured' AND the amount matches.
router.post('/wallet/topup', requirePermission('billing.manage'), async (req, res) => {
  try {
    const { amount, paymentRef, description } = req.body || {};
    if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount must be positive' });

    const isPlatformAdmin = !!req.user?.isPlatformAdmin;

    // Non-admins MUST provide a captured Razorpay paymentRef whose amount
    // matches what they're crediting. This blocks the "free money" attack
    // where a tenant admin self-credits with a fake paymentRef.
    if (!isPlatformAdmin) {
      if (!paymentRef) {
        return res.status(403).json({ error: 'paymentRef required (verified payment gateway transaction). Use /payments/wallet-checkout to start a Razorpay flow.' });
      }
      try {
        const { getClient, getCreds } = require('../services/payment.service');
        const client = await getClient();
        const { isLive } = await getCreds();
        // In stub/dev mode (no live Razorpay creds) we permit the legacy path
        // so e2e tests still work; in prod we require verification.
        if (isLive && client) {
          const payment = await client.payments.fetch(paymentRef);
          if (!payment || payment.status !== 'captured') {
            return res.status(400).json({ error: 'Payment not captured at gateway' });
          }
          const expectedPaise = Math.round(Number(amount) * 100);
          if (Number(payment.amount) !== expectedPaise) {
            return res.status(400).json({ error: 'Amount mismatch with Razorpay payment' });
          }
          // Confirm the payment is for this tenant via order notes
          if (payment.notes?.tenantId && payment.notes.tenantId !== req.tenant.id) {
            return res.status(403).json({ error: 'Payment belongs to a different tenant' });
          }
        } else if (process.env.NODE_ENV === 'production') {
          return res.status(503).json({ error: 'Payment gateway not configured; cannot verify topup' });
        }
      } catch (err) {
        return res.status(400).json({ error: 'Failed to verify payment with gateway: ' + (err?.error?.description || err.message) });
      }
    }

    const result = await wallet.topup(req.tenant.id, Number(amount), {
      paymentRef: paymentRef || null,
      description: description || (isPlatformAdmin ? 'Manual top-up (platform admin)' : 'Top-up'),
      createdById: req.user.id,
      type: 'TOPUP',
    });
    audit({
      req,
      action: isPlatformAdmin ? 'wallet.topup.admin' : 'wallet.topup.razorpay',
      resource: 'wallet',
      resourceId: result.transactionId,
      metadata: { amount, paymentRef, byPlatformAdmin: isPlatformAdmin },
    });
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/wallet/settings', requirePermission('billing.manage'), async (req, res) => {
  try {
    const { lowBalanceThreshold, autoTopupEnabled, autoTopupAmount, autoTopupTriggerBelow } = req.body || {};
    const updates = [];
    const values = [];
    if (lowBalanceThreshold != null)     { updates.push('lowBalanceThreshold = ?'); values.push(Number(lowBalanceThreshold)); }
    if (autoTopupEnabled != null)        { updates.push('autoTopupEnabled = ?'); values.push(autoTopupEnabled ? 1 : 0); }
    if (autoTopupAmount != null)         { updates.push('autoTopupAmount = ?'); values.push(Number(autoTopupAmount)); }
    if (autoTopupTriggerBelow != null)   { updates.push('autoTopupTriggerBelow = ?'); values.push(Number(autoTopupTriggerBelow)); }
    if (!updates.length) return res.json({ ok: true });

    values.push(req.tenant.id);
    await prisma.$executeRawUnsafe(
      `UPDATE tenant_wallets SET ${updates.join(', ')}, updatedAt = NOW(3) WHERE tenantId = ?`,
      ...values
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update tenant company info (name, GSTIN)
router.patch('/tenant', requirePermission('billing.manage'), async (req, res) => {
  try {
    const { businessName, gstin } = req.body;
    const data = {};
    if (businessName != null) data.businessName = String(businessName).trim().slice(0, 191);
    if (gstin != null) data.gstin = String(gstin).trim().slice(0, 20);
    if (!Object.keys(data).length) return res.json({ ok: true });
    await prisma.tenant.update({ where: { id: req.tenant.id }, data });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Current subscription + plan
router.get('/subscription', requirePermission('billing.read'), async (req, res) => {
  const sub = await prisma.subscription.findUnique({
    where: { tenantId: req.tenant.id },
    include: { plan: true },
  });
  res.json(sub);
});

// Usage snapshot for current period — includes overage + PAYG charges
router.get('/usage', requirePermission('billing.read'), async (req, res) => {
  const tenantId = req.tenant.id;
  const period = new Date().toISOString().slice(0, 7);

  // Load the full subscription row — req.subscription from auth middleware
  // only carries {id, status, payAsYouGo, currentPeriodEnd}, missing the
  // auto-renew fields. Hit the DB directly here so the API surfaces them.
  const fullSub = await prisma.subscription.findUnique({ where: { tenantId } });

  const [warehouses, products, users, roles, channels, ordersMeter] = await Promise.all([
    prisma.warehouse.count({ where: { tenantId } }),
    prisma.product.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId } }),
    prisma.tenantRole.count({ where: { tenantId, isSystem: false } }),
    prisma.channel.count({ where: { tenantId, isActive: true } }),
    prisma.usageMeter.findUnique({
      where: { tenantId_metric_period: { tenantId, metric: 'orders', period } },
    }),
  ]);

  const plan = req.plan || {};
  const subscription = req.subscription || {};
  const ordersThisPeriod = ordersMeter?.count || 0;
  const maxOrders = plan.maxOrdersPerMonth;
  const maxSkus = plan.maxSkus;
  const maxUsers = plan.maxUsers;
  const maxFacilities = plan.maxFacilities;
  const maxChannels = plan.features?.maxChannels ?? null;

  // Calculate overage — each metric over limit, priced per the plan's meteredRates
  const rates = plan.meteredRates || {};
  const overage = {
    orders: maxOrders != null && ordersThisPeriod > maxOrders ? ordersThisPeriod - maxOrders : 0,
    skus:   maxSkus != null && products > maxSkus ? products - maxSkus : 0,
    users:  maxUsers != null && users > maxUsers ? users - maxUsers : 0,
    channels: maxChannels != null && channels > maxChannels ? channels - maxChannels : 0,
  };
  const overageCharges = {
    orders:   overage.orders * Number(rates.extraOrders || 0),
    skus:     overage.skus * Number(rates.extraSkus || 0),
    users:    overage.users * Number(rates.extraUsers || 0),
    channels: overage.channels * Number(rates.extraChannels || 0),
  };
  const totalOverageCost = Object.values(overageCharges).reduce((a, b) => a + b, 0);

  // Wallet info (lazy-create if missing)
  const walletInfo = await wallet.getOrCreateWallet(tenantId).catch(() => null);

  res.json({
    period,
    plan,
    subscription: {
      status: subscription.status,
      payAsYouGo: !!subscription.payAsYouGo,
      autoRenew: !!(fullSub?.autoRenew),
      currentPeriodEnd: subscription.currentPeriodEnd,
      lastRenewalAt: fullSub?.lastRenewalAt || null,
      lastRenewalError: fullSub?.lastRenewalError || null,
      renewalFailureCount: fullSub?.renewalFailureCount || 0,
    },
    wallet: walletInfo ? {
      balance: Number(walletInfo.balance),
      currency: walletInfo.currency,
      lowBalance: Number(walletInfo.balance) < Number(walletInfo.lowBalanceThreshold),
      lowBalanceThreshold: Number(walletInfo.lowBalanceThreshold),
    } : null,
    used: {
      facilities: warehouses,
      skus: products,
      users,
      roles,
      channels,
      ordersThisPeriod,
    },
    limits: {
      facilities: maxFacilities,
      skus: maxSkus,
      users: maxUsers,
      ordersPerMonth: maxOrders,
      channels: maxChannels,
    },
    overage,
    overageCharges,
    totalOverageCost,
    rates,
  });
});

// Change plan (upgrade/downgrade) — payment provider stub
router.post('/subscription/change', requirePermission('billing.manage'), async (req, res) => {
  const { planCode, billingCycle, payAsYouGo } = req.body;
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });

  const updated = await prisma.subscription.update({
    where: { tenantId: req.tenant.id },
    data: {
      planId: plan.id,
      billingCycle: billingCycle || 'MONTHLY',
      payAsYouGo: !!payAsYouGo,
      status: 'ACTIVE',
    },
    include: { plan: true },
  });
  invalidateUserCache(req.user.id);
  audit({ req, action: 'billing.change_plan', resource: 'subscription', resourceId: updated.id, metadata: { planCode, billingCycle, payAsYouGo } });
  res.json(updated);
});

// Toggle pay-as-you-go
router.post('/subscription/payg', requirePermission('billing.manage'), async (req, res) => {
  const updated = await prisma.subscription.update({
    where: { tenantId: req.tenant.id },
    data: { payAsYouGo: !!req.body.enabled },
  });
  invalidateUserCache(req.user.id);
  res.json(updated);
});

// Toggle auto-renew (autopay for the plan itself). When ON, the billing job
// charges the tenant's default saved Razorpay token at the end of each
// billing cycle so the plan keeps running without manual checkout.
router.post('/subscription/auto-renew', requirePermission('billing.manage'), async (req, res) => {
  const updated = await prisma.subscription.update({
    where: { tenantId: req.tenant.id },
    data: { autoRenew: !!req.body.enabled, lastRenewalError: req.body.enabled ? null : undefined },
  });
  audit({ req, action: 'billing.auto_renew', resource: 'subscription', resourceId: updated.id, metadata: { enabled: !!req.body.enabled } });
  res.json(updated);
});

// Cancel
router.post('/subscription/cancel', requirePermission('billing.manage'), async (req, res) => {
  const updated = await prisma.subscription.update({
    where: { tenantId: req.tenant.id },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
  res.json(updated);
});

// Tenant audit log (own tenant only)
router.get('/audit', requirePermission('settings.read'), async (req, res) => {
  const logs = await prisma.auditLog.findMany({
    where: { tenantId: req.tenant.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  res.json(logs);
});

// Billing invoices history
router.get('/invoices', requirePermission('billing.read'), async (req, res) => {
  const list = await prisma.billingInvoice.findMany({
    where: { tenantId: req.tenant.id },
    orderBy: { createdAt: 'desc' },
  });
  res.json(list);
});

module.exports = router;
