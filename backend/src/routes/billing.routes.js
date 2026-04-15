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

// Usage snapshot for current period
router.get('/usage', async (req, res) => {
  const tenantId = req.tenant.id;
  const period = new Date().toISOString().slice(0, 7);

  const [warehouses, products, users, roles, ordersMeter] = await Promise.all([
    prisma.warehouse.count({ where: { tenantId } }),
    prisma.product.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId } }),
    prisma.tenantRole.count({ where: { tenantId, isSystem: false } }),
    prisma.usageMeter.findUnique({
      where: { tenantId_metric_period: { tenantId, metric: 'orders', period } },
    }),
  ]);

  res.json({
    period,
    plan: req.plan,
    used: {
      facilities: warehouses,
      skus: products,
      users,
      roles,
      ordersThisPeriod: ordersMeter?.count || 0,
    },
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
