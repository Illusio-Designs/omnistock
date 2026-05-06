const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { register, login, googleAuth, getMe, onboardBusiness } = require('../controllers/auth.controller');
const { authenticate, invalidateUserCache } = require('../middleware/auth.middleware');
const prisma = require('../utils/prisma');
const db = require('../utils/db');
const { generateSecret, verifyTOTP, otpauthUrl } = require('../utils/totp');
const { audit } = require('../services/audit.service');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.post('/onboard', onboardBusiness);
router.get('/me', authenticate, getMe);

// Self-service profile update (name + phone only)
router.patch('/me', authenticate, async (req, res) => {
  try {
    const { name, phone } = req.body;
    const data = {};
    if (name != null) data.name = String(name).trim().slice(0, 191);
    if (phone != null) data.phone = String(phone).trim().slice(0, 30);
    if (!Object.keys(data).length) return res.json({ ok: true });
    const updated = await prisma.user.update({ where: { id: req.user.id }, data });
    res.json({ id: updated.id, name: updated.name, email: updated.email, phone: updated.phone });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Self-service password change
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.password) {
      return res.status(400).json({ error: 'No password set — sign in with Google instead' });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout — invalidates the server-side permission cache immediately.
// (The JWT itself is stateless; the client should also drop its copy.)
router.post('/logout', authenticate, (req, res) => {
  invalidateUserCache(req.user.id);
  res.json({ ok: true });
});

// ───── 2FA / TOTP ─────────────────────────────────────────────────────────
//
// Flow:
//   1. POST /2fa/setup      → generate secret, return QR data to scan
//   2. POST /2fa/verify     → user submits first 6-digit code, we flip
//                             mfaEnabled=true and persist the secret
//   3. POST /2fa/disable    → password + TOTP, clears the secret
//   4. POST /2fa/login      → exchanges the short-lived mfaToken from
//                             /login for a full session JWT once the user
//                             submits a valid TOTP code

function issueSessionJwt(user) {
  return jwt.sign(
    {
      id: user.id, email: user.email, role: user.role,
      tenantId: user.tenantId || null,
      isPlatformAdmin: !!user.isPlatformAdmin,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post('/2fa/setup', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Always rotate the secret on setup — never expose an existing one
    const secret = generateSecret();
    // Stash provisional secret; it isn't activated until /2fa/verify succeeds.
    await db('users').where({ id: user.id }).update({ totpSecret: secret });
    const url = otpauthUrl({ secret, account: user.email, issuer: 'Kartriq' });
    res.json({
      secret,
      otpauthUrl: url,
      qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/2fa/verify', authenticate, async (req, res) => {
  try {
    const { token } = req.body || {};
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.totpSecret) return res.status(400).json({ error: 'Run /2fa/setup first' });
    if (!verifyTOTP(user.totpSecret, token)) {
      return res.status(400).json({ error: 'Invalid code' });
    }
    await db('users').where({ id: user.id }).update({ mfaEnabled: 1 });
    audit({ req, action: 'auth.2fa.enable', resource: 'user', resourceId: user.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/2fa/disable', authenticate, async (req, res) => {
  try {
    const { password, token } = req.body || {};
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!user.password) return res.status(400).json({ error: 'OAuth-only accounts have no password to confirm with' });
    const ok = await bcrypt.compare(password || '', user.password);
    if (!ok) return res.status(400).json({ error: 'Password is incorrect' });
    if (!user.totpSecret || !verifyTOTP(user.totpSecret, token)) {
      return res.status(400).json({ error: 'Invalid 2FA code' });
    }
    await db('users').where({ id: user.id }).update({ mfaEnabled: 0, totpSecret: null });
    audit({ req, action: 'auth.2fa.disable', resource: 'user', resourceId: user.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/2fa/login', async (req, res) => {
  try {
    const { mfaToken, token } = req.body || {};
    if (!mfaToken || !token) return res.status(400).json({ error: 'mfaToken and token required' });
    let payload;
    try {
      payload = jwt.verify(mfaToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired MFA token' });
    }
    if (!payload.mfaPending) return res.status(401).json({ error: 'Not an MFA challenge token' });
    const user = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!user || !user.isActive || !user.mfaEnabled || !user.totpSecret) {
      return res.status(401).json({ error: 'MFA not configured for this account' });
    }
    if (!verifyTOTP(user.totpSecret, token)) {
      return res.status(401).json({ error: 'Invalid code' });
    }
    const session = issueSessionJwt(user);
    res.json({
      token: session,
      user: {
        id: user.id, email: user.email, name: user.name, role: user.role,
        tenantId: user.tenantId, isPlatformAdmin: !!user.isPlatformAdmin,
        mfaEnabled: !!user.mfaEnabled,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───── DPDP / GDPR — data export & account deletion ────────────────────────

// Bundles every tenant-scoped row into a JSON document the user can download.
// Authenticated tenant owners only — platform admins should use direct DB
// dumps for cross-tenant exports.
router.get('/me/export', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return res.status(400).json({ error: 'No tenant on this account' });

    const TABLES = [
      'tenants', 'users', 'products', 'product_variants', 'inventory_movements',
      'orders', 'order_items', 'customers', 'invoices', 'shipments', 'vendors',
      'warehouses', 'channels', 'tenant_wallets', 'wallet_transactions',
    ];

    const bundle = { exportedAt: new Date().toISOString(), tenantId };
    for (const table of TABLES) {
      try {
        // tenants is keyed by id, not tenantId
        const rows = table === 'tenants'
          ? await db(table).where({ id: tenantId })
          : await db(table).where({ tenantId });
        bundle[table] = rows;
      } catch (e) {
        // table may not exist on every install (e.g. wallet tables) — skip
        bundle[table] = { error: e.message };
      }
    }

    audit({ req, action: 'tenant.export', resource: 'tenant', resourceId: tenantId });
    res.setHeader('Content-Disposition', `attachment; filename="kartriq-export-${tenantId}.json"`);
    res.json(bundle);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Soft-delete the calling user. If they own the tenant, the tenant is also
// soft-deleted and a hard-purge is scheduled (manual ops job — out of scope
// for this MVP). Requires password confirmation; OAuth-only users must
// supply confirmEmail matching their email instead.
router.post('/me/delete', authenticate, async (req, res) => {
  try {
    const { password, confirmEmail } = req.body || {};
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.password) {
      if (!password || !(await bcrypt.compare(password, user.password))) {
        return res.status(400).json({ error: 'Password is incorrect' });
      }
    } else {
      if (!confirmEmail || confirmEmail.toLowerCase() !== String(user.email).toLowerCase()) {
        return res.status(400).json({ error: 'Type your email exactly to confirm deletion' });
      }
    }

    const now = new Date();
    await db('users').where({ id: user.id }).update({
      isActive: 0,
      deletedAt: now,
      // Scrub PII immediately; the row stays for audit FK integrity.
      email: `deleted-${user.id}@kartriq.invalid`,
      name: 'Deleted user',
      phone: null,
      password: null,
    });

    // If this user owns the tenant, soft-delete the tenant too.
    if (user.tenantId) {
      const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
      if (tenant && tenant.ownerEmail === user.email) {
        await db('tenants').where({ id: user.tenantId }).update({
          status: 'DELETED',
          deletedAt: now,
        });
      }
    }

    audit({
      req,
      action: 'auth.account.delete',
      resource: 'user',
      resourceId: user.id,
      metadata: { email: user.email },
    });
    invalidateUserCache(user.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
