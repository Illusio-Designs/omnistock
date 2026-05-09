const { Router } = require('express');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const { notifyUser } = require('../services/notifications.service');
const { authenticate, requirePlatformAdmin } = require('../middleware/auth.middleware');
const settingsService = require('../services/settings.service');
const cronJob = require('../jobs/cron.job');
const { sendTicketReply } = require('../services/email.service');

const router = Router();
router.use(authenticate, requirePlatformAdmin);

// ── Zod schemas for admin writes (prevents mass assignment / privilege escalation)
const planSchema = z.object({
  code: z.string().min(1).max(32),
  name: z.string().min(1).max(100),
  tagline: z.string().max(500).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  monthlyPrice: z.number().min(0).optional(),
  yearlyPrice: z.number().min(0).optional(),
  currency: z.string().max(8).optional(),
  isPublic: z.boolean().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  maxFacilities: z.number().int().min(0).nullable().optional(),
  maxSkus: z.number().int().min(0).nullable().optional(),
  maxUserRoles: z.number().int().min(0).nullable().optional(),
  maxUsers: z.number().int().min(0).nullable().optional(),
  maxOrdersPerMonth: z.number().int().min(0).nullable().optional(),
  features: z.record(z.any()).optional(),
  meteredRates: z.record(z.any()).optional(),
});
const planPartial = planSchema.partial();

const tenantUpdateSchema = z.object({
  businessName: z.string().min(1).max(200).optional(),
  ownerName: z.string().max(100).optional(),
  ownerEmail: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  gstin: z.string().max(20).optional(),
  industry: z.string().max(100).optional(),
  companySize: z.string().max(50).optional(),
  country: z.string().max(100).optional(),
  status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
  trialEndsAt: z.string().datetime().optional(),
});

const assignPlanSchema = z.object({
  planCode: z.enum(['STANDARD', 'PROFESSIONAL', 'BUSINESS', 'ENTERPRISE']),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).optional(),
  payAsYouGo: z.boolean().optional(),
});

