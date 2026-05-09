const { Router } = require('express');
const prisma = require('../utils/prisma');
const { authenticate, requireTenant } = require('../middleware/auth.middleware');
const { audit } = require('../services/audit.service');
const { notifyAdmins, notifyUser } = require('../services/notifications.service');

const router = Router();
router.use(authenticate, requireTenant);

// List my tenant's tickets
router.get('/', async (req, res) => {
  const tickets = await prisma.supportTicket.findMany({
    where: { tenantId: req.tenant.id },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  res.json(tickets);
});

// Get a single ticket with its full thread
router.get('/:id', async (req, res) => {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

// Open a ticket
router.post('/', async (req, res) => {
  try {
    const { subject, priority = 'NORMAL', body, category } = req.body;
    if (!subject || !body) return res.status(400).json({ error: 'subject and body are required' });

    const ticket = await prisma.supportTicket.create({
      data: {
        tenantId: req.tenant.id,
        userId: req.user.id,
        subject,
        priority,
        category: category || null,
        messages: {
          create: {
            authorId: req.user.id,
            authorName: req.user.name || req.user.email,
            isStaff: false,
            body,
          },
        },
      },
      include: { messages: true },
    });

    audit({ req, action: 'tickets.create', resource: 'ticket', resourceId: ticket.id });
    // Founder inbox: every new tenant ticket lands as a platform notification
    notifyAdmins({
      type: 'ticket.opened',
      category: 'tickets',
      severity: priority === 'URGENT' || priority === 'HIGH' ? 'warning' : 'info',
      title: `New ${priority?.toLowerCase() || 'normal'} ticket: ${subject}`,
      body: body.slice(0, 280),
      link: `/admin/tickets`,
      metadata: { ticketId: ticket.id, tenantId: req.tenant.id, userId: req.user.id },
    });
    res.status(201).json(ticket);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Tenant reply
router.post('/:id/reply', async (req, res) => {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
  });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (ticket.status === 'CLOSED') return res.status(400).json({ error: 'Ticket is closed' });

  const { body } = req.body;
  if (!body) return res.status(400).json({ error: 'body required' });

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: req.user.id,
        authorName: req.user.name || req.user.email,
        isStaff: false,
        body,
      },
    }),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: ticket.status === 'PENDING' ? 'OPEN' : ticket.status, updatedAt: new Date() },
    }),
  ]);
  audit({ req, action: 'tickets.reply', resource: 'ticket', resourceId: ticket.id });
  // Tenant replied → ping platform admins so they pick it back up.
  notifyAdmins({
    type: 'ticket.reply.tenant',
    category: 'tickets',
    severity: 'info',
    title: `Tenant reply on: ${ticket.subject}`,
    body: body.slice(0, 280),
    link: `/admin/tickets`,
    metadata: { ticketId: ticket.id, tenantId: req.tenant.id, userId: req.user.id },
  });
  res.json({ ok: true });
});

// Close my own ticket
router.post('/:id/close', async (req, res) => {
  const ticket = await prisma.supportTicket.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
  });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  await prisma.supportTicket.update({
    where: { id: ticket.id },
    data: { status: 'CLOSED' },
  });
  audit({ req, action: 'tickets.close', resource: 'ticket', resourceId: ticket.id });
  res.json({ ok: true });
});

module.exports = router;
