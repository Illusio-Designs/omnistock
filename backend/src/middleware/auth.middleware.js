const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

// ── In-process cache for permissions/plan to avoid hitting DB on every req
const ctxCache = new Map(); // userId -> { ts, ctx }
const TTL_MS = 60 * 1000;

async function loadUserContext(userId, { byEmail = false } = {}) {
  const cacheKey = byEmail ? `email:${userId}` : userId;
  const cached = ctxCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.ctx;

  const user = await prisma.user.findUnique({
    where: byEmail ? { email: userId } : { id: userId },
    include: {
      tenant: { include: { subscription: { include: { plan: true } } } },
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
    },
  });
  if (!user) return null;

  const permissions = new Set();
  for (const ur of user.roles) {
    for (const rp of ur.role.permissions) permissions.add(rp.permission.code);
  }
  // Platform admin gets a wildcard
  if (user.isPlatformAdmin) permissions.add('*');

  const plan = user.tenant?.subscription?.plan || null;

  const ctx = {
    user: {
      id: user.id, email: user.email, name: user.name,
      role: user.role, isPlatformAdmin: user.isPlatformAdmin,
      tenantId: user.tenantId,
    },
    tenant: user.tenant ? {
      id: user.tenant.id, slug: user.tenant.slug, status: user.tenant.status,
      businessName: user.tenant.businessName,
    } : null,
    plan: plan ? {
      id: plan.id, code: plan.code, name: plan.name,
      maxFacilities: plan.maxFacilities, maxSkus: plan.maxSkus,
      maxUserRoles: plan.maxUserRoles, maxUsers: plan.maxUsers,
      maxOrdersPerMonth: plan.maxOrdersPerMonth,
      features: plan.features || {},
    } : null,
    subscription: user.tenant?.subscription ? {
      id: user.tenant.subscription.id,
      status: user.tenant.subscription.status,
      payAsYouGo: user.tenant.subscription.payAsYouGo,
      currentPeriodEnd: user.tenant.subscription.currentPeriodEnd,
    } : null,
    permissions,
  };
  ctxCache.set(cacheKey, { ts: Date.now(), ctx });
  return ctx;
}

function invalidateUserCache(userId) { ctxCache.delete(userId); }

// ── Impersonation: platform admins can scope a request to any tenant by
// sending x-tenant-id. This reloads the tenant + plan + subscription and
// keeps their wildcard permissions so they see the full tenant UI.
async function applyImpersonation(req) {
  const impersonateId = req.headers['x-tenant-id'];
  if (!impersonateId || !req.user?.isPlatformAdmin) return;

  const tenant = await prisma.tenant.findUnique({
    where: { id: String(impersonateId) },
    include: { subscription: { include: { plan: true } } },
  });
  if (!tenant) return;

  req.tenant = {
    id: tenant.id,
    slug: tenant.slug,
    status: tenant.status,
    businessName: tenant.businessName,
  };
  const plan = tenant.subscription?.plan || null;
  req.plan = plan ? {
    id: plan.id, code: plan.code, name: plan.name,
    maxFacilities: plan.maxFacilities, maxSkus: plan.maxSkus,
    maxUserRoles: plan.maxUserRoles, maxUsers: plan.maxUsers,
    maxOrdersPerMonth: plan.maxOrdersPerMonth,
    features: plan.features || {},
  } : null;
  req.subscription = tenant.subscription ? {
    id: tenant.subscription.id,
    status: tenant.subscription.status,
    payAsYouGo: tenant.subscription.payAsYouGo,
    currentPeriodEnd: tenant.subscription.currentPeriodEnd,
  } : null;
  req.impersonating = true;
}

// ── Authenticate: verify JWT, load tenant + permissions
// Dev auth bypass — ONLY when explicitly enabled AND not production
const DEV_AUTH_ENABLED = process.env.DEV_AUTH_BYPASS === 'true' && process.env.NODE_ENV !== 'production';

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    // ── Dev bypass: "dev:<email>" loads a seeded user, no JWT needed
    if (DEV_AUTH_ENABLED && token.startsWith('dev:')) {
      const email = token.slice(4).trim().toLowerCase();
      const ctx = await loadUserContext(email, { byEmail: true });
      if (!ctx) return res.status(401).json({ error: `Dev user not found: ${email}` });
      req.user = ctx.user;
      req.tenant = ctx.tenant;
      req.plan = ctx.plan;
      req.subscription = ctx.subscription;
      req.permissions = ctx.permissions;
      await applyImpersonation(req);
      return next();
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const ctx = await loadUserContext(decoded.id);
    if (!ctx) return res.status(401).json({ error: 'User no longer exists' });
    req.user = ctx.user;
    req.tenant = ctx.tenant;
    req.plan = ctx.plan;
    req.subscription = ctx.subscription;
    req.permissions = ctx.permissions;
    await applyImpersonation(req);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// ── Legacy coarse role check (kept for back-compat)
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || (!req.user.isPlatformAdmin && !roles.includes(req.user.role))) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// ── New RBAC permission check
const requirePermission = (...needed) => (req, res, next) => {
  if (!req.permissions) return res.status(401).json({ error: 'Not authenticated' });
  if (req.permissions.has('*')) return next();
  for (const code of needed) {
    if (req.permissions.has(code)) return next();
  }
  return res.status(403).json({
    error: 'Permission denied',
    required: needed,
  });
};