// ── CRON TRIGGERS (manual runs for debugging) ──────────────────────────
router.post('/cron/run', async (_req, res) => {
  try { res.json(await cronJob.runAllJobs()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/cron/sync-orders', async (_req, res) => {
  try { res.json(await cronJob.syncChannelOrders()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/cron/push-inventory', async (_req, res) => {
  try { res.json(await cronJob.pushInventoryToAll()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
router.post('/cron/track-shipments', async (_req, res) => {
  try { res.json(await cronJob.pollShipmentStatus()); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PLANS ───────────────────────────────────────────────
router.get('/plans', async (_req, res) => {
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: 'asc' } });
  res.json(plans);
});

router.post('/plans', async (req, res) => {
  try {
    const data = planSchema.parse(req.body);
    const plan = await prisma.plan.create({ data });
    res.status(201).json(plan);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(400).json({ error: e.message });
  }
});

router.put('/plans/:id', async (req, res) => {
  try {
    const data = planPartial.parse(req.body);
    const plan = await prisma.plan.update({ where: { id: req.params.id }, data });
    res.json(plan);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(400).json({ error: e.message });
  }
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
  try {
    const data = tenantUpdateSchema.parse(req.body);
    const tenant = await prisma.tenant.update({ where: { id: req.params.id }, data });
    res.json(tenant);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(400).json({ error: e.message });
  }
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
  try {
    const { planCode, billingCycle, payAsYouGo } = assignPlanSchema.parse(req.body);
    const plan = await prisma.plan.findUnique({ where: { code: planCode } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    const periodEnd = new Date(); periodEnd.setMonth(periodEnd.getMonth() + 1);

    const sub = await prisma.subscription.upsert({
      where: { tenantId: req.params.id },
      update: { planId: plan.id, billingCycle: billingCycle || 'MONTHLY', payAsYouGo: !!payAsYouGo, status: 'ACTIVE', currentPeriodEnd: periodEnd },
      create: {
        tenantId: req.params.id, planId: plan.id, billingCycle: billingCycle || 'MONTHLY',
        payAsYouGo: !!payAsYouGo, status: 'ACTIVE', currentPeriodEnd: periodEnd,
      },
      include: { plan: true },
    });
    res.json(sub);
  } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ error: e.errors });
    res.status(400).json({ error: e.message });
  }
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
  { key: 'flipkart.appId',        category: 'flipkart', label: 'Flipkart App ID',      isSecret: false },
  { key: 'flipkart.appSecret',    category: 'flipkart', label: 'Flipkart App Secret',  isSecret: true  },
  { key: 'flipkart.redirectUri',  category: 'flipkart', label: 'OAuth Redirect URI',   isSecret: false },

  // Walmart Marketplace Solution Provider app (US/CA/MX)
  { key: 'walmart.clientId',     category: 'walmart', label: 'Walmart Client ID',     isSecret: false, description: 'Solution Provider app client ID from https://developer.walmart.com.' },
  { key: 'walmart.clientSecret', category: 'walmart', label: 'Walmart Client Secret', isSecret: true  },

  // Lazada Open Platform app (SG/TH/PH/MY/VN/ID)
  { key: 'lazada.appKey',      category: 'lazada', label: 'Lazada App Key',      isSecret: false, description: 'App key from https://open.lazada.com/apps.' },
  { key: 'lazada.appSecret',   category: 'lazada', label: 'Lazada App Secret',   isSecret: true  },
  { key: 'lazada.redirectUri', category: 'lazada', label: 'OAuth Redirect URI',  isSecret: false, description: 'Must match the redirect URI registered in Lazada Open Platform.' },

  // Shopee Open Platform app (SEA + LATAM)
  { key: 'shopee.partnerId',   category: 'shopee', label: 'Shopee Partner ID',   isSecret: false, description: 'Numeric partner ID from https://open.shopee.com.' },
  { key: 'shopee.partnerKey',  category: 'shopee', label: 'Shopee Partner Key',  isSecret: true  },
  { key: 'shopee.redirectUri', category: 'shopee', label: 'OAuth Redirect URI',  isSecret: false, description: 'Must match the redirect URI registered in Shopee Open Platform.' },

  // Mercado Libre app (AR/BR/MX/CL/CO/UY/PE/VE)
  { key: 'mercadolibre.clientId',     category: 'mercadolibre', label: 'Mercado Libre App ID',  isSecret: false, description: 'Numeric app ID from https://developers.mercadolibre.com.' },
  { key: 'mercadolibre.clientSecret', category: 'mercadolibre', label: 'Mercado Libre Secret', isSecret: true  },
  { key: 'mercadolibre.redirectUri',  category: 'mercadolibre', label: 'OAuth Redirect URI',   isSecret: false, description: 'Must match the redirect URI registered in your Mercado Libre app.' },

  // Allegro app (Poland)
  { key: 'allegro.clientId',     category: 'allegro', label: 'Allegro Client ID',     isSecret: false, description: 'Client ID from https://apps.developer.allegro.pl.' },
  { key: 'allegro.clientSecret', category: 'allegro', label: 'Allegro Client Secret', isSecret: true  },
  { key: 'allegro.redirectUri',  category: 'allegro', label: 'OAuth Redirect URI',    isSecret: false, description: 'Must match the redirect URI registered in your Allegro app.' },

  // Wish Merchant Platform app
  { key: 'wish.clientId',     category: 'wish', label: 'Wish Client ID',     isSecret: false, description: 'Client ID from https://merchant.wish.com/api-partner.' },
  { key: 'wish.clientSecret', category: 'wish', label: 'Wish Client Secret', isSecret: true  },
  { key: 'wish.redirectUri',  category: 'wish', label: 'OAuth Redirect URI', isSecret: false, description: 'Must match the redirect URI registered in your Wish app.' },

  // Meta (Facebook/Instagram/WhatsApp)
  { key: 'meta.appId',        category: 'meta', label: 'Meta App ID',          isSecret: false },
  { key: 'meta.appSecret',    category: 'meta', label: 'Meta App Secret',      isSecret: true  },
  { key: 'meta.redirectUri',  category: 'meta', label: 'OAuth Redirect URI',   isSecret: false },

  // Razorpay
  { key: 'razorpay.keyId',         category: 'razorpay', label: 'Key ID',           isSecret: false },
  { key: 'razorpay.keySecret',     category: 'razorpay', label: 'Key Secret',       isSecret: true  },
  { key: 'razorpay.webhookSecret', category: 'razorpay', label: 'Webhook Secret',   isSecret: true  },

  // SMTP email
  { key: 'smtp.host', category: 'smtp', label: 'SMTP Host', isSecret: false },
  { key: 'smtp.port', category: 'smtp', label: 'SMTP Port', isSecret: false },
  { key: 'smtp.user', category: 'smtp', label: 'SMTP User', isSecret: false },
  { key: 'smtp.pass', category: 'smtp', label: 'SMTP Password', isSecret: true },
  { key: 'smtp.from', category: 'smtp', label: 'From Address', isSecret: false, description: 'Display name and email, e.g. Kartriq <no-reply@example.com>' },

  // Google OAuth (sign-in)
  { key: 'google.clientId',     category: 'google', label: 'Google Client ID',      isSecret: false },
  { key: 'google.clientSecret', category: 'google', label: 'Google Client Secret',  isSecret: true  },

  // Billing
  { key: 'billing.graceDays', category: 'billing', label: 'Past-due grace days', isSecret: false, description: 'Days of PAST_DUE before auto-suspend.' },

  // Review automation
  { key: 'reviews.delayHours', category: 'reviews', label: 'Review request delay (hours)', isSecret: false },

  // Referral / affiliate program
  { key: 'referral.rewardAmount',   category: 'referral', label: 'Reward per conversion', isSecret: false, description: 'Wallet credit (in INR) given to the referrer when their invitee converts to a paid plan. Default: 500.' },
  { key: 'referral.rewardCurrency', category: 'referral', label: 'Reward currency',       isSecret: false, description: 'Currency the reward is denominated in. Default: INR.' },

  // Analytics & Tracking
  { key: 'tracking.gaId',       category: 'tracking', label: 'Google Analytics ID',       isSecret: false, description: 'Measurement ID, e.g. G-XXXXXXXXXX' },
  { key: 'tracking.fbPixelId',  category: 'tracking', label: 'Facebook Pixel ID',         isSecret: false, description: 'From Meta Events Manager' },
  { key: 'tracking.clarityId',  category: 'tracking', label: 'Microsoft Clarity ID',      isSecret: false, description: 'From clarity.microsoft.com' },

  // Maintenance mode
  { key: 'maintenance.enabled', category: 'maintenance', label: 'Enable Maintenance Mode', isSecret: false, description: 'Set to "true" to show maintenance page on dashboard. Public pages stay live.' },
  { key: 'maintenance.message', category: 'maintenance', label: 'Maintenance Message',     isSecret: false, description: 'Message shown to users during maintenance.' },
  { key: 'maintenance.eta',     category: 'maintenance', label: 'Estimated Time',          isSecret: false, description: 'e.g. "30 minutes", "2 hours"' },
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

// ── SUPPORT TICKETS (platform-wide) ─────────────────────
router.get('/tickets', async (req, res) => {
  const { status } = req.query;
  const where = {};
  if (status) where.status = String(status);
  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      tenant: { select: { id: true, businessName: true, slug: true } },
      _count: { select: { messages: true } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    take: 200,
  });
  res.json(tickets);
});

router.get('/tickets/:id', async (req, res) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: req.params.id },
    include: {
      tenant: { select: { id: true, businessName: true, slug: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

router.post('/tickets/:id/reply', async (req, res) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const { body, status } = req.body;
  if (!body) return res.status(400).json({ error: 'body required' });

  await prisma.$transaction([
    prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: req.user.id,
        authorName: req.user.name || req.user.email || 'Support',
        isStaff: true,
        body,
      },
    }),
    prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: status || 'PENDING',
        updatedAt: new Date(),
      },
    }),
  ]);

  // Enqueue the notification email instead of firing it inline. The job
  // queue handles SMTP outages, retries with backoff and surfaces persistent
  // failures in /admin/jobs — far better than the previous fire-and-forget
  // try/catch that just logged and dropped the email.
  try {
    const requester = ticket.userId
      ? await prisma.user.findUnique({ where: { id: ticket.userId } })
      : null;
    const to = requester?.email || ticket.email;
    if (to) {
      const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/help/${ticket.id}`;
      const jobs = require('../services/jobs.service');
      await jobs.enqueue('email.send', {
        template: 'sendTicketReply',
        args: {
          to,
          name: requester?.name || 'there',
          ticketSubject: ticket.subject || `Ticket #${ticket.id.slice(0, 6)}`,
          ticketUrl: url,
          replyPreview: String(body).slice(0, 280),
        },
      });
    }
  } catch (err) {
    console.warn('[admin/tickets/reply] enqueue email failed:', err.message);
  }

  // In-app notification on the requester's tenant inbox so they see the
  // reply even before opening the email.
  if (ticket.tenantId && ticket.userId) {
    notifyUser(ticket.tenantId, ticket.userId, {
      type: 'ticket.reply.staff',
      category: 'tickets',
      severity: 'info',
      title: `Support reply on: ${ticket.subject || 'your ticket'}`,
      body: String(body).slice(0, 280),
      link: `/tickets/${ticket.id}`,
      metadata: { ticketId: ticket.id },
    });
  }

  res.json({ ok: true });
});

router.put('/tickets/:id/status', async (req, res) => {
  const t = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
  });
  res.json(t);
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

// ── JOB QUEUE ──────────────────────────────────────────
//
// /admin/jobs                       counts by status
// /admin/jobs/list?status=pending   list rows for one bucket
// /admin/jobs/:id/retry             move a dead row back to pending
// /admin/jobs/:id                   discard a row (DELETE)

router.get('/jobs', async (_req, res) => {
  const jobs = require('../services/jobs.service');
  res.json(await jobs.stats());
});

router.get('/jobs/list', async (req, res) => {
  const jobs = require('../services/jobs.service');
  const status = String(req.query.status || 'pending');
  const type = req.query.type ? String(req.query.type) : undefined;
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 100));
  const list = await jobs.listByStatus(status, { limit, type });
  // Distinct type list for the filter dropdown
  const types = await require('../utils/db')('job_queue')
    .select('type').count('* as count').groupBy('type').orderBy('count', 'desc').limit(30);
  res.json({
    jobs: list.map((j) => ({
      ...j,
      // payload is JSON stringified in DB — return parsed for the UI
      payload: safeParse(j.payload),
    })),
    types: types.map((t) => ({ type: t.type, count: Number(t.count) || 0 })),
  });
});

