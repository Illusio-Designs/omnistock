const { Router } = require('express');
const {
  authenticate, requireTenant, requirePermission,
} = require('../middleware/auth.middleware');
const prisma = require('../utils/prisma');

const router = Router();
router.use(authenticate, requireTenant);

router.get('/sales', requirePermission('reports.read'), async (req, res) => {
  const { from, to, channelId } = req.query;
  const where = { tenantId: req.tenant.id, status: { notIn: ['CANCELLED'] } };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(String(from));
    if (to)   where.createdAt.lte = new Date(String(to));
  }
  if (channelId) where.channelId = String(channelId);

  const [orders, revenue, avgOrder] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.aggregate({ where, _sum: { total: true } }),
    prisma.order.aggregate({ where, _avg: { total: true } }),
  ]);
  res.json({
    orders,
    revenue: revenue._sum.total || 0,
    avgOrder: avgOrder._avg.total || 0,
  });
});

router.get('/inventory-valuation', requirePermission('reports.read'), async (req, res) => {
  const items = await prisma.inventoryItem.findMany({
    where: { tenantId: req.tenant.id },
    include: { variant: true, warehouse: true },
  });
  const valuation = items.map((i) => ({ ...i, value: Number(i.variant.costPrice) * i.quantityOnHand }));
  const total = valuation.reduce((s, i) => s + i.value, 0);
  res.json({ items: valuation, totalValue: total });
});

router.get('/top-products', requirePermission('reports.read'), async (req, res) => {
  const { from, to } = req.query;
  const where = { tenantId: req.tenant.id };
  if (from || to) {
    where.order = { createdAt: {} };
    if (from) where.order.createdAt.gte = new Date(String(from));
    if (to)   where.order.createdAt.lte = new Date(String(to));
  }

  const top = await prisma.orderItem.groupBy({
    by: ['variantId'],
    where,
    _sum: { qty: true, total: true },
    orderBy: { _sum: { qty: 'desc' } },
    take: 10,
  });
  res.json(top);
});

module.exports = router;
