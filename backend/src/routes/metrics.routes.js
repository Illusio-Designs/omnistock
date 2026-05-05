// Frontend Web Vitals + RUM ingestion. Public, unauthenticated, and very
// lightly rate-limited per IP — beacons are fire-and-forget.
//
// Today we just log via the structured logger so Pino + the log aggregator
// (Loki, CloudWatch, Datadog…) can roll them up. Once we have enough volume
// to justify a dedicated table, swap the logger.info() for an insert into
// `web_vitals` and add a Grafana dashboard.

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const router = Router();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  // Don't 429 the beacon — quietly drop. We'd rather lose a sample than
  // generate noisy errors in the browser console.
  handler: (_req, res) => res.status(204).end(),
});

const ALLOWED_NAMES = new Set(['CLS', 'INP', 'LCP', 'FCP', 'TTFB', 'FID']);
const ALLOWED_RATINGS = new Set(['good', 'needs-improvement', 'poor']);

router.post('/vitals', limiter, (req, res) => {
  const b = req.body || {};

  const name = String(b.name || '').toUpperCase();
  if (!ALLOWED_NAMES.has(name)) return res.status(204).end();

  const value = Number(b.value);
  if (!Number.isFinite(value) || value < 0 || value > 1e9) return res.status(204).end();

  const rating = ALLOWED_RATINGS.has(b.rating) ? b.rating : null;
  const path = typeof b.path === 'string' ? b.path.slice(0, 256) : null;

  logger.info(
    {
      vitals: {
        name,
        value: Math.round(value * 100) / 100,
        rating,
        path,
        ua: req.headers['user-agent']?.slice(0, 200),
        ip: req.ip,
      },
    },
    '[vitals]'
  );

  // 204 = no content — beacon doesn't care about the body.
  res.status(204).end();
});

module.exports = router;
