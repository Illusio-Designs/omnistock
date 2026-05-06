// Health-check endpoints for uptime monitors and ad-hoc ops checks.
//
//   GET /healthz   process is alive — answers 200 as long as Node is
//                   running. No DB query. Minimal latency. This is what
//                   UptimeRobot / BetterStack / Pingdom should hit every
//                   minute.
//   GET /readyz    process is ready to take traffic — checks the DB and
//                   any other critical dependency. Returns 503 if anything
//                   is broken (eg. DB unreachable on boot, lost connection
//                   pool, ENCRYPTION_KEY missing).
//
// The legacy paths /health, /live, /ready are kept as aliases so any
// existing monitor wired against them continues to work; new configurations
// should use the canonical /healthz + /readyz names.
//
// IMPORTANT: this router is mounted BEFORE the global rate limiter so a
// flood of probe requests doesn't count against the 200/15min cap shared
// with real users behind the same IP. Probes also don't hit any auth or
// audit middleware.

const { Router } = require('express');

const router = Router();

const startedAt = new Date();

function liveness(_req, res) {
  res.status(200).json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    pid: process.pid,
    startedAt: startedAt.toISOString(),
    now: new Date().toISOString(),
  });
}

async function readiness(_req, res) {
  const checks = {};
  let ok = true;

  // ── DB ────────────────────────────────────────────────
  try {
    const db = require('../utils/db');
    const t0 = Date.now();
    await db.raw('SELECT 1 AS ok');
    checks.db = { status: 'ok', latencyMs: Date.now() - t0 };
  } catch (err) {
    checks.db = { status: 'fail', error: err.message };
    ok = false;
  }

  // ── Essential env vars ────────────────────────────────
  // These don't change at runtime; if they're missing the process is
  // definitely not ready to serve real traffic.
  const required = ['JWT_SECRET', 'ENCRYPTION_KEY'];
  const missing = required.filter((k) => !process.env[k]);
  checks.config = missing.length
    ? { status: 'fail', missing }
    : { status: 'ok' };
  if (missing.length) ok = false;

  res.status(ok ? 200 : 503).json({
    status: ok ? 'ready' : 'not-ready',
    now: new Date().toISOString(),
    checks,
  });
}

// Canonical names (k8s convention)
router.get('/healthz', liveness);
router.get('/readyz',  readiness);

// Legacy aliases — keep around for any monitor already configured
router.get('/health', liveness);
router.get('/live',   liveness);
router.get('/ready',  readiness);

module.exports = router;
