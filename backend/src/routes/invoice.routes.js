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
  try {
    const tenantId = req.tenant.id;
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status === 'PAID') return res.status(400).json({ error: 'Invoice is already paid' });
    if (invoice.status === 'CANCELLED') return res.status(400).json({ error: 'Cannot pay a cancelled invoice' });

    const { amount, method, reference, paymentReference } = req.body;
    const payAmount = Number(amount) || Number(invoice.total);
    const payment = await prisma.payment.create({
      data: {
        tenantId,
        invoiceId: req.params.id,
        amount: payAmount,
        method: method || 'MANUAL',
        reference: reference || paymentReference || null,
      },
    });

    // Mark fully paid only when payment covers the full outstanding amount
    const paidSoFar = (invoice.payments || []).reduce((s, p) => s + Number(p.amount), 0) + payAmount;
    const newStatus = paidSoFar >= Number(invoice.total) ? 'PAID' : 'PARTIALLY_PAID';
    await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: newStatus, ...(newStatus === 'PAID' ? { paidAt: new Date() } : {}) },
    });
    res.json(payment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requirePermission('invoices.delete'), async (req, res) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId: req.tenant.id },
    });
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (invoice.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Only draft invoices can be deleted' });
    }
    await prisma.invoice.delete({ where: { id: req.params.id } });
    res.json({ message: 'Invoice deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
