const { Router } = require('express');
const {
  authenticate, requireTenant, requirePermission,
} = require('../middleware/auth.middleware');
const prisma = require('../utils/prisma');

const router = Router();
router.use(authenticate, requireTenant);

router.get('/', requirePermission('invoices.read'), async (req, res) => {
  const { status, type, page = '1', limit = '20' } = req.query;
  const skip = (Number(page) - 1) * Number(limit);
  const where = { tenantId: req.tenant.id };
  if (status) where.status = String(status);
  if (type) where.type = String(type);
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({ where, skip, take: Number(limit), include: { payments: true }, orderBy: { createdAt: 'desc' } }),
    prisma.invoice.count({ where }),
  ]);
  res.json({ invoices, total });
});

router.get('/:id', requirePermission('invoices.read'), async (req, res) => {
  const inv = await prisma.invoice.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
    include: { payments: true, order: true, purchaseOrder: true },
  });
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  res.json(inv);
});

router.post('/:id/pay', requirePermission('invoices.update'), async (req, res) => {
  const tenantId = req.tenant.id;
  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id, tenantId },
  });
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const { amount, method, reference } = req.body;
  const payment = await prisma.payment.create({
    data: { tenantId, invoiceId: req.params.id, amount, method, reference },
  });
  await prisma.invoice.update({
    where: { id: req.params.id },
    data: { status: 'PAID', paidAt: new Date() },
  });
  res.json(payment);
});

module.exports = router;
