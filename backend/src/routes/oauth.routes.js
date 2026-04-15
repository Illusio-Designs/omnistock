// OAuth broker for per-seller channel authorization.
// Public SaaS apps (Amazon, Shopify, Flipkart, Meta…) register ONE app each
// with the provider. Every tenant clicks "Authorize" → the provider redirects
// to our callback with a code → we exchange it for a per-seller refresh token
// and store it encrypted on that tenant's Channel row.

const { Router } = require('express');
const crypto = require('crypto');
const axios = require('axios');
const prisma = require('../utils/prisma');
const { encryptCredentials } = require('../utils/crypto');
const settings = require('../services/settings.service');
const {
  authenticate, requireTenant, requirePermission,
} = require('../middleware/auth.middleware');

const router = Router();

// ── Short-lived signed state to bind callback to originating channel ──
// state = base64(JSON({ channelId, tenantId, nonce, exp }))
const STATE_TTL_MS = 15 * 60 * 1000;

function signState(payload) {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyState(state) {
  if (!state || typeof state !== 'string' || !state.includes('.')) return null;
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const [body, sig] = state.split('.');
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  if (sig !== expected) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (parsed.exp && parsed.exp < Date.now()) return null;
    return parsed;
  } catch { return null; }
}

// ══════════════════════════════════════════════════════════════════════════
// AUTHENTICATED — seller kicks off the flow from the Channels UI
// ══════════════════════════════════════════════════════════════════════════

// GET /api/v1/oauth/amazon/start?channelId=xxx&region=IN
// Returns the Amazon Seller Central consent URL the frontend should open.
router.get('/amazon/start',
  authenticate, requireTenant, requirePermission('channels.update'),
  async (req, res) => {
    try {
      const { channelId, region = 'IN' } = req.query;
      if (!channelId) return res.status(400).json({ error: 'channelId required' });

      const channel = await prisma.channel.findFirst({
        where: { id: String(channelId), tenantId: req.tenant.id },
      });
      if (!channel) return res.status(404).json({ error: 'Channel not found' });
      if (!['AMAZON', 'AMAZON_SMARTBIZ'].includes(channel.type)) {
        return res.status(400).json({ error: 'Channel is not Amazon' });
      }

      const [appId, redirectUri] = await Promise.all([
        settings.get('amazon.appId'),
        settings.get('amazon.redirectUri'),
      ]);
      if (!appId) return res.status(400).json({ error: 'amazon.appId not set in Admin → Settings' });
      if (!redirectUri) return res.status(400).json({ error: 'amazon.redirectUri not set in Admin → Settings' });

      const state = signState({
        channelId: channel.id,
        tenantId: req.tenant.id,
        region,
        nonce: crypto.randomBytes(8).toString('hex'),
        exp: Date.now() + STATE_TTL_MS,
      });

      // Amazon Seller Central consent URL (region-aware host)
      const consentHost = {
        IN: 'https://sellercentral.amazon.in',
        US: 'https://sellercentral.amazon.com',
        EU: 'https://sellercentral.amazon.co.uk',
      }[region] || 'https://sellercentral.amazon.in';

      const url = `${consentHost}/apps/authorize/consent?` +
        new URLSearchParams({
          application_id: appId,
          state,
          redirect_uri: redirectUri,
          version: 'beta', // remove once app is published live
        }).toString();

      res.json({ url, state });
    } catch (err) {
      console.error('[oauth/amazon/start]', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/v1/oauth/amazon/status?channelId=xxx
// Polled by the frontend popup-opener while the user completes consent.
router.get('/amazon/status',
  authenticate, requireTenant, requirePermission('channels.read'),
  async (req, res) => {
    const channel = await prisma.channel.findFirst({
      where: { id: String(req.query.channelId || ''), tenantId: req.tenant.id },
      select: { id: true, credentials: true, syncError: true },
    });
    if (!channel) return res.status(404).json({ error: 'Channel not found' });
    res.json({
      connected: !!channel.credentials,
      error: channel.syncError || null,
    });
  }
);

// ══════════════════════════════════════════════════════════════════════════
// PUBLIC CALLBACK — Amazon redirects the browser here with the auth code
// ══════════════════════════════════════════════════════════════════════════

// GET /api/v1/oauth/amazon/callback?spapi_oauth_code=...&selling_partner_id=...&state=...
router.get('/amazon/callback', async (req, res) => {
  const { spapi_oauth_code, selling_partner_id, state } = req.query;

  const parsed = verifyState(String(state || ''));
  if (!parsed) return res.status(400).send(renderPage('Authorization failed', 'Invalid or expired state. Please retry from OmniStock.'));
  if (!spapi_oauth_code) return res.status(400).send(renderPage('Authorization failed', 'Missing authorization code from Amazon.'));

  try {
    const [clientId, clientSecret] = await Promise.all([
      settings.get('amazon.clientId'),
      settings.get('amazon.clientSecret'),
    ]);
    if (!clientId || !clientSecret) {
      return res.status(500).send(renderPage('Platform not configured', 'The platform admin has not set amazon.clientId / amazon.clientSecret.'));
    }

    // Exchange the one-time code for a long-lived refresh token
    const tokenRes = await axios.post('https://api.amazon.com/auth/o2/token', {
      grant_type: 'authorization_code',
      code: spapi_oauth_code,
      client_id: clientId,
      client_secret: clientSecret,
    });
    const { refresh_token } = tokenRes.data;
    if (!refresh_token) throw new Error('Amazon did not return a refresh_token');

    // Save on the channel row — credentials column is encrypted at rest
    const channel = await prisma.channel.findFirst({
      where: { id: parsed.channelId, tenantId: parsed.tenantId },
    });
    if (!channel) throw new Error('Channel no longer exists');

    const creds = {
      sellerId: String(selling_partner_id || ''),
      refreshToken: refresh_token,
      region: parsed.region || 'IN',
    };
    await prisma.channel.update({
      where: { id: channel.id },
      data: {
        credentials: encryptCredentials(creds),
        syncError: null,
        lastSyncAt: null,
      },
    });

    res.send(renderPage(
      '✓ Connected',
      `Amazon Seller account <b>${selling_partner_id}</b> linked. You can close this window and return to OmniStock.`,
      { autoClose: true }
    ));
  } catch (err) {
    console.error('[oauth/amazon/callback]', err.response?.data || err.message);
    // Surface the error on the channel so the user sees it in the UI
    try {
      await prisma.channel.update({
        where: { id: parsed.channelId },
        data: { syncError: err.response?.data?.error_description || err.message },
      });
    } catch {}
    res.status(500).send(renderPage('Authorization failed', err.response?.data?.error_description || err.message));
  }
});

function renderPage(title, body, { autoClose = false } = {}) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: Inter, system-ui, sans-serif; background: linear-gradient(135deg,#10b981,#0d9488); color:white; min-height:100vh; display:flex; align-items:center; justify-content:center; margin:0; }
  .card { background: rgba(255,255,255,0.95); color:#0f172a; padding:32px 40px; border-radius:20px; max-width:440px; text-align:center; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
  h1 { margin:0 0 12px; font-size:22px; }
  p  { margin:0; color:#475569; line-height:1.5; font-size:14px; }
  button { margin-top:20px; background:#10b981; color:white; border:none; padding:10px 20px; border-radius:10px; font-weight:700; cursor:pointer; }
</style></head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${body}</p>
    <button onclick="window.close()">Close window</button>
  </div>
  ${autoClose ? '<script>setTimeout(() => window.close(), 3000);</script>' : ''}
</body></html>`;
}

module.exports = router;
