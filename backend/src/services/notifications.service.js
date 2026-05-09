/**
 * In-app notifications service.
 *
 * Use these helpers from any route/job to write a row into the
 * `notifications` table that will surface in the topbar bell drawer.
 *
 * All emit functions are FIRE-AND-FORGET — they swallow their own errors
 * and return false on failure so a notification glitch never blocks the
 * actual business write (creating an order, replying to a ticket, etc.).
 */

const prisma = require('../utils/prisma');
const { v4: uuid } = require('uuid');

/**
 * @typedef {Object} NotifyOpts
 * @property {string=} tenantId    — set for tenant-scoped notifications
 * @property {string=} userId      — null = broadcast to all users in tenant
 * @property {string}  type        — e.g. "order.new", "ticket.reply"
 * @property {string=} category    — orders|inventory|tickets|leads|payments|signup|system
 * @property {string=} severity    — info|success|warning|error
 * @property {string}  title
 * @property {string=} body
 * @property {string=} link        — relative URL to navigate to on click
 * @property {Object=} metadata
 */

const VALID_SEVERITY = new Set(['info', 'success', 'warning', 'error']);
const VALID_CATEGORY = new Set([
  'orders', 'inventory', 'tickets', 'leads', 'payments',
  'signup', 'system', 'plan', 'channel', 'team',
]);

/**
 * Create a single notification row.
 * @param {NotifyOpts} opts
 * @returns {Promise<boolean>} true on success, false on failure
 */
async function notify(opts) {
  try {
    const scope = opts.tenantId ? 'tenant' : 'platform';
    const severity = VALID_SEVERITY.has(opts.severity) ? opts.severity : 'info';
    const category = VALID_CATEGORY.has(opts.category) ? opts.category : 'system';

    await prisma.notification.create({
      data: {
        id: uuid(),
        scope,
        tenantId: opts.tenantId || null,
        userId: opts.userId || null,
        type: opts.type,
        category,
        severity,
        title: String(opts.title || '').slice(0, 255),
        body: opts.body ? String(opts.body) : null,
        link: opts.link || null,
        metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
        isRead: false,
      },
    });
    return true;
  } catch (err) {
    console.warn('[notify] failed:', err.message);
    return false;
  }
}

/**
 * Notify every platform admin (cross-tenant). One row, scope='platform'
 * — every user with isPlatformAdmin sees it via the /notifications
 * endpoint. We don't fan-out to per-user rows since the audience changes
 * over time and we'd rather show "old" notifications to new admins than
 * miss them.
 *
 * @param {Omit<NotifyOpts, 'tenantId'|'userId'>} opts
 */
async function notifyAdmins(opts) {
  return notify({ ...opts, tenantId: undefined, userId: undefined });
}

/**
 * Notify every user inside a tenant. Uses userId=null on a single row so
 * the GET /notifications endpoint OR's it onto the calling user's feed.
 * Cheaper than fanning out one row per team member.
 */
async function notifyTenant(tenantId, opts) {
  return notify({ ...opts, tenantId, userId: null });
}

/**
 * Notify a single tenant user (e.g. the ticket author when staff replies).
 */
async function notifyUser(tenantId, userId, opts) {
  return notify({ ...opts, tenantId, userId });
}

module.exports = {
  notify,
  notifyAdmins,
  notifyTenant,
  notifyUser,
};
