const { Router } = require('express');
const { z } = require('zod');
const {
  authenticate, requireTenant, requirePermission, requireFeature,
} = require('../middleware/auth.middleware');
const prisma = require('../utils/prisma');

const router = Router();
router.use(authenticate, requireTenant);

const createSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  gstin: z.string().max(20).optional().nullable(),
  paymentTerms: z.string().max(100).optional().nullable(),
  address: z.any().optional(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
});
const updateSchema = createSchema.partial().extend({
  isActive: z.boolean().optional(),
});

router.get('/', requirePermission('vendors.read'), async (req, res) => {
  const vendors = await prisma.vendor.findMany({
    where: { tenantId: req.tenant.id, isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json(vendors);
});

router.get('/:id', requirePermission('vendors.read'), async (req, res) => {
  const v = await prisma.vendor.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
    include: { purchaseOrders: { take: 10, orderBy: { createdAt: 'desc' } } },
  });
  if (!v) { res.status(404).json({ error: 'Vendor not found' }); return; }
  res.json(v);
});

// Vendor management is a premium feature per the plan matrix
router.post('/',
  requireFeature('vendorManagement'),
  requirePermission('vendors.create'),
  async (req, res) => {
    try {
      const data = createSchema.parse(req.body);
      const v = await prisma.vendor.create({
        data: { ...data, tenantId: req.tenant.id },
      });
      res.status(201).json(v);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(500).json({ error: err.message });
    }
  });

router.put('/:id',
  requireFeature('vendorManagement'),
  requirePermission('vendors.update'),
  async (req, res) => {
    try {
      const data = updateSchema.parse(req.body);
      const existing = await prisma.vendor.findFirst({
        where: { id: req.params.id, tenantId: req.tenant.id },
      });
      if (!existing) return res.status(404).json({ error: 'Vendor not found' });
      const v = await prisma.vendor.update({ where: { id: req.params.id }, data });
      res.json(v);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
      res.status(500).json({ error: err.message });
    }
  });

router.delete('/:id',
  requireFeature('vendorManagement'),
  requirePermission('vendors.delete'),
  async (req, res) => {
    const existing = await prisma.vendor.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    if (!existing) return res.status(404).json({ error: 'Vendor not found' });
    await prisma.vendor.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Vendor deactivated' });
  });

module.exports = router;
