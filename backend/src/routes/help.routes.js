const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const { authenticate, requirePlatformAdmin } = require('../middleware/auth.middleware');

const router = Router();

// ── Public: list published FAQs (sorted) ───────────────────────────
// Read by the in-app Help & Support drawer. Cached for 60s — FAQ
// content updates rarely.
router.get('/faqs', async (_req, res) => {
  try {
    const items = await prisma.helpFaq.findMany({
      where: { isPublished: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    res.set('Cache-Control', 'public, max-age=60');
    res.json(items || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: full CRUD ────────────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(authenticate, requirePlatformAdmin);

const writeSchema = z.object({
  question: z.string().trim().min(3).max(255),
  answer: z.string().trim().min(3).max(20_000),
  category: z.string().trim().max(64).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isPublished: z.boolean().optional(),
});

adminRouter.get('/faqs', async (_req, res) => {
  const items = await prisma.helpFaq.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  res.json(items || []);
});

adminRouter.get('/faqs/:id', async (req, res) => {
  const item = await prisma.helpFaq.findFirst({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

adminRouter.post('/faqs', async (req, res) => {
  try {
    const data = writeSchema.parse(req.body);
    // Default new rows to the bottom of the list if no sortOrder was set.
    let sortOrder = data.sortOrder;
    if (sortOrder === undefined) {
      const max = await prisma.helpFaq.findFirst({ orderBy: { sortOrder: 'desc' } });
      sortOrder = (max?.sortOrder ?? -1) + 1;
    }
    const item = await prisma.helpFaq.create({
      data: {
        question: data.question,
        answer: data.answer,
        category: data.category || null,
        sortOrder,
        isPublished: data.isPublished ?? true,
      },
    });
    res.status(201).json(item);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

adminRouter.patch('/faqs/:id', async (req, res) => {
  try {
    const existing = await prisma.helpFaq.findFirst({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const data = writeSchema.partial().parse(req.body);
    const patch = {};
    if (data.question !== undefined) patch.question = data.question;
    if (data.answer !== undefined) patch.answer = data.answer;
    if (data.category !== undefined) patch.category = data.category || null;
    if (data.sortOrder !== undefined) patch.sortOrder = data.sortOrder;
    if (data.isPublished !== undefined) patch.isPublished = !!data.isPublished;

    const item = await prisma.helpFaq.update({
      where: { id: req.params.id },
      data: patch,
    });
    res.json(item);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

// Reorder — accepts an array of { id, sortOrder } pairs and updates them
// in a single batch. Used by the up/down arrows on the admin page.
adminRouter.post('/faqs/reorder', async (req, res) => {
  try {
    const schema = z.array(z.object({ id: z.string().min(1), sortOrder: z.number().int() }));
    const items = schema.parse(req.body);
    await Promise.all(items.map((it) =>
      prisma.helpFaq.update({ where: { id: it.id }, data: { sortOrder: it.sortOrder } })
    ));
    res.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

adminRouter.delete('/faqs/:id', async (req, res) => {
  const existing = await prisma.helpFaq.findFirst({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.helpFaq.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.use('/admin', adminRouter);

module.exports = router;
