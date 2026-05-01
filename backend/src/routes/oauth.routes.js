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
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET env var is required');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function verifyState(state) {
  if (!state || typeof state !== 'string' || !state.includes('.')) return null;
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET env var is required');
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
  if (!parsed) return res.status(400).send(renderPage('Authorization failed', 'Invalid or expired state. Please retry from Omnistock.'));
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
      `Amazon Seller account <b>${selling_partner_id}</b> linked. You can close this window and return to Omnistock.`,
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

// ══════════════════════════════════════════════════════════════════════════
// SHOPIFY — one Partner app, each store installs it via OAuth
// ══════════════════════════════════════════════════════════════════════════

// Generic status endpoint — works for shopify / flipkart / meta
router.get('/:provider/status',
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

// GET /api/v1/oauth/shopify/start?channelId=xxx&shop=mystore.myshopify.com
router.get('/shopify/start',
  authenticate, requireTenant, requirePermission('channels.update'),
  async (req, res) => {
    try {
      const { channelId, shop } = req.query;
      if (!channelId) return res.status(400).json({ error: 'channelId required' });
      if (!shop) return res.status(400).json({ error: 'shop required (e.g. mystore.myshopify.com)' });
      if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(String(shop))) {
        return res.status(400).json({ error: 'Invalid shop domain. Must be something.myshopify.com' });
      }

      const channel = await prisma.channel.findFirst({
        where: { id: String(channelId), tenantId: req.tenant.id },
      });
      if (!channel) return res.status(404).json({ error: 'Channel not found' });
      if (channel.type !== 'SHOPIFY') return res.status(400).json({ error: 'Channel is not Shopify' });

      const [apiKey, redirectUri, scopes] = await Promise.all([
        settings.get('shopify.apiKey'),
        settings.get('shopify.redirectUri'),
        settings.get('shopify.scopes'),
      ]);
      if (!apiKey) return res.status(400).json({ error: 'shopify.apiKey not set in Admin → Settings' });
      if (!redirectUri) return res.status(400).json({ error: 'shopify.redirectUri not set in Admin → Settings' });

      const scopeList = (scopes || 'read_products,write_products,read_orders,write_orders,read_inventory,write_inventory').trim();

      const state = signState({
        provider: 'shopify',
        channelId: channel.id,
        tenantId: req.tenant.id,
        shop: String(shop),
        nonce: crypto.randomBytes(8).toString('hex'),
        exp: Date.now() + STATE_TTL_MS,
      });

      const url = `https://${shop}/admin/oauth/authorize?` +
        new URLSearchParams({
          client_id: apiKey,
          scope: scopeList,
          redirect_uri: redirectUri,
          state,
        }).toString();

      res.json({ url, state });
    } catch (err) {
      console.error('[oauth/shopify/start]', err);
      res.status(500).json({ error: err.message });
    }
  }
);

// GET /api/v1/oauth/shopify/callback?code=...&hmac=...&shop=...&state=...
router.get('/shopify/callback', async (req, res) => {
  const { code, hmac, shop, state } = req.query;

  const parsed = verifyState(String(state || ''));
  if (!parsed) return res.status(400).send(renderPage('Authorization failed', 'Invalid or expired state.'));
  if (parsed.provider !== 'shopify') return res.status(400).send(renderPage('Authorization failed', 'State/provider mismatch.'));
  if (!code) return res.status(400).send(renderPage('Authorization failed', 'Missing authorization code.'));

  try {
    const [apiKey, apiSecret] = await Promise.all([
      settings.get('shopify.apiKey'),
      settings.get('shopify.apiSecret'),
    ]);
    if (!apiKey || !apiSecret) {
      return res.status(500).send(renderPage('Platform not configured', 'shopify.apiKey / apiSecret not set.'));
    }

    // Verify Shopify HMAC — https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant#step-3-verify-the-installation-request
    const params = { ...req.query };
    delete params.hmac;
    delete params.signature;
    const message = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&');
    const expectedHmac = crypto.createHmac('sha256', apiSecret).update(message).digest('hex');
    if (expectedHmac !== String(hmac || '')) {
      return res.status(401).send(renderPage('Authorization failed', 'HMAC verification failed.'));
    }

    // Exchange code for a permanent access token
    const tokenRes = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: apiKey,
      client_secret: apiSecret,
      code,
    });
    const { access_token, scope } = tokenRes.data;
    if (!access_token) throw new Error('Shopify did not return an access_token');

    const channel = await prisma.channel.findFirst({
      where: { id: parsed.channelId, tenantId: parsed.tenantId },
    });
    if (!channel) throw new Error('Channel no longer exists');

    await prisma.channel.update({
      where: { id: channel.id },
      data: {
        credentials: encryptCredentials({
          shopUrl: `https://${shop}`,
          accessToken: access_token,
          scope: scope || null,
        }),
        syncError: null,
        lastSyncAt: null,
      },
    });

    res.send(renderPage(
      '✓ Connected',
      `Shopify store <b>${shop}</b> linked. You can close this window.`,
      { autoClose: true }
    ));
  } catch (err) {
    console.error('[oauth/shopify/callback]', err.response?.data || err.message);
    try {
      await prisma.channel.update({
        where: { id: parsed.channelId },
        data: { syncError: err.response?.data?.error_description || err.message },
      });
    } catch {}
    res.status(500).send(renderPage('Authorization failed', err.response?.data?.error_description || err.message));
  }
});

