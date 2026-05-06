const { Router } = require('express');
const bcrypt = require('bcryptjs');
const prisma = require('../utils/prisma');
const {
  authenticate, requireTenant, requirePermission, enforceLimit, invalidateUserCache,
} = require('../middleware/auth.middleware');
const { audit } = require('../services/audit.service');
const { sendUserInvite } = require('../services/email.service');

const router = Router();
router.use(authenticate, requireTenant);

// List users in the tenant + any platform admins (who can impersonate the tenant).
// Platform admins are surfaced so tenant admins know who has cross-tenant access.
router.get('/', requirePermission('users.read'), async (req, res) => {
  const tenantUsers = await prisma.user.findMany({
    where: { tenantId: req.tenant.id },
    select: {
      id: true, name: true, email: true, phone: true, role: true, isActive: true,
      isPlatformAdmin: true, createdAt: true,
      roles: { include: { role: { select: { id: true, code: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const platformAdmins = await prisma.user.findMany({
    where: { isPlatformAdmin: true },
    select: {
      id: true, name: true, email: true, phone: true, role: true, isActive: true,
      isPlatformAdmin: true, createdAt: true,
      roles: { include: { role: { select: { id: true, code: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
  // De-dup: a platform admin who is ALSO a tenant member shouldn't appear twice
  const tenantIds = new Set(tenantUsers.map((u) => u.id));
  const combined = [...tenantUsers, ...platformAdmins.filter((u) => !tenantIds.has(u.id))];
  res.json(combined);
});

// Invite / create a user
router.post('/',
  requirePermission('users.create'),
  enforceLimit('users'),
  async (req, res) => {
    try {
      const { name, email, password, roleIds = [] } = req.body;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Email already in use' });

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: password ? await bcrypt.hash(password, 12) : null,
          tenantId: req.tenant.id,
          role: 'STAFF',
          emailVerified: false,
          provider: 'LOCAL',
        },
        select: { id: true, name: true, email: true, createdAt: true },
      });
      if (roleIds.length) {
        await prisma.userRole.createMany({
          data: roleIds.map((rid) => ({ userId: user.id, roleId: rid })),
          skipDuplicates: true,
        });
      }
      audit({ req, action: 'users.create', resource: 'user', resourceId: user.id });

      // Best-effort invite email — don't block the create on SMTP issues.
      try {
        const businessName = req.tenant?.businessName || 'your team';
        const inviteUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login?email=${encodeURIComponent(email)}`;
        await sendUserInvite({
          to: email,
          inviterName: req.user?.name || req.user?.email || 'A teammate',
          businessName,
          inviteUrl,
        });
      } catch (mailErr) {
        console.warn('[users.create] invite email failed:', mailErr.message);
      }

      res.status(201).json(user);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  }
);

// Update user (name, active, roles)
router.put('/:id', requirePermission('users.update'), async (req, res) => {
  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
  });
  if (!existing) return res.status(404).json({ error: 'User not found' });

  const { name, isActive, roleIds } = req.body;
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(isActive !== undefined && { isActive }),
    },
  });
  if (Array.isArray(roleIds)) {
    await prisma.userRole.deleteMany({ where: { userId: user.id } });
    if (roleIds.length) {
      await prisma.userRole.createMany({
        data: roleIds.map((rid) => ({ userId: user.id, roleId: rid })),
        skipDuplicates: true,
      });
    }
  }
  invalidateUserCache(user.id);
  audit({ req, action: 'users.update', resource: 'user', resourceId: user.id });
  res.json({ id: user.id, name: user.name, email: user.email, isActive: user.isActive });
});

// Deactivate
router.delete('/:id', requirePermission('users.delete'), async (req, res) => {
  const existing = await prisma.user.findFirst({
    where: { id: req.params.id, tenantId: req.tenant.id },
  });
  if (!existing) return res.status(404).json({ error: 'User not found' });
  if (existing.id === req.user.id) return res.status(400).json({ error: "You can't delete yourself" });

  await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
  invalidateUserCache(req.params.id);
  audit({ req, action: 'users.delete', resource: 'user', resourceId: req.params.id });
  res.json({ message: 'User deactivated' });
});

// List all permissions available for role assignment
router.get('/_permissions/catalog', requirePermission('roles.read'), async (_req, res) => {
  const perms = await prisma.permission.findMany({
    orderBy: [{ module: 'asc' }, { code: 'asc' }],
  });
  res.json(perms);
});

module.exports = router;
