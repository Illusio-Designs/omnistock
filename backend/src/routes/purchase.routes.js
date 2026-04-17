const { Router } = require('express');
const { z } = require('zod');
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

const poItemSchema = z.object({
  variantId: z.string().optional(),
  sku: z.string().optional(),
  productName: z.string().optional(),
  orderedQty: z.number().int().min(1).optional(),
  quantity: z.number().int().min(1).optional(),
  qty: z.number().int().min(1).optional(),
  unitCost: z.number().min(0),
}).refine((i) => i.variantId || i.sku || i.productName,
  { message: 'Item needs variantId, sku, or productName' });

const poSchema = z.object({
  vendorId: z.string().min(1),
  expectedDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(poItemSchema).min(1),
});

router.post('/', requirePermission('purchases.create'), async (req, res) => {
  try {
    const data = poSchema.parse(req.body);
    const tenantId = req.tenant.id;
    const { vendorId, expectedDate, notes, items } = data;

    const vendor = await prisma.vendor.findFirst({ where: { id: vendorId, tenantId } });
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    // Resolve variants by SKU if variantId not provided
    const resolved = [];
    for (const raw of items) {
      const orderedQty = Number(raw.orderedQty ?? raw.quantity ?? raw.qty ?? 1);
      let variantId = raw.variantId;
      if (!variantId && raw.sku) {
        const v = await prisma.productVariant.findFirst({
          where: { tenantId, sku: String(raw.sku) }, select: { id: true },
        });
        if (v) variantId = v.id;
      }
      if (!variantId) {
        return res.status(400).json({ error: `No variant found for item "${raw.sku || raw.productName}" — create the product first` });
      }
      // Verify tenant ownership
      const owned = await prisma.productVariant.findFirst({
        where: { id: variantId, tenantId }, select: { id: true },
      });
      if (!owned) return res.status(400).json({ error: 'Variant does not belong to your tenant' });
      resolved.push({ variantId, orderedQty, unitCost: Number(raw.unitCost) });
    }

    const totalAmount = resolved.reduce((s, i) => s + i.unitCost * i.orderedQty, 0);
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
          create: resolved.map((i) => ({
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
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PO_STATUSES = ['DRAFT', 'SENT', 'CONFIRMED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED'];
const poStatusSchema = z.object({ status: z.enum(PO_STATUSES) });

router.patch('/:id/status', requirePermission('purchases.update'), async (req, res) => {
  try {
    const { status } = poStatusSchema.parse(req.body);
    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    if (!existing) return res.status(404).json({ error: 'Purchase order not found' });
    const po = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(po);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
