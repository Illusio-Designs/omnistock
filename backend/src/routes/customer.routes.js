const { Router } = require('express');
const { z } = require('zod');
const {
  authenticate, requireTenant, requirePermission,
} = require('../middleware/auth.middleware');
const prisma = require('../utils/prisma');

const router = Router();
router.use(authenticate, requireTenant);

const createSchema = z.object({
  name:    z.string().min(1).max(200),
  email:   z.string().email().max(200).optional().nullable(),
  phone:   z.string().max(30).optional().nullable(),
  gstIn:   z.string().max(20).optional().nullable(),
  isB2B:   z.boolean().optional().default(false),
  address: z.any().optional(),
  city:    z.string().max(100).optional().nullable(),
  state:   z.string().max(100).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
});
const updateSchema = createSchema.partial();

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
  try {
    const data = createSchema.parse(req.body);
    const c = await prisma.customer.create({
      data: { ...data, tenantId: req.tenant.id },
    });
    res.status(201).json(c);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requirePermission('customers.update'), async (req, res) => {
  try {
    const data = updateSchema.parse(req.body);
    const existing = await prisma.customer.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    const c = await prisma.customer.update({ where: { id: req.params.id }, data });
    res.json(c);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
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
