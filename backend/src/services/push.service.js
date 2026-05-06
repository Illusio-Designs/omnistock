// Outbound push-notification sender.
//
// Uses Expo's push service (expo.host/--/api/v2/push/send). No SDK
// dependency — it's just a JSON POST. The free tier handles ~100k
// notifications/day which is plenty for current scale.
//
// Expo handles:
//   - APNs and FCM credentials per-app (we set them once in the Expo
//     dashboard or via EAS — no Firebase / Apple cert handling here)
//   - Batching, retries, receipts
//   - DeviceNotRegistered errors (returned in the response so we can
//     prune dead tokens — see purgeBadTokens below)
//
// Server-side flow:
//   sendToTenant(tenantId, payload)  → fan-out to every push_devices row
//                                       for the tenant
//   sendToUser(userId, payload)      → just that user's devices
//
// The actual HTTP send is handed to the job queue (jobs.service) so a
// transient Expo outage doesn't drop notifications and so the request
// that triggered it returns immediately.

const axios = require('axios');
const db = require('../utils/db');

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100; // Expo's documented per-request cap

async function devicesForUser(userId) {
  return db('push_devices').where({ userId }).select('id', 'token');
}

async function devicesForTenant(tenantId) {
  return db('push_devices').where({ tenantId }).select('id', 'token');
}

/**
 * Build a single Expo push message. `data.path` is the route the mobile
 * app should navigate to when the user taps the notification.
 */
function buildMessage({ token, title, body, path, data, sound = 'default', priority = 'default' }) {
  return {
    to: token,
    title,
    body,
    sound,
    priority,
    data: { ...(data || {}), ...(path ? { path } : {}) },
  };
}

/** Hit Expo with one batch (≤100 messages). Returns the data array. */
async function postBatch(messages) {
  const r = await axios.post(EXPO_PUSH_URL, messages, {
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    timeout: 15_000,
    validateStatus: () => true,
  });
  if (r.status < 200 || r.status >= 300) {
    throw new Error(`Expo push ${r.status}: ${typeof r.data === 'string' ? r.data.slice(0, 200) : JSON.stringify(r.data).slice(0, 200)}`);
  }
  return r.data?.data || [];
}

/**
 * Drop tokens that Expo says are dead. Called after every send so the
 * registry self-heals when a user uninstalls or revokes notifications.
 */
async function purgeBadTokens(messages, results) {
  const dead = [];
  results.forEach((r, i) => {
    if (r?.status === 'error' && /DeviceNotRegistered|InvalidCredentials/i.test(r.message || '')) {
      dead.push(messages[i].to);
    }
  });
  if (dead.length) {
    await db('push_devices').whereIn('token', dead).del().catch(() => {});
  }
}

async function sendBatched(messages) {
  if (!messages.length) return { sent: 0, dead: 0 };
  let sent = 0;
  let deadBefore = 0;
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const batch = messages.slice(i, i + BATCH_SIZE);
    try {
      const results = await postBatch(batch);
      sent += results.filter((r) => r?.status === 'ok').length;
      const before = deadBefore;
      await purgeBadTokens(batch, results);
      deadBefore = before; // we don't read from DB to count, just track
    } catch (err) {
      // Throw out — the job queue retries. Don't lose half a fan-out.
      throw err;
    }
  }
  return { sent, attempted: messages.length };
}

// ── Convenience fan-outs ─────────────────────────────────────────────────

async function sendToUser(userId, payload) {
  const devices = await devicesForUser(userId);
  if (!devices.length) return { sent: 0, attempted: 0 };
  return sendBatched(devices.map((d) => buildMessage({ ...payload, token: d.token })));
}

async function sendToTenant(tenantId, payload) {
  const devices = await devicesForTenant(tenantId);
  if (!devices.length) return { sent: 0, attempted: 0 };
  return sendBatched(devices.map((d) => buildMessage({ ...payload, token: d.token })));
}

/**
 * Enqueue a tenant-wide push instead of awaiting it inline. Use this from
 * route handlers so the API response isn't blocked on Expo. The job-queue
 * handler is registered separately in jobs/handlers.js.
 */
async function enqueueTenantPush(tenantId, payload) {
  const jobs = require('./jobs.service');
  return jobs.enqueue('push.send', { scope: 'tenant', tenantId, payload });
}

async function enqueueUserPush(userId, payload) {
  const jobs = require('./jobs.service');
  return jobs.enqueue('push.send', { scope: 'user', userId, payload });
}

module.exports = {
  sendToUser,
  sendToTenant,
  enqueueTenantPush,
  enqueueUserPush,
};