router.post('/jobs/:id/retry', async (req, res) => {
  const jobs = require('../services/jobs.service');
  const ok = await jobs.retryDead(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Not a dead-letter row, or not found' });
  res.json({ ok: true });
});

router.delete('/jobs/:id', async (req, res) => {
  const jobs = require('../services/jobs.service');
  const n = await jobs.discard(req.params.id);
  res.json({ ok: n > 0 });
});

router.post('/jobs/purge', async (req, res) => {
  const jobs = require('../services/jobs.service');
  res.json(await jobs.purgeOld(req.body || {}));
});

function safeParse(s) { try { return JSON.parse(s); } catch { return s; } }

// ── EMAIL DIAGNOSTICS ──────────────────────────────────
// Send a sample of every transactional template to a chosen address. Used to
// verify SMTP credentials are working end-to-end before going live. Returns
// per-template success/failure for ops visibility.
router.post('/email/test', async (req, res) => {
  const to = String(req.body?.to || req.user?.email || '').trim();
  if (!to || !/^[^@\s]+@[^@\s]+$/.test(to)) {
    return res.status(400).json({ error: 'Valid `to` email required' });
  }

  const e = require('../services/email.service');
  const siteUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const tries = [
    ['welcome',          () => e.sendWelcome({ to, name: 'Test User', businessName: 'Test Co.' })],
    ['trial-ending',     () => e.sendTrialEndingSoon({ to, name: 'Test User', daysLeft: 3 })],
    ['invoice-paid',     () => e.sendInvoicePaid({ to, name: 'Test User', invoiceNumber: 'INV-TEST-001', amount: '999.00' })],
    ['past-due',         () => e.sendPastDue({ to, name: 'Test User', graceDays: 7 })],
    ['dunning',          () => e.sendDunningReminder({ to, name: 'Test User', daysPastDue: 7, amountDue: '999.00' })],
    ['password-reset',   () => e.sendPasswordReset({ to, name: 'Test User', resetUrl: `${siteUrl}/login?reset=test` })],
    ['user-invite',      () => e.sendUserInvite({ to, inviterName: 'Test Admin', businessName: 'Test Co.', inviteUrl: `${siteUrl}/login?email=${encodeURIComponent(to)}` })],
    ['payment-failed',   () => e.sendPaymentFailed({ to, name: 'Test User', amount: '999.00', reason: 'Card declined (test)' })],
    ['plan-limit-alert', () => e.sendPlanLimitAlert({ to, name: 'Test User', metric: 'orders', used: 950, limit: 1000 })],
    ['ticket-reply',     () => e.sendTicketReply({ to, name: 'Test User', ticketSubject: 'Demo ticket', ticketUrl: `${siteUrl}/help/test`, replyPreview: 'Thanks for reaching out…' })],
  ];

  const results = [];
  for (const [name, fn] of tries) {
    try {
      const r = await fn();
      results.push({ template: name, ok: true, stub: !!r?.stub });
    } catch (err) {
      results.push({ template: name, ok: false, error: err.message });
    }
  }
  const allStub = results.every((r) => r.ok && r.stub);
  res.json({
    to,
    smtpConfigured: !allStub,
    note: allStub ? 'SMTP not configured — emails were logged to console only. Set smtp.* in /admin/settings.' : 'Check your inbox.',
    results,
  });
});

module.exports = router;
