const { Router } = require('express');
const {
  authenticate, requireTenant, requirePermission, enforceLimit,
} = require('../middleware/auth.middleware');
const prisma = require('../utils/prisma');

const router = Router();
router.use(authenticate, requireTenant);

router.get('/', requirePermission('warehouses.read'), async (req, res) => {
  const wh = await prisma.warehouse.findMany({
    where: { tenantId: req.tenant.id, isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json(wh);
});

router.get('/:id', requirePermission('warehouses.read'), async (req, res) => {
  const wh = await prisma.warehouse.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
    include: { inventoryItems: { include: { variant: { include: { product: true } } } } },
  });
  if (!wh) { res.status(404).json({ error: 'Warehouse not found' }); return; }
  res.json(wh);
});

router.post('/',
  requirePermission('warehouses.create'),
  enforceLimit('warehouses'),
  async (req, res) => {
    try {
      const wh = await prisma.warehouse.create({
        data: { ...req.body, tenantId: req.tenant.id },
      });
      res.status(201).json(wh);
    } catch (err) {
      if (err.code === 'P2002') return res.status(409).json({ error: 'Warehouse code already exists' });
      res.status(500).json({ error: err.message });
    }
  });

router.put('/:id', requirePermission('warehouses.update'), async (req, res) => {
  const existing = await prisma.warehouse.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
  });
  if (!existing) return res.status(404).json({ error: 'Warehouse not found' });
  const wh = await prisma.warehouse.update({ where: { id: req.params.id }, data: req.body });
  res.json(wh);
});

router.delete('/:id', requirePermission('warehouses.delete'), async (req, res) => {
  const existing = await prisma.warehouse.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
  });
  if (!existing) return res.status(404).json({ error: 'Warehouse not found' });
  await prisma.warehouse.update({ where: { id: req.params.id }, data: { isActive: false } });
  res.json({ message: 'Warehouse deactivated' });
});

module.exports = router;
