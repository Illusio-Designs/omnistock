const { Router } = require('express');
const {
  authenticate, requireTenant, requirePermission, requireFeature,
} = require('../middleware/auth.middleware');
const prisma = require('../utils/prisma');

const router = Router();
router.use(authenticate, requireTenant);

// Purchase management is gated behind the plan feature flag
router.use(requireFeature('purchaseManagement'));

const generatePONumber = () => `PO-${Date.now()}`;

router.get('/', requirePermission('purchases.read'), async (req, res) => {
  const { status, page = '1', limit = '20' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = { tenantId: req.tenant.id };
  if (status) where.status = String(status);
  const [pos, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where, skip, take: Number(limit),
      include: { vendor: true, items: { include: { variant: { include: { product: true } } } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.purchaseOrder.count({ where }),
  ]);
  res.json({ purchaseOrders: pos, total });
});

router.get('/:id', requirePermission('purchases.read'), async (req, res) => {
  const po = await prisma.purchaseOrder.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
    include: { vendor: true, items: { include: { variant: { include: { product: true } } } } },
  });
  if (!po) { res.status(404).json({ error: 'Purchase order not found' }); return; }
  res.json(po);
});

router.post('/', requirePermission('purchases.create'), async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const { vendorId, expectedDate, notes, items } = req.body;

    // Ownership checks
    const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, tenantId } });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const variantIds = items.map((i) => i.variantId);
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds }, tenantId }, select: { id: true },
    });
    if (variants.length !== variantIds.length) {
      return res.status(400).json({ error: 'One or more variants do not belong to your tenant' });
    }

    const totalAmount = items.reduce((s, i) => s + i.unitCost * i.orderedQty, 0);
    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        poNumber: generatePONumber(),
        vendorId,
        expectedDate: expectedDate ? new Date(expectedDate) : undefined,
        notes,
        totalAmount,
        createdById: req.user.id,
        items: {
          create: items.map((i) => ({
            tenantId,
            variantId: i.variantId,
            orderedQty: i.orderedQty,
            unitCost: i.unitCost,
            totalCost: i.unitCost * i.orderedQty,
          })),
        },
      },
      include: { vendor: true, items: true },
    });
    res.status(201).json(po);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/status', requirePermission('purchases.update'), async (req, res) => {
  const existing = await prisma.purchaseOrder.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
  });
  if (!existing) return res.status(404).json({ error: 'Purchase order not found' });
  const po = await prisma.purchaseOrder.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
  });
  res.json(po);
});

module.exports = router;
