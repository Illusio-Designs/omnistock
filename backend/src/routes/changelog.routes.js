const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const { authenticate, requirePlatformAdmin } = require('../middleware/auth.middleware');

const router = Router();

const TAGS = ['feature', 'fix', 'security', 'improve'];

// ── Public: list published entries (newest first) ──────────────────
// Read by the in-app "What's new" drawer. Cached for 60s on the
// browser since changelog content updates rarely.
router.get('/', async (_req, res) => {
  try {
    const entries = await prisma.changelogEntry.findMany({
      where: { isPublished: true },
      orderBy: { publishedAt: 'desc' },
    });
    const list = (entries || []).map((e) => ({
      id: e.id,
      title: e.title,
      tag: e.tag,
      // Stored as JSON; the prisma shim returns it as a string in some paths.
      highlights: typeof e.highlights === 'string'
        ? safeParse(e.highlights, [])
        : (e.highlights || []),
      date: e.publishedAt || e.createdAt,
    }));
    res.set('Cache-Control', 'public, max-age=60');
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: full CRUD ────────────────────────────────────────────────
const adminRouter = Router();
adminRouter.use(authenticate, requirePlatformAdmin);

const writeSchema = z.object({
  title: z.string().trim().min(1).max(190),
  tag: z.enum(TAGS).default('feature'),
  highlights: z.array(z.string().trim().min(1).max(500)).min(1, 'At least one highlight'),
  isPublished: z.boolean().optional().default(false),
  publishedAt: z.union([z.string(), z.date(), z.null()]).optional(),
});

adminRouter.get('/', async (_req, res) => {
  const entries = await prisma.changelogEntry.findMany({
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  });
  res.json((entries || []).map((e) => ({
    ...e,
    highlights: typeof e.highlights === 'string' ? safeParse(e.highlights, []) : (e.highlights || []),
  })));
});

adminRouter.get('/:id', async (req, res) => {
  const e = await prisma.changelogEntry.findFirst({ where: { id: req.params.id } });
  if (!e) return res.status(404).json({ error: 'Not found' });
  res.json({
    ...e,
    highlights: typeof e.highlights === 'string' ? safeParse(e.highlights, []) : (e.highlights || []),
  });
});

adminRouter.post('/', async (req, res) => {
  try {
    const data = writeSchema.parse(req.body);
    const now = new Date();
    const entry = await prisma.changelogEntry.create({
      data: {
        title: data.title,
        tag: data.tag,
        highlights: JSON.stringify(data.highlights),
        isPublished: !!data.isPublished,
        publishedAt: data.isPublished ? (data.publishedAt ? new Date(data.publishedAt) : now) : null,
      },
    });
    res.status(201).json(entry);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

adminRouter.patch('/:id', async (req, res) => {
  try {
    const existing = await prisma.changelogEntry.findFirst({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Not found' });

    const data = writeSchema.partial().parse(req.body);
    const patch = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.tag !== undefined) patch.tag = data.tag;
    if (data.highlights !== undefined) patch.highlights = JSON.stringify(data.highlights);
    if (data.isPublished !== undefined) {
      patch.isPublished = !!data.isPublished;
      // Stamp publishedAt the first time we flip to published; clear when
      // unpublishing so listing/order behaviour stays consistent.
      if (data.isPublished && !existing.publishedAt) patch.publishedAt = new Date();
      if (!data.isPublished) patch.publishedAt = null;
    }
    if (data.publishedAt !== undefined && data.isPublished !== false) {
      patch.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
    }

    const entry = await prisma.changelogEntry.update({
      where: { id: req.params.id },
      data: patch,
    });
    res.json(entry);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors });
    res.status(500).json({ error: err.message });
  }
});

adminRouter.delete('/:id', async (req, res) => {
  const existing = await prisma.changelogEntry.findFirst({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });
  await prisma.changelogEntry.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

router.use('/admin', adminRouter);

function safeParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

module.exports = router;
