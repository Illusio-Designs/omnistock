// Mobile push-notification device registry.
//
// The Expo client calls POST /devices/register on every cold start with
// its current Expo push token. We upsert a row keyed by token (unique)
// so a fresh token from the same device just refreshes lastSeenAt.
//
// Logout calls POST /devices/unregister with the token so we don't keep
// blasting notifications to a device the user no longer owns.

const { Router } = require('express');
const { v4: uuid } = require('uuid');
const db = require('../utils/db');
const { authenticate, requireTenant } = require('../middleware/auth.middleware');
const { audit } = require('../services/audit.service');

const router = Router();
router.use(authenticate, requireTenant);

router.post('/register', async (req, res) => {
  try {
    const { token, platform, deviceName } = req.body || {};
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'token required' });
    }
    if (token.length > 255) {
      return res.status(400).json({ error: 'token too long' });
    }

    const existing = await db('push_devices').where({ token }).first();
    if (existing) {
      // Token already registered. Update bookkeeping and re-bind to the
      // current authenticated user — covers the case where two users
      // share a device or a refresh issued the same token to a different
      // tenant.
      await db('push_devices').where({ token }).update({
        userId: req.user.id,
        tenantId: req.tenant.id,
        platform: platform || existing.platform || 'unknown',
        deviceName: deviceName ?? existing.deviceName ?? null,
        lastSeenAt: new Date(),
      });
      return res.json({ ok: true, deviceId: existing.id, refreshed: true });
    }

    const id = uuid();
    await db('push_devices').insert({
      id,
      userId: req.user.id,
      tenantId: req.tenant.id,
      token,
      platform: platform || 'unknown',
      deviceName: deviceName || null,
      lastSeenAt: new Date(),
      createdAt: new Date(),
    });
    audit({ req, action: 'devices.register', resource: 'device', resourceId: id, metadata: { platform } });
    res.status(201).json({ ok: true, deviceId: id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/unregister', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token required' });
    const deleted = await db('push_devices').where({ token, userId: req.user.id }).del();
    res.json({ ok: deleted > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
