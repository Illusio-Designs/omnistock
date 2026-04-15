const { Router } = require('express');
const prisma = require('../utils/prisma');
const { authenticate, requirePlatformAdmin } = require('../middleware/auth.middleware');
const settingsService = require('../services/settings.service');

const router = Router();
router.use(authenticate, requirePlatformAdmin);

// ── PLANS ───────────────────────────────────────────────
router.get('/plans', async (_req, res) => {
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(plans);
});

router.post('/plans', async (req, res) => {
  try {
    const plan = await prisma.plan.create({ data: req.body });
    res.status(201).json(plan);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/plans/:id', async (req, res) => {
  try {
    const plan = await prisma.plan.update({ where: { id: req.params.id }, data: req.body });
    res.json(plan);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/plans/:id', async (req, res) => {
  try {
    await prisma.plan.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── TENANTS ─────────────────────────────────────────────
router.get('/tenants', async (req, res) => {
  const { search, status } = req.query;
  const tenants = await prisma.tenant.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(search ? { businessName: { contains: String(search) } } : {}),
    },
    include: {
      subscription: { include: { plan: true } },
      _count: { select: { users: true, orders: true, products: true, warehouses: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json(tenants);
});

router.get('/tenants/:id', async (req, res) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: req.params.id },
    include: {
      subscription: { include: { plan: true } },
      users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      _count: { select: { orders: true, products: true, warehouses: true, vendors: true } },
    },
  });
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
  res.json(tenant);
});

router.put('/tenants/:id', async (req, res) => {
  const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data: req.body });
  res.json(tenant);
});

router.post('/tenants/:id/suspend', async (req, res) => {
  const t = await prisma.tenant.update({ where: { id: req.params.id }, data: { status: 'SUSPENDED' } });
  res.json(t);
});

router.post('/tenants/:id/activate', async (req, res) => {
  const t = await prisma.tenant.update({ where: { id: req.params.id }, data: { status: 'ACTIVE' } });
  res.json(t);
});

// Force-assign a plan
router.post('/tenants/:id/assign-plan', async (req, res) => {
  const { planCode, billingCycle, payAsYouGo } = req.body;
  const plan = await prisma.plan.findUnique({ where: { code: planCode } });
  if (!plan) return res.status(404).json({ error: 'Plan not found' });
  const periodEnd = new Date(); periodEnd.setMonth(periodEnd.getMonth() + 1);

  const sub = await prisma.subscription.upsert({
    where: { tenantId: req.params.id },
    update: { planId: plan.id, billingCycle, payAsYouGo: !!payAsYouGo, status: 'ACTIVE', currentPeriodEnd: periodEnd },
    create: {
      tenantId: req.params.id, planId: plan.id, billingCycle: billingCycle || 'MONTHLY',
      payAsYouGo: !!payAsYouGo, status: 'ACTIVE', currentPeriodEnd: periodEnd,
    },
    include: { plan: true },
  });
  res.json(sub);
});

// ── SUBSCRIPTIONS overview ──────────────────────────────
router.get('/subscriptions', async (_req, res) => {
  const subs = await prisma.subscription.findMany({
    include: { tenant: true, plan: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(subs);
});

// ── BLOG ────────────────────────────────────────────────
router.get('/blog', async (_req, res) => {
  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(posts);
});

router.post('/blog', async (req, res) => {
  try {
    const post = await prisma.blogPost.create({ data: req.body });
    res.status(201).json(post);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/blog/:id', async (req, res) => {
  try {
    const post = await prisma.blogPost.update({ where: { id: req.params.id }, data: req.body });
    res.json(post);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/blog/:id', async (req, res) => {
  await prisma.blogPost.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── SEO ─────────────────────────────────────────────────
router.get('/seo', async (_req, res) => {
  const list = await prisma.seoSetting.findMany({ orderBy: { path: 'asc' } });
  res.json(list);
});

router.put('/seo', async (req, res) => {
  const { path, ...rest } = req.body;
  if (!path) return res.status(400).json({ error: 'path required' });
  const seo = await prisma.seoSetting.upsert({
    where: { path },
    update: rest,
    create: { path, ...rest, title: rest.title || path },
  });
  res.json(seo);
});

router.delete('/seo/:id', async (req, res) => {
  await prisma.seoSetting.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

// ── PERMISSIONS catalog (read-only) ─────────────────────
router.get('/permissions', async (_req, res) => {
  const list = await prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { code: 'asc' }] });
  res.json(list);
});

// ── PLATFORM SETTINGS ───────────────────────────────────
// Settings catalog — describes every configurable key the founder can set.
// Add new rows here when a new service needs a DB-backed config value.
const SETTINGS_CATALOG = [
  // Amazon SP-API (public app — one set of credentials for the whole platform)
  { key: 'amazon.appId',        category: 'amazon', label: 'SP-API Application ID',  isSecret: false, description: 'amzn1.sp.solution.…' },
  { key: 'amazon.clientId',     category: 'amazon', label: 'LWA Client ID',          isSecret: false },
  { key: 'amazon.clientSecret', category: 'amazon', label: 'LWA Client Secret',      isSecret: true  },
  { key: 'amazon.redirectUri',  category: 'amazon', label: 'OAuth Redirect URI',     isSecret: false, description: 'Must match the URL registered in Amazon developer console.' },

  // Shopify public app
  { key: 'shopify.apiKey',      category: 'shopify', label: 'Shopify API Key',       isSecret: false },
  { key: 'shopify.apiSecret',   category: 'shopify', label: 'Shopify API Secret',    isSecret: true  },
  { key: 'shopify.redirectUri', category: 'shopify', label: 'OAuth Redirect URI',    isSecret: false },
  { key: 'shopify.scopes',      category: 'shopify', label: 'OAuth Scopes',          isSecret: false, description: 'Comma-separated, e.g. read_products,write_products,read_orders' },

  // Flipkart marketplace app
  { key: 'flipkart.appId',      category: 'flipkart', label: 'Flipkart App ID',      isSecret: false },
  { key: 'flipkart.appSecret',  category: 'flipkart', label: 'Flipkart App Secret',  isSecret: true  },

  // Meta (Facebook/Instagram/WhatsApp)
  { key: 'meta.appId',          category: 'meta', label: 'Meta App ID',              isSecret: false },
  { key: 'meta.appSecret',      category: 'meta', label: 'Meta App Secret',          isSecret: true  },

  // Razorpay
  { key: 'razorpay.keyId',         category: 'razorpay', label: 'Key ID',           isSecret: false },
  { key: 'razorpay.keySecret',     category: 'razorpay', label: 'Key Secret',       isSecret: true  },
  { key: 'razorpay.webhookSecret', category: 'razorpay', label: 'Webhook Secret',   isSecret: true  },

  // SMTP email
  { key: 'smtp.host', category: 'smtp', label: 'SMTP Host', isSecret: false },
  { key: 'smtp.port', category: 'smtp', label: 'SMTP Port', isSecret: false },
  { key: 'smtp.user', category: 'smtp', label: 'SMTP User', isSecret: false },
  { key: 'smtp.pass', category: 'smtp', label: 'SMTP Password', isSecret: true },
  { key: 'smtp.from', category: 'smtp', label: 'From Address', isSecret: false, description: 'Display name and email, e.g. OmniStock <no-reply@example.com>' },

  // Google OAuth (sign-in)
  { key: 'google.clientId',     category: 'google', label: 'Google Client ID',      isSecret: false },
  { key: 'google.clientSecret', category: 'google', label: 'Google Client Secret',  isSecret: true  },

  // Billing
  { key: 'billing.graceDays', category: 'billing', label: 'Past-due grace days', isSecret: false, description: 'Days of PAST_DUE before auto-suspend.' },

  // Review automation
  { key: 'reviews.delayHours', category: 'reviews', label: 'Review request delay (hours)', isSecret: false },
];

// Group catalog + merge in stored values for the admin UI
router.get('/settings', async (_req, res) => {
  const stored = {};
  for (const row of await require('../utils/prisma').platformSetting.findMany()) {
    stored[row.key] = row;
  }
  const byCategory = {};
  for (const entry of SETTINGS_CATALOG) {
    const existing = stored[entry.key];
    const item = {
      ...entry,
      value: entry.isSecret ? null : existing?.value ?? null,
      isSet: !!existing?.value,
      updatedAt: existing?.updatedAt || null,
    };
    (byCategory[entry.category] ||= []).push(item);
  }
  res.json(byCategory);
});

// Upsert one setting
router.put('/settings/:key', async (req, res) => {
  const entry = SETTINGS_CATALOG.find((s) => s.key === req.params.key);
  if (!entry) return res.status(404).json({ error: 'Unknown setting key' });
  // Allow secret with empty string = clear, undefined = keep existing
  if (entry.isSecret && (req.body?.value === undefined || req.body?.value === null || req.body?.value === '')) {
    return res.json({ ok: true, kept: true });
  }
  await settingsService.set(req.params.key, req.body?.value ?? null, {
    category: entry.category,
    label: entry.label,
    description: entry.description || null,
    isSecret: entry.isSecret,
    updatedBy: req.user.id,
  });
  res.json({ ok: true });
});

// Bulk upsert — accepts an array of { key, value }
router.put('/settings', async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : req.body?.items;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Expected array of {key,value}' });
  const enriched = items.map((i) => {
    const entry = SETTINGS_CATALOG.find((s) => s.key === i.key);
    return entry ? { ...i, ...entry } : null;
  }).filter(Boolean);
  await settingsService.setMany(enriched, req.user.id);
  res.json({ ok: true, updated: enriched.length });
});

router.delete('/settings/:key', async (req, res) => {
  await settingsService.remove(req.params.key);
  res.json({ ok: true });
});

// ── PUBLIC CONTENT (CMS for marketing pages) ────────────
router.get('/content', async (req, res) => {
  const where = {};
  if (req.query.type) where.type = String(req.query.type);
  const items = await prisma.publicContent.findMany({
    where,
    orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
  });
  res.json(items);
});

router.post('/content', async (req, res) => {
  try {
    const item = await prisma.publicContent.create({ data: req.body });
    res.status(201).json(item);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.put('/content/:id', async (req, res) => {
  try {
    const item = await prisma.publicContent.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(item);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

router.delete('/content/:id', async (req, res) => {
  try {
    await prisma.publicContent.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── AUDIT LOG (platform-wide) ───────────────────────────
router.get('/audit', async (req, res) => {
  const { tenantId, userId, action, limit = '100' } = req.query;
  const where = {};
  if (tenantId) where.tenantId = String(tenantId);
  if (userId)   where.userId = String(userId);
  if (action)   where.action = { contains: String(action) };
  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(limit), 500),
  });
  res.json(logs);
});

// ── PLATFORM STATS ──────────────────────────────────────
router.get('/stats', async (_req, res) => {
  const [tenants, activeSubs, trialing, totalUsers, totalOrders] = await Promise.all([
    prisma.tenant.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.subscription.count({ where: { status: 'TRIALING' } }),
    prisma.user.count(),
    prisma.order.count(),
  ]);
  res.json({ tenants, activeSubs, trialing, totalUsers, totalOrders });
});

module.exports = router;
