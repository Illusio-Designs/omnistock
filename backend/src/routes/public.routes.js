const { Router } = require('express');
const prisma = require('../utils/prisma');
const { CATALOG } = require('../data/channel-catalog');

const router = Router();

// Public content (CMS for marketing pages) — grouped by type.
// Usage: GET /api/v1/public/content?type=FEATURE
router.get('/content', async (req, res) => {
  const where = { isActive: true };
  if (req.query.type) where.type = String(req.query.type);
  const items = await prisma.publicContent.findMany({
    where,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(items);
});

// Platform-wide marketing stats for the landing page.
// All numbers are real aggregates — channel count comes from the integration
// catalog, orders/tenants come from the DB.
router.get('/stats', async (_req, res) => {
  try {
    const [totalOrders, totalTenants] = await Promise.all([
      prisma.order.count(),
      prisma.tenant.count({ where: { status: { in: ['ACTIVE', 'TRIAL'] } } }),
    ]);
    const channelsCount = (CATALOG || []).filter((c) => c.integrated).length;
    const logisticsCount = (CATALOG || []).filter((c) => c.integrated && c.category === 'LOGISTICS').length;
    res.json({
      channelsCount,
      logisticsCount,
      totalOrders,
      totalTenants,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Published blog posts
router.get('/blog', async (_req, res) => {
  const posts = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true, slug: true, title: true, excerpt: true, coverImage: true,
      authorName: true, tags: true, publishedAt: true,
    },
  });
  res.json(posts);
});

router.get('/blog/:slug', async (req, res) => {
  const post = await prisma.blogPost.findUnique({ where: { slug: req.params.slug } });
  if (!post || post.status !== 'PUBLISHED') return res.status(404).json({ error: 'Not found' });
  res.json(post);
});

// SEO settings for a path
router.get('/seo', async (req, res) => {
  const path = req.query.path || '/';
  const seo = await prisma.seoSetting.findUnique({ where: { path: String(path) } });
  res.json(seo || null);
});

// sitemap.xml entries (paths + posts)
router.get('/sitemap', async (_req, res) => {
  const [seo, posts] = await Promise.all([
    prisma.seoSetting.findMany({ select: { path: true, updatedAt: true } }),
    prisma.blogPost.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
  ]);
  res.json({
    paths: seo,
    posts: posts.map(p => ({ path: `/blog/${p.slug}`, updatedAt: p.updatedAt })),
  });
});

module.exports = router;
