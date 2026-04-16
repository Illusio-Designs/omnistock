const { Router } = require('express');
const prisma = require('../utils/prisma');
const {
  authenticate, requireTenant, requirePermission, invalidateUserCache,
} = require('../middleware/auth.middleware');
const { audit } = require('../services/audit.service');

const router = Router();
router.use(authenticate, requireTenant);

// Current subscription + plan
router.get('/subscription', async (req, res) => {
  const sub = await prisma.subscription.findUnique({
    where: { tenantId: req.tenant.id },
    include: { plan: true },
  });
  res.json(sub);
});

// Usage snapshot for current period — includes overage + PAYG charges
router.get('/usage', async (req, res) => {
  const tenantId = req.tenant.id;
  const period = new Date().toISOString().slice(0, 7);

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

  res.json({
    period,
    plan,
    subscription: {
      status: subscription.status,
      payAsYouGo: !!subscription.payAsYouGo,
      currentPeriodEnd: subscription.currentPeriodEnd,
    },
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
