// Public webhook receiver — no authentication required.
// External marketplaces cannot send a JWT, so this router sits OUTSIDE the
// authenticated scope. Tenant context is derived from the Channel row.
//
// Supported URL patterns:
//   POST /api/v1/webhooks/channels/:id           ← canonical (per-channel UUID)
//   GET  /api/v1/webhooks/channels/:id           ← Meta Graph verify challenge
//   POST /api/v1/webhooks/:type/:id              ← typed alias (e.g. shopify, facebook)

const { Router } = require('express');
const prisma = require('../utils/prisma');
const { getAdapter, importOrders } = require('../services/channel.service');

const router = Router();

async function handleIncomingWebhook(channelId, req, res) {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel) return res.status(404).json({ error: 'Channel not found' });
  if (!channel.isActive) return res.status(410).json({ error: 'Channel disabled' });

  const adapter = getAdapter(channel);

  // Mandatory signature verification — channels MUST either:
  //   1. expose validateWebhookSignature(rawBody, sig), OR
  //   2. set skipSignatureVerification = true to explicitly opt-out
  //      (only for trusted internal channels: OFFLINE, CUSTOM_WEBHOOK with shared secret)
  if (typeof adapter.validateWebhookSignature === 'function') {
    const rawBody = JSON.stringify(req.body);
    const sig =
      req.headers['x-omnistock-signature'] ||
      req.headers['x-hub-signature-256'] || // Meta / FB / Insta / WhatsApp
      req.headers['x-shopify-hmac-sha256'] ||
      req.headers['x-amz-signature'] ||
      req.headers['x-smartbiz-signature'] ||
      '';
    if (!adapter.validateWebhookSignature(rawBody, sig)) {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }
  } else if (!adapter.skipSignatureVerification) {
    return res.status(501).json({
      error: `Webhook signature verification not implemented for channel type ${channel.type}`,
      hint: 'Adapter must expose validateWebhookSignature(rawBody, sig) or explicitly set skipSignatureVerification=true',
    });
  }

  // Adapters expose parseWebhook(body) → normalized raw order
  if (typeof adapter.parseWebhook !== 'function') {
    return res.status(501).json({ error: `Webhook not supported for channel type ${channel.type}` });
  }

  try {
    const rawOrder = adapter.parseWebhook(req.body);
    const result = await importOrders(channel.id, [rawOrder], { tenantId: channel.tenantId });
    await prisma.channel.update({
      where: { id: channel.id },
      data: { lastSyncAt: new Date(), lastSyncError: null },
    });
    return res.json({ received: true, ...result });
  } catch (err) {
    console.error(`[webhook] ${channel.type} (${channel.id}):`, err.message);
    await prisma.channel.update({
      where: { id: channel.id },
      data: { lastSyncError: err.message },
    }).catch(() => {});
    return res.status(400).json({ error: err.message });
  }
}

// Canonical per-channel webhook
router.post('/channels/:id', (req, res) => handleIncomingWebhook(req.params.id, req, res));

// Meta Graph API (FB / Insta / WhatsApp) GET verification challenge
// https://developers.facebook.com/docs/graph-api/webhooks
router.get('/channels/:id', async (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode !== 'subscribe' || !challenge) {
      return res.status(400).json({ error: 'Missing hub.mode / hub.challenge' });
    }
    const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });

    // Verify token from channel credentials (adapter decrypts them)
    try {
      const adapter = getAdapter(channel);
      const expected = adapter?.webhookVerifyToken;
      if (expected && token !== expected) {
        return res.status(403).json({ error: 'Verify token mismatch' });
      }
    } catch {
      // no adapter available; accept challenge anyway for first-time setup
    }
    return res.send(String(challenge));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Typed alias: /webhooks/:type/:id — same handler, just a friendlier URL
router.post('/:type/:id', (req, res) => handleIncomingWebhook(req.params.id, req, res));

module.exports = router;
