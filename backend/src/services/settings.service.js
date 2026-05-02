// Platform settings — key/value store backed by the PlatformSetting table.
// Reads are cached in-process for 60s. Secret values are AES-256-GCM encrypted
// at rest using the existing ENCRYPTION_KEY.
//
// Fallback policy: if a key is not in the DB, we fall back to process.env
// (uppercase, dot → underscore). This keeps old .env-based setups working
// until the founder migrates their values through the Admin → Settings UI.

const prisma = require('../utils/prisma');
const { encryptCredentials, decryptCredentials } = require('../utils/crypto');

const CACHE_TTL_MS = 60 * 1000;
let cache = null;
let cacheAt = 0;

async function loadAll() {
  if (cache && Date.now() - cacheAt < CACHE_TTL_MS) return cache;
  const rows = await prisma.platformSetting.findMany();
  const map = new Map();
  for (const row of rows) {
    let val = row.value;
    if (row.isSecret && val) {
      try {
        // The prisma shim auto-parses any string starting with `{` or `[` into an
        // object, so by the time we get here `val` may already be the encrypted
        // payload object — only JSON.parse it if it's still a raw string.
        const parsed = typeof val === 'string' ? JSON.parse(val) : val;
        val = decryptCredentials(parsed);
      } catch {
        val = null;
      }
    }
    map.set(row.key, { ...row, value: val });
  }
  cache = map;
  cacheAt = Date.now();
  return cache;
}

function invalidate() { cache = null; }

function envFallback(key) {
  const envKey = key.replace(/\./g, '_').toUpperCase();
  return process.env[envKey] || null;
}

// ── Public API ──────────────────────────────────────────────
async function get(key, { fallbackEnv = true } = {}) {
  const all = await loadAll();
  const row = all.get(key);
  if (row && row.value !== null && row.value !== undefined && row.value !== '') {
    return row.value;
  }
  return fallbackEnv ? envFallback(key) : null;
}

async function getMany(keys) {
  const out = {};
  await loadAll();
  for (const k of keys) out[k] = await get(k);
  return out;
}

// Returns all non-secret values in a category + a flag indicating if secrets
// are set. Secrets are never returned in plaintext to the UI.
async function listCategory(category) {
  const all = await loadAll();
  const result = [];
  for (const [, row] of all) {
    if (row.category !== category) continue;
    result.push({
      key: row.key,
      category: row.category,
      label: row.label,
      description: row.description,
      isSecret: row.isSecret,
      value: row.isSecret ? null : row.value, // never leak secret values
      isSet: row.value !== null && row.value !== '',
      updatedAt: row.updatedAt,
    });
  }
  return result.sort((a, b) => a.key.localeCompare(b.key));
}

// Platform admin writes one key/value
async function set(key, value, { category = 'general', label = null, description = null, isSecret = false, updatedBy = null } = {}) {
  let stored = value;
  if (isSecret && value !== null && value !== undefined) {
    stored = JSON.stringify(encryptCredentials(String(value)));
  }
  const row = await prisma.platformSetting.upsert({
    where: { key },
    update: { value: stored, category, label, description, isSecret, updatedBy },
    create: { key, value: stored, category, label, description, isSecret, updatedBy },
  });
  invalidate();
  return row;
}

// Bulk write — used by the admin page "Save all" button
async function setMany(items, updatedBy = null) {
  for (const item of items) {
    // Skip empty secrets so the founder can leave them blank to preserve the existing value
    if (item.isSecret && (item.value === '' || item.value === null || item.value === undefined)) continue;
    await set(item.key, item.value, { ...item, updatedBy });
  }
  invalidate();
}

async function remove(key) {
  await prisma.platformSetting.delete({ where: { key } }).catch(() => {});
  invalidate();
}

module.exports = { get, getMany, listCategory, set, setMany, remove, invalidate };
