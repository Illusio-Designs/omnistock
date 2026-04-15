const { Router } = require('express');
const {
  authenticate, requireTenant, requirePermission,
} = require('../middleware/auth.middleware');
const prisma = require('../utils/prisma');

const router = Router();
router.use(authenticate, requireTenant);

router.get('/', requirePermission('shipments.read'), async (req, res) => {
  const { status } = req.query;
  const where = { tenantId: req.tenant.id };
  if (status) where.status = String(status);
  const shipments = await prisma.shipment.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json(shipments);
});

router.post('/', requirePermission('shipments.create'), async (req, res) => {
  const s = await prisma.shipment.create({
    data: { ...req.body, tenantId: req.tenant.id },
  });
  res.status(201).json(s);
});

router.patch('/:id/status', requirePermission('shipments.update'), async (req, res) => {
  const existing = await prisma.shipment.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
  });
  if (!existing) return res.status(404).json({ error: 'Shipment not found' });
  const s = await prisma.shipment.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
  });
  res.json(s);
});

module.exports = router;
