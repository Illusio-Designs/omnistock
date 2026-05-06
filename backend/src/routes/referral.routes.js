// Tenant-facing referral program endpoints.
//
// All routes are scoped to req.tenant — referrals.service derives the
// referrer from the authenticated tenant, never from the URL.

const { Router } = require('express');
const { authenticate, requireTenant } = require('../middleware/auth.middleware');
const referrals = require('../services/referrals.service');

const router = Router();
router.use(authenticate, requireTenant);

// My share code, share link, totals, and referral list.
router.get('/me', async (req, res) => {
  try {
    const summary = await referrals.summaryForTenant(
      req.tenant.id,
      process.env.FRONTEND_URL || ''
    );
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
