const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const { authenticate, requirePlatformAdmin } = require('../middleware/auth.middleware');

const router = Router();

// ── Public submission ──────────────────────────────────────────────
// No auth — used by the demo modal, contact form, and pricing CTAs.
// Lightly rate-limited per IP at a higher level (see app-level limiter
// in index.js). All writes are stored as status=NEW for the founder
// admin to triage.

const SOURCES = ['demo', 'contact', 'pricing', 'footer', 'other'];

const createSchema = z.object({
  name:    z.string().trim().min(1).max(120),
  email:   z.string().trim().email().max(190),
  phone:   z.string().trim().max(40).optional().nullable(),
  company: z.string().trim().max(190).optional().nullable(),
  subject: z.string().trim().max(190).optional().nullable(),
  message: z.string().trim().max(5000).optional().nullable(),
  source:  z.enum(SOURCES).optional().default('demo'),
  metadata: z.record(z.any()).optional().nullable(),
});

router.post('/', async (req, res) => {
  try {
    const data = createSchema.parse(req.body);
    const ipHeader = req.headers['x-forwarded-for'];
    const ip = (typeof ipHeader === 'string' ? ipHeader.split(',')[0].trim() : null)
      || req.ip || req.socket?.remoteAddress || null;
    const ua = req.get('user-agent') || null;

    const lead = await prisma.lead.create({
      data: {
        ...data,
        ip: ip ? String(ip).slice(0, 64) : null,
        userAgent: ua ? String(ua).slice(0, 500) : null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        status: 'NEW',
      },
    });

    res.status(201).json({ id: lead.id, ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// ── Admin (platform-admin only) ───────────────────────────────────
const adminRouter = Router();
adminRouter.use(authenticate, requirePlatformAdmin);

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'];

adminRouter.get('/', async (req, res) => {
  const { search, status, source, page = '1', limit = '20' } = req.query;
  const take = Math.min(100, Number(limit) || 20);
  const skip = (Math.max(1, Number(page)) - 1) * take;

  const where = {};
  if (status && STATUSES.includes(String(status))) where.status = String(status);
  if (source && SOURCES.includes(String(source))) where.source = String(source);
  if (search) where.OR = [
    { name:    { contains: String(search) } },
    { email:   { contains: String(search) } },
    { company: { contains: String(search) } },
  ];

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    prisma.lead.count({ where }),
  ]);

  // Counts by status for the admin filter pills
  const all = await prisma.lead.findMany({ where: {}, select: { status: true } });
  const counts = STATUSES.reduce((acc, s) => { acc[s] = 0; return acc; }, { ALL: all.length });
  for (const r of all) if (counts[r.status] !== undefined) counts[r.status] += 1;

  res.json({ leads, total, page: Number(page), limit: take, counts });
});

adminRouter.get('/:id', async (req, res) => {
  const lead = await prisma.lead.findFirst({ where: { id: req.params.id } });
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
});

const updateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  notes:  z.string().max(5000).optional().nullable(),
});

adminRouter.patch('/:id', async (req, res) => {
  try {
    const data = updateSchema.parse(req.body);
    const existing = await prisma.lead.findFirst({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Lead not found' });

    const patch = { ...data };
    if (data.status === 'CONTACTED' && !existing.contactedAt) {
      patch.contactedAt = new Date();
    }

    const lead = await prisma.lead.update({ where: { id: req.params.id }, data: patch });
    res.json(lead);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

adminRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.lead.findFirst({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Lead not found' });
  await prisma.lead.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.use('/admin', adminRouter);

module.exports = router;