// ══════════════════════════════════════════════════════════════════════════
// FLIPKART — OAuth 2.0 authorization code flow
// ══════════════════════════════════════════════════════════════════════════

router.get('/flipkart/start',
  authenticate, requireTenant, requirePermission('channels.update'),
  async (req, res) => {
    try {
      const { channelId } = req.query;
      if (!channelId) return res.status(400).json({ error: 'channelId required' });

      const channel = await prisma.channel.findFirst({
        where: { id: String(channelId), tenantId: req.tenant.id },
      });
      if (!channel) return res.status(404).json({ error: 'Channel not found' });
      if (channel.type !== 'FLIPKART') return res.status(400).json({ error: 'Channel is not Flipkart' });

      const [appId, redirectUri] = await Promise.all([
        settings.get('flipkart.appId'),
        settings.get('flipkart.redirectUri'),
      ]);
      if (!appId) return res.status(400).json({ error: 'flipkart.appId not set in Admin → Settings' });
      if (!redirectUri) return res.status(400).json({ error: 'flipkart.redirectUri not set in Admin → Settings' });

      const state = signState({
        provider: 'flipkart',
        channelId: channel.id,
        tenantId: req.tenant.id,
        nonce: crypto.randomBytes(8).toString('hex'),
        exp: Date.now() + STATE_TTL_MS,
      });

      const url = 'https://api.flipkart.net/oauth-service/oauth/authorize?' +
        new URLSearchParams({
          response_type: 'code',
          client_id: appId,
          redirect_uri: redirectUri,
          scope: 'Seller_Api',
          state,
        }).toString();

      res.json({ url, state });
    } catch (err) {
      console.error('[oauth/flipkart/start]', err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/flipkart/callback', async (req, res) => {
  const { code, state } = req.query;
  const parsed = verifyState(String(state || ''));
  if (!parsed || parsed.provider !== 'flipkart') {
    return res.status(400).send(renderPage('Authorization failed', 'Invalid state.'));
  }
  if (!code) return res.status(400).send(renderPage('Authorization failed', 'Missing authorization code.'));

  try {
    const [appId, appSecret, redirectUri] = await Promise.all([
      settings.get('flipkart.appId'),
      settings.get('flipkart.appSecret'),
      settings.get('flipkart.redirectUri'),
    ]);
    if (!appId || !appSecret) return res.status(500).send(renderPage('Platform not configured', 'flipkart.appId / appSecret not set.'));

    const basic = Buffer.from(`${appId}:${appSecret}`).toString('base64');
    const tokenRes = await axios.post(
      'https://api.flipkart.net/oauth-service/oauth/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: String(code),
        redirect_uri: redirectUri,
      }).toString(),
      { headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token, refresh_token, expires_in } = tokenRes.data;

    const channel = await prisma.channel.findFirst({
      where: { id: parsed.channelId, tenantId: parsed.tenantId },
    });
    if (!channel) throw new Error('Channel no longer exists');

    await prisma.channel.update({
      where: { id: channel.id },
      data: {
        credentials: encryptCredentials({
          accessToken: access_token,
          refreshToken: refresh_token,
          expiresAt: new Date(Date.now() + (expires_in || 3600) * 1000).toISOString(),
        }),
        syncError: null,
      },
    });

    res.send(renderPage('✓ Connected', 'Flipkart seller account linked. You can close this window.', { autoClose: true }));
  } catch (err) {
    console.error('[oauth/flipkart/callback]', err.response?.data || err.message);
    try {
      await prisma.channel.update({
        where: { id: parsed.channelId },
        data: { syncError: err.response?.data?.error_description || err.message },
      });
    } catch {}
    res.status(500).send(renderPage('Authorization failed', err.response?.data?.error_description || err.message));
  }
});

// ══════════════════════════════════════════════════════════════════════════
// META (Facebook / Instagram / WhatsApp) — one App ID for the whole platform
// ══════════════════════════════════════════════════════════════════════════

router.get('/meta/start',
  authenticate, requireTenant, requirePermission('channels.update'),
  async (req, res) => {
    try {
      const { channelId } = req.query;
      if (!channelId) return res.status(400).json({ error: 'channelId required' });

      const channel = await prisma.channel.findFirst({
        where: { id: String(channelId), tenantId: req.tenant.id },
      });
      if (!channel) return res.status(404).json({ error: 'Channel not found' });
      if (!['FACEBOOK', 'INSTAGRAM', 'WHATSAPP_BUSINESS'].includes(channel.type)) {
        return res.status(400).json({ error: 'Channel is not Facebook / Instagram / WhatsApp' });
      }

      const [appId, redirectUri] = await Promise.all([
        settings.get('meta.appId'),
        settings.get('meta.redirectUri'),
      ]);
      if (!appId) return res.status(400).json({ error: 'meta.appId not set in Admin → Settings' });
      if (!redirectUri) return res.status(400).json({ error: 'meta.redirectUri not set in Admin → Settings' });

      // Scopes depend on the channel type
      const scopes = {
        FACEBOOK:          'pages_show_list,pages_manage_metadata,pages_read_engagement,catalog_management,business_management',
        INSTAGRAM:         'instagram_basic,instagram_manage_insights,instagram_shopping_tag_products,pages_show_list,business_management',
        WHATSAPP_BUSINESS: 'whatsapp_business_management,whatsapp_business_messaging,business_management',
      }[channel.type];

      const state = signState({
        provider: 'meta',
        channelType: channel.type,
        channelId: channel.id,
        tenantId: req.tenant.id,
        nonce: crypto.randomBytes(8).toString('hex'),
        exp: Date.now() + STATE_TTL_MS,
      });

      const url = 'https://www.facebook.com/v18.0/dialog/oauth?' +
        new URLSearchParams({
          client_id: appId,
          redirect_uri: redirectUri,
          state,
          scope: scopes,
          response_type: 'code',
        }).toString();

      res.json({ url, state });
    } catch (err) {
      console.error('[oauth/meta/start]', err);
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/meta/callback', async (req, res) => {
  const { code, state } = req.query;
  const parsed = verifyState(String(state || ''));
  if (!parsed || parsed.provider !== 'meta') return res.status(400).send(renderPage('Authorization failed', 'Invalid state.'));
  if (!code) return res.status(400).send(renderPage('Authorization failed', 'Missing code.'));

  try {
    const [appId, appSecret, redirectUri] = await Promise.all([
      settings.get('meta.appId'),
      settings.get('meta.appSecret'),
      settings.get('meta.redirectUri'),
    ]);
    if (!appId || !appSecret) return res.status(500).send(renderPage('Platform not configured', 'meta.appId / appSecret not set.'));

    // Exchange code → short-lived user access token
    const tokenRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        client_id: appId,
        client_secret: appSecret,
        redirect_uri: redirectUri,
        code: String(code),
      },
    });
    const shortToken = tokenRes.data.access_token;

    // Upgrade to long-lived token (60 days)
    const longRes = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortToken,
      },
    });
    const longToken = longRes.data.access_token;

    const channel = await prisma.channel.findFirst({
      where: { id: parsed.channelId, tenantId: parsed.tenantId },
    });
    if (!channel) throw new Error('Channel no longer exists');

    await prisma.channel.update({
      where: { id: channel.id },
      data: {
        credentials: encryptCredentials({
          // Meta adapters read `accessToken`. Store both names so the long-lived
          // user token is available if adapters need to distinguish later.
          accessToken: longToken,
          userAccessToken: longToken,
          channelType: parsed.channelType,
          // pageId / phoneNumberId / businessAccountId still need a post-OAuth
          // "pick your page/number" step — left blank for now.
        }),
        syncError: null,
      },
    });

    res.send(renderPage('✓ Connected', `${parsed.channelType} account linked. You can close this window.`, { autoClose: true }));
  } catch (err) {
    console.error('[oauth/meta/callback]', err.response?.data || err.message);
    try {
      await prisma.channel.update({
        where: { id: parsed.channelId },
        data: { syncError: err.response?.data?.error?.message || err.message },
      });
    } catch {}
    res.status(500).send(renderPage('Authorization failed', err.response?.data?.error?.message || err.message));
  }
});

module.exports = router;
