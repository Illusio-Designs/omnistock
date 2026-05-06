// Wires every job-type handler into services/jobs.service.js. Imported by
// index.js at boot. New handlers go here so adding them never requires
// touching the queue core.
//
// Job types (keep this list in sync with the admin /jobs page filter):
//   email.send              — fire any of the email.service.* templates
//   webhook.deliver         — POST to a tenant-configured webhook with
//                              HMAC; retried on non-2xx
//   channel.sync            — pull latest orders / inventory from a single
//                              channel (replaces the cron broadcast model
//                              for ad-hoc syncs)
//   audit.purge             — delete audit_logs older than retention window
//
// Handler contract:
//   handler(payload, ctx) → Promise<void>
//   Throw on retryable failure; the queue applies exponential back-off and
//   sends to dead-letter after maxAttempts.
//
// Adding a new type:
//   1. Add a function below
//   2. Reference it in registerAll()
//   3. Use jobs.enqueue('your.type', payload) from anywhere

const axios = require('axios');
const crypto = require('crypto');

// ── email.send ──────────────────────────────────────────────────────────────
// payload: { template: 'sendInvoicePaid' | …, args: { … } }
async function emailSend(payload) {
  const { template, args } = payload || {};
  if (!template) throw new Error('email.send requires `template`');
  const email = require('../services/email.service');
  const fn = email[template];
  if (typeof fn !== 'function') throw new Error(`email.send: unknown template "${template}"`);
  await fn(args || {});
}

// ── webhook.deliver ─────────────────────────────────────────────────────────
// payload: { url, body, secret?, headers? }
// Signs body with HMAC-SHA256 if `secret` is provided. Considers any 2xx
// response a success. Network errors and 5xx throw to trigger retry; 4xx
// also throws — the consumer fixes their endpoint and we'll retry on
// admin command.
async function webhookDeliver(payload) {
  const { url, body = {}, secret, headers = {}, method = 'POST', timeoutMs = 10_000 } = payload || {};
  if (!url) throw new Error('webhook.deliver requires `url`');
  const raw = JSON.stringify(body);
  const finalHeaders = { 'content-type': 'application/json', ...headers };
  if (secret) {
    finalHeaders['x-kartriq-signature'] = crypto
      .createHmac('sha256', secret).update(raw).digest('hex');
  }
  const r = await axios.request({
    method, url, data: raw, headers: finalHeaders, timeout: timeoutMs,
    validateStatus: () => true, // we'll inspect manually
  });
  if (r.status < 200 || r.status >= 300) {
    throw new Error(`webhook.deliver: ${r.status} ${typeof r.data === 'string' ? r.data.slice(0, 200) : ''}`);
  }
}

// ── channel.sync ────────────────────────────────────────────────────────────
// payload: { channelId, scope?: 'orders' | 'inventory' | 'tracking' }
async function channelSync(payload) {
  const { channelId, scope = 'orders' } = payload || {};
  if (!channelId) throw new Error('channel.sync requires `channelId`');
  const prisma = require('../utils/prisma');
  const { getAdapter, importOrders } = require('../services/channel.service');
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel || !channel.isActive) return; // tenant disconnected — fine
  const adapter = getAdapter(channel);
  if (scope === 'orders' && typeof adapter.fetchOrders === 'function') {
    const raws = await adapter.fetchOrders({ since: channel.lastSyncAt });
    if (raws?.length) {
      await importOrders(channel.id, raws, { tenantId: channel.tenantId });
    }
    await prisma.channel.update({
      where: { id: channel.id },
      data: { lastSyncAt: new Date(), syncError: null },
    });
  }
  // inventory / tracking handlers can hook in here as adapters expose them.
}

// ── push.send ───────────────────────────────────────────────────────────────
// payload: { scope: 'tenant' | 'user', tenantId? | userId?, payload: {...} }
// payload.payload  shape: { title, body, path?, data?, sound?, priority? }
async function pushSend(payload) {
  const { scope, tenantId, userId, payload: msg } = payload || {};
  if (!msg) throw new Error('push.send: payload.payload required');
  const push = require('../services/push.service');
  if (scope === 'tenant') {
    if (!tenantId) throw new Error('push.send: tenantId required for scope=tenant');
    return push.sendToTenant(tenantId, msg);
  }
  if (scope === 'user') {
    if (!userId) throw new Error('push.send: userId required for scope=user');
    return push.sendToUser(userId, msg);
  }
  throw new Error(`push.send: unknown scope "${scope}"`);
}

// ── audit.purge ─────────────────────────────────────────────────────────────
// payload: { keepDays?: number } — defaults to 365
async function auditPurge(payload = {}) {
  const keepDays = Number(payload.keepDays || 365);
  const cutoff = new Date(Date.now() - keepDays * 86_400_000);
  const db = require('../utils/db');
  const n = await db('audit_logs').where('createdAt', '<', cutoff).del();
  console.log(`[jobs] audit.purge removed ${n} rows older than ${cutoff.toISOString()}`);
}

function registerAll(jobs) {
  jobs.register('email.send',      emailSend);
  jobs.register('webhook.deliver', webhookDeliver);
  jobs.register('channel.sync',    channelSync);
  jobs.register('audit.purge',     auditPurge);
  jobs.register('push.send',       pushSend);
}

module.exports = { registerAll };
