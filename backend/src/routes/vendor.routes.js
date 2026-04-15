const { Router } = require('express');
const {
  authenticate, requireTenant, requirePermission, requireFeature,
} = require('../middleware/auth.middleware');
const prisma = require('../utils/prisma');

const router = Router();
router.use(authenticate, requireTenant);

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
    const v = await prisma.vendor.create({
      data: { ...req.body, tenantId: req.tenant.id },
    });
    res.status(201).json(v);
  });

router.put('/:id',
  requireFeature('vendorManagement'),
  requirePermission('vendors.update'),
  async (req, res) => {
    const existing = await prisma.vendor.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    if (!existing) return res.status(404).json({ error: 'Vendor not found' });
    const v = await prisma.vendor.update({ where: { id: req.params.id }, data: req.body });
    res.json(v);
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
