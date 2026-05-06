// Idempotency middleware for write endpoints (esp. payments).
//
// Clients pass `Idempotency-Key: <uuid>` on a POST. The first request
// executes normally; the response is cached against the key for 24 hours.
// Subsequent retries with the same key + same path + same tenant return
// the cached response instead of re-executing — preventing double-charge
// when networks drop the original 200 reply.
//
// Storage: `idempotency_keys` table (created in initDb.js).
//
// Usage:
//   router.post('/something', idempotent(), handler)
//
// To skip caching errors, pass { cacheErrors: false } (default true).

const db = require('../utils/db');

const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function idempotent(opts = {}) {
  const { cacheErrors = true } = opts;

  return async function idempotencyMiddleware(req, res, next) {
    const key = req.get('Idempotency-Key') || req.get('idempotency-key');
    if (!key) return next(); // header is optional — feature is opt-in per request

    if (key.length < 8 || key.length > 128) {
      return res.status(400).json({ error: 'Idempotency-Key must be 8-128 chars' });
    }

    const tenantId = req.tenant?.id || null;
    const path = req.originalUrl.split('?')[0];

    try {
      const row = await db('idempotency_keys')
        .where({ key, tenantId, path })
        .first();

      if (row) {
        // Hit — return the cached response.
        const stored = JSON.parse(row.response);
        res.status(row.statusCode).json(stored);
        return;
      }
    } catch (err) {
      // If the lookup itself fails, fall through and process the request as
      // normal — better to risk a duplicate than to 500 every payment.
      console.error('[idempotency] lookup failed:', err.message);
      return next();
    }

    // Miss — patch res.json so we capture the outbound payload, then save it.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const status = res.statusCode || 200;
      // Don't cache 5xx (transient server errors). Caching 4xx is useful so
      // a client retrying after a validation error gets the same answer.
      const shouldCache = status < 500 && (cacheErrors || status < 400);
      if (shouldCache) {
        db('idempotency_keys')
          .insert({
            key,
            tenantId,
            path,
            statusCode: status,
            response: JSON.stringify(body),
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + TTL_MS),
          })
          .catch((err) => {
            // ER_DUP_ENTRY = parallel race; another process beat us. Ignore.
            if (err?.code !== 'ER_DUP_ENTRY') {
              console.error('[idempotency] cache write failed:', err.message);
            }
          });
      }
      return originalJson(body);
    };

    return next();
  };
}

// Periodic cleanup — call from a cron once a day to drop expired keys.
async function purgeExpiredIdempotencyKeys() {
  try {
    const deleted = await db('idempotency_keys')
      .where('expiresAt', '<', new Date())
      .del();
    return deleted;
  } catch (err) {
    console.error('[idempotency] purge failed:', err.message);
    return 0;
  }
}

module.exports = { idempotent, purgeExpiredIdempotencyKeys };
