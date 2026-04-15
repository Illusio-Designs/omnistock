const { Router } = require('express');
const {
  authenticate, requireTenant, requirePermission,
} = require('../middleware/auth.middleware');
const prisma = require('../utils/prisma');

const router = Router();
router.use(authenticate, requireTenant);

router.get('/', requirePermission('customers.read'), async (req, res) => {
  const { search, page = '1', limit = '20' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = { tenantId: req.tenant.id };
  if (search) where.OR = [
    { name: { contains: String(search) } },
    { email: { contains: String(search) } },
  ];
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' } }),
    prisma.customer.count({ where }),
  ]);
  res.json({ customers, total });
});

router.get('/:id', requirePermission('customers.read'), async (req, res) => {
  const c = await prisma.customer.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
    include: { orders: { take: 10, orderBy: { createdAt: 'desc' } } },
  });
  if (!c) { res.status(404).json({ error: 'Customer not found' }); return; }
  res.json(c);
});

router.post('/', requirePermission('customers.create'), async (req, res) => {
  const c = await prisma.customer.create({
    data: { ...req.body, tenantId: req.tenant.id },
  });
  res.status(201).json(c);
});

router.put('/:id', requirePermission('customers.update'), async (req, res) => {
  const existing = await prisma.customer.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
  });
  if (!existing) return res.status(404).json({ error: 'Customer not found' });
  const c = await prisma.customer.update({ where: { id: req.params.id }, data: req.body });
  res.json(c);
});

router.delete('/:id', requirePermission('customers.delete'), async (req, res) => {
  const existing = await prisma.customer.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
  });
  if (!existing) return res.status(404).json({ error: 'Customer not found' });
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.json({ message: 'Customer deleted' });
});

module.exports = router;