// ── Plan-feature gate (e.g. requireFeature('purchaseManagement'))
const requireFeature = (...flags) => (req, res, next) => {
  if (req.user?.isPlatformAdmin) return next();
  const features = req.plan?.features || {};
  for (const f of flags) {
    const v = features[f];
    if (!v) {
      return res.status(402).json({
        error: 'Feature not included in your plan',
        feature: f,
        currentPlan: req.plan?.code || null,
        upgradeTo: 'PROFESSIONAL_OR_ENTERPRISE',
      });
    }
  }
  next();
};

// ── Tenant scope guard: tenantId must exist for non-platform-admin requests
// Also enforces: suspended tenants blocked, expired trials blocked (except
// billing routes so tenants can still upgrade).
const BILLING_PATHS = ['/api/v1/billing', '/api/v1/plans', '/api/v1/auth'];
const isBillingPath = (req) => BILLING_PATHS.some((p) => req.originalUrl.startsWith(p));

const requireTenant = (req, res, next) => {
  if (req.user?.isPlatformAdmin) return next();
  if (!req.tenant?.id) return res.status(403).json({ error: 'No tenant context' });
  if (req.tenant.status === 'SUSPENDED' || req.tenant.status === 'CANCELLED') {
    return res.status(402).json({ error: `Tenant ${req.tenant.status.toLowerCase()}` });
  }
  // Trial expired: allow billing routes so tenants can upgrade, block everything else
  if (req.subscription?.status === 'TRIALING' && req.subscription?.currentPeriodEnd) {
    const expired = new Date(req.subscription.currentPeriodEnd) < new Date();
    if (expired && !isBillingPath(req)) {
      return res.status(402).json({
        error: 'Trial expired',
        upgradeUrl: '/dashboard/billing',
      });
    }
  }
  if (req.subscription?.status === 'PAST_DUE' && !isBillingPath(req)) {
    return res.status(402).json({ error: 'Subscription past due', upgradeUrl: '/dashboard/billing' });
  }
  next();
};

// ── Platform-only (SaaS admin portal)
const requirePlatformAdmin = (req, res, next) => {
  if (!req.user?.isPlatformAdmin) {
    return res.status(403).json({ error: 'Platform admin only' });
  }
  next();
};

// ── Plan-limit enforcer for create operations
// Usage: enforceLimit('warehouses' | 'skus' | 'users' | 'roles' | 'orders' | 'channels')
const enforceLimit = (resource) => async (req, res, next) => {
  if (req.user?.isPlatformAdmin) return next();
  const plan = req.plan;
  if (!plan) return res.status(402).json({ error: 'No active subscription' });
  const tenantId = req.tenant.id;

  try {
    let limit = null;
    let used = 0;
    let metric = null;

    switch (resource) {
      case 'warehouses':
        limit = plan.maxFacilities;
        used = await prisma.warehouse.count({ where: { tenantId } });
        metric = 'facilities';
        break;
      case 'skus':
        limit = plan.maxSkus;
        used = await prisma.product.count({ where: { tenantId } });
        metric = 'skus';
        break;
      case 'users':
        limit = plan.maxUsers;
        used = await prisma.user.count({ where: { tenantId } });
        metric = 'users';
        break;
      case 'roles':
        limit = plan.maxUserRoles;
        used = await prisma.tenantRole.count({ where: { tenantId, isSystem: false } });
        metric = 'roles';
        break;
      case 'orders': {
        limit = plan.maxOrdersPerMonth;
        const period = new Date().toISOString().slice(0, 7);
        const meter = await prisma.usageMeter.findUnique({
          where: { tenantId_metric_period: { tenantId, metric: 'orders', period } },
        });
        used = meter?.count || 0;
        metric = 'orders';
        break;
      }
      case 'channels': {
        // Channel limit is stored in plan.features.maxChannels (null = unlimited)
        const maxChannels = plan.features?.maxChannels;
        limit = typeof maxChannels === 'number' ? maxChannels : null;
        used = await prisma.channel.count({ where: { tenantId, isActive: true } });
        metric = 'channels';
        break;
      }
      default:
        return next();
    }

    if (limit !== null && used >= limit) {
      // PAYG: allow overage, just record usage
      if (req.subscription?.payAsYouGo) {
        req.overage = { metric, used, limit };
        return next();
      }
      return res.status(402).json({
        error: 'Plan limit reached',
        metric,
        limit,
        used,
        upgradeTo: 'next plan or enable pay-as-you-go',
      });
    }
    next();
  } catch (e) {
    console.error('enforceLimit error', e);
    next();
  }
};

// ── Tenant-scoped Prisma helper: builds {tenantId} filter automatically
function scopeWhere(req, where = {}) {
  if (req.user?.isPlatformAdmin && !req.tenant?.id) return where;
  return { ...where, tenantId: req.tenant.id };
}

module.exports = {
  authenticate,
  authorize,
  requirePermission,
  requireFeature,
  requireTenant,
  requirePlatformAdmin,
  enforceLimit,
  scopeWhere,
  invalidateUserCache,
};
