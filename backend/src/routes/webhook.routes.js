// Public webhook receiver — no authentication required.
// External marketplaces cannot send a JWT, so this router sits OUTSIDE the
// authenticated scope. Tenant context is derived from the Channel row.
const { Router } = require('express');
const prisma = require('../utils/prisma');
const { getAdapter, importOrders } = require('../services/channel.service');

const router = Router();

// POST /api/v1/webhooks/channels/:id
// Configure this URL in the external system (Amazon Smart Biz, custom webhook, etc.)
router.post('/channels/:id', async (req, res) => {
  try {
    const channel = await prisma.channel.findUnique({
      where: { id: req.params.id },
    });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    const adapter = getAdapter(channel);

    if (typeof adapter.validateWebhookSignature === 'function') {
      const rawBody = JSON.stringify(req.body);
      const sig =
        req.headers['x-omnistock-signature'] ||
        req.headers['x-amz-signature'] ||
        req.headers['x-smartbiz-signature'] ||
        '';
      if (!adapter.validateWebhookSignature(rawBody, sig)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    const rawOrder = adapter.parseWebhook(req.body);
    const { imported, skipped, errors } = await importOrders(
      channel.id,
      [rawOrder],
      { tenantId: channel.tenantId }
    );

    await prisma.channel.update({
      where: { id: channel.id },
      data: { lastSyncAt: new Date() },
    });

    res.json({ received: true, imported, skipped, errors });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
