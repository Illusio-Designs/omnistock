/**
 * Notifications inbox API.
 *
 * Two scopes share the same table:
 *   - tenant   — visible to users of one tenant. userId=null means
 *                broadcast inside the tenant; userId=<id> targets one.
 *   - platform — visible to every platform admin (founder team).
 *
 * Routes:
 *   GET    /notifications                — current user's tenant inbox
 *   GET    /notifications/unread-count   — { count } for the bell badge
 *   POST   /notifications/:id/read       — mark one read
 *   POST   /notifications/read-all       — mark every visible row read
 *   DELETE /notifications/:id            — hide one
 *   DELETE /notifications                — hide all read rows
 *
 *   GET    /notifications/platform       — platform admins only
 *   POST   /notifications/platform/read-all
 *
 * Filtering: ?category=orders&unreadOnly=true&limit=50
 */

const { Router } = require('express');
const prisma = require('../utils/prisma');
const db = require('../utils/db');
const {
  authenticate, requireTenant, requirePlatformAdmin,
} = require('../middleware/auth.middleware');

const router = Router();

// ─── Tenant inbox ──────────────────────────────────────────────────
const tenantRouter = Router();
tenantRouter.use(authenticate, requireTenant);

function buildTenantWhere(req) {
  // Tenant rows: scope='tenant' AND tenantId=req.tenant.id AND
  // (userId IS NULL OR userId = req.user.id).
  // Knex via prisma shim doesn't support OR cleanly, so we use raw db
  // queries for the listing — safer than fighting the shim.
  return {
    scope: 'tenant',
    tenantId: req.tenant.id,
    userId: req.user.id,
  };
}

async function listForTenantUser(req, { unreadOnly, category, limit, offset }) {
  let q = db('notifications')
    .where({ scope: 'tenant', tenantId: req.tenant.id })
    .andWhere(function () {
      this.whereNull('userId').orWhere('userId', req.user.id);
    });
  if (unreadOnly) q = q.andWhere({ isRead: 0 });
  if (category) q = q.andWhere({ category });
  const rows = await q.clone()
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .offset(offset);
  const [{ total }] = await q.clone().count('* as total');
  const [{ unread }] = await db('notifications')
    .where({ scope: 'tenant', tenantId: req.tenant.id, isRead: 0 })
    .andWhere(function () { this.whereNull('userId').orWhere('userId', req.user.id); })
    .count('* as unread');
  return { rows, total: Number(total) || 0, unread: Number(unread) || 0 };
}

tenantRouter.get('/', async (req, res) => {
  try {
    const limit = Math.min(100, Number(req.query.limit) || 30);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const unreadOnly = String(req.query.unreadOnly || '') === 'true';
    const category = req.query.category ? String(req.query.category) : null;

    const { rows, total, unread } = await listForTenantUser(req, {
      unreadOnly, category, limit, offset,
    });
    res.json({
      notifications: rows.map(parseRow),
      total,
      unread,
      limit,
      offset,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

tenantRouter.get('/unread-count', async (req, res) => {
  try {
    const [{ unread }] = await db('notifications')
      .where({ scope: 'tenant', tenantId: req.tenant.id, isRead: 0 })
      .andWhere(function () { this.whereNull('userId').orWhere('userId', req.user.id); })
      .count('* as unread');
    res.json({ count: Number(unread) || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

tenantRouter.post('/:id/read', async (req, res) => {
  try {
    // Only mark rows the caller can actually see, so a tenant can't flip
    // someone else's row.
    const updated = await db('notifications')
      .where({ id: req.params.id, scope: 'tenant', tenantId: req.tenant.id })
      .andWhere(function () { this.whereNull('userId').orWhere('userId', req.user.id); })
      .update({ isRead: 1, readAt: new Date() });
    if (!updated) return res.status(404).json({ error: 'Notification not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

tenantRouter.post('/read-all', async (req, res) => {
  try {
    await db('notifications')
      .where({ scope: 'tenant', tenantId: req.tenant.id, isRead: 0 })
      .andWhere(function () { this.whereNull('userId').orWhere('userId', req.user.id); })
      .update({ isRead: 1, readAt: new Date() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

tenantRouter.delete('/:id', async (req, res) => {
  try {
    const deleted = await db('notifications')
      .where({ id: req.params.id, scope: 'tenant', tenantId: req.tenant.id })
      .andWhere(function () { this.whereNull('userId').orWhere('userId', req.user.id); })
      .delete();
    if (!deleted) return res.status(404).json({ error: 'Notification not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

tenantRouter.delete('/', async (req, res) => {
  try {
    // Only deletes ROWS THIS USER COULD READ — never broadcast rows a
    // teammate may still need. Targeted (userId=req.user.id) read rows
    // are deletable here; broadcast (userId=null) rows are left alone.
    await db('notifications')
      .where({
        scope: 'tenant', tenantId: req.tenant.id, userId: req.user.id, isRead: 1,
      })
      .delete();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Platform inbox (founder admins only) ─────────────────────────
const platformRouter = Router();
platformRouter.use(authenticate, requirePlatformAdmin);

platformRouter.get('/', async (req, res) => {
  try {
    const limit = Math.min(100, Number(req.query.limit) || 30);
    const offset = Math.max(0, Number(req.query.offset) || 0);
    const unreadOnly = String(req.query.unreadOnly || '') === 'true';
    const category = req.query.category ? String(req.query.category) : null;

    let q = db('notifications').where({ scope: 'platform' });
    if (unreadOnly) q = q.andWhere({ isRead: 0 });
    if (category) q = q.andWhere({ category });

    const rows = await q.clone().orderBy('createdAt', 'desc').limit(limit).offset(offset);
    const [{ total }] = await q.clone().count('* as total');
    const [{ unread }] = await db('notifications')
      .where({ scope: 'platform', isRead: 0 }).count('* as unread');

    res.json({
      notifications: rows.map(parseRow),
      total: Number(total) || 0,
      unread: Number(unread) || 0,
      limit,
      offset,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

platformRouter.get('/unread-count', async (req, res) => {
  try {
    const [{ unread }] = await db('notifications')
      .where({ scope: 'platform', isRead: 0 }).count('* as unread');
    res.json({ count: Number(unread) || 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

platformRouter.post('/:id/read', async (req, res) => {
  try {
    const updated = await db('notifications')
      .where({ id: req.params.id, scope: 'platform' })
      .update({ isRead: 1, readAt: new Date() });
    if (!updated) return res.status(404).json({ error: 'Notification not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

platformRouter.post('/read-all', async (_req, res) => {
  try {
    await db('notifications')
      .where({ scope: 'platform', isRead: 0 })
      .update({ isRead: 1, readAt: new Date() });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

platformRouter.delete('/:id', async (req, res) => {
  try {
    const deleted = await db('notifications')
      .where({ id: req.params.id, scope: 'platform' })
      .delete();
    if (!deleted) return res.status(404).json({ error: 'Notification not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.use('/platform', platformRouter);
router.use('/', tenantRouter);

function parseRow(r) {
  let metadata = null;
  if (r.metadata) {
    try { metadata = JSON.parse(r.metadata); } catch { metadata = null; }
  }
  return {
    id: r.id,
    scope: r.scope,
    tenantId: r.tenantId,
    userId: r.userId,
    type: r.type,
    category: r.category,
    severity: r.severity,
    title: r.title,
    body: r.body,
    link: r.link,
    metadata,
    isRead: !!r.isRead,
    readAt: r.readAt,
    createdAt: r.createdAt,
  };
}

module.exports = router;
