const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const { randomUUID } = require('crypto');

dotenv.config();

// ── Sentry — must init BEFORE requiring any module that handles errors.
// No-op when SENTRY_DSN is unset, so dev/test runs unchanged.
const Sentry = require('@sentry/node');
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACE_RATE || 0.05),
    // Drop request bodies from event payloads — they may contain credentials
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        if (event.request.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
          delete event.request.headers['x-razorpay-signature'];
        }
      }
      return event;
    },
  });
}

// ── axios global defaults — no outbound request blocks the event loop
// indefinitely. Channel adapters and Razorpay calls all share the default.
const axios = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');
axios.defaults.timeout = Number(process.env.AXIOS_TIMEOUT_MS || 15_000);
axiosRetry(axios, {
  retries: Number(process.env.AXIOS_RETRIES || 2),
  retryDelay: axiosRetry.exponentialDelay,
  // Retry on network errors + 5xx + 429. Do NOT retry POST by default — most
  // POSTs aren't idempotent. Per-call override available via axios config.
  retryCondition: (err) => {
    if (axiosRetry.isNetworkOrIdempotentRequestError(err)) return true;
    return err.response && err.response.status === 429;
  },
});

const logger = require('./utils/logger');

const authRoutes = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const orderRoutes = require('./routes/order.routes');
const purchaseRoutes = require('./routes/purchase.routes');
const vendorRoutes = require('./routes/vendor.routes');
const warehouseRoutes = require('./routes/warehouse.routes');
const channelRoutes = require('./routes/channel.routes');
const customerRoutes = require('./routes/customer.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const reportRoutes = require('./routes/report.routes');
const shipmentRoutes = require('./routes/shipment.routes');
const planRoutes = require('./routes/plan.routes');
const billingRoutes = require('./routes/billing.routes');
const adminRoutes = require('./routes/admin.routes');
const roleRoutes = require('./routes/role.routes');
const publicRoutes = require('./routes/public.routes');
const webhookRoutes = require('./routes/webhook.routes');
const paymentRoutes = require('./routes/payment.routes');
const usersRoutes = require('./routes/users.routes');
const oauthRoutes = require('./routes/oauth.routes');
const ticketsRoutes = require('./routes/tickets.routes');
const metricsRoutes = require('./routes/metrics.routes');
const { autoAudit } = require('./services/audit.service');

const { initDb } = require('./bootstrap/initDb');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Trust proxy (needed behind nginx/Apache/load balancer) ──
app.set('trust proxy', 1);

// ── Security & Middleware ──────────────────────────────
app.use(helmet());
const corsConfig = require('./config/cors.config');
app.use(cors(corsConfig));
app.use(compression());

// ── Request ID + structured per-request logger ───────────────────
// Every inbound request gets a stable ID echoed via the x-request-id
// header and threaded into req.log so all log lines for one request
// can be correlated. Distributed tracing on a budget.
app.use((req, res, next) => {
  const incoming = req.headers['x-request-id'];
  req.id = (typeof incoming === 'string' && incoming.length < 64) ? incoming : randomUUID();
  res.setHeader('x-request-id', req.id);
  // req.tenant / req.user are populated by auth middleware later, so we
  // re-bind the logger inside autoAudit / route handlers if we want them.
  req.log = logger.child({ requestId: req.id });
  next();
});

// Replace Morgan with structured access logging via Pino. Skips /health
// to keep load-balancer probes from drowning the log stream.
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    if (req.path === '/health' || req.path === '/live' || req.path === '/ready') return;
    const durMs = Number((process.hrtime.bigint() - start) / 1_000_000n);
    req.log?.info({
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durMs,
      tenantId: req.tenant?.id,
      userId: req.user?.id,
    }, 'request');
  });
  next();
});
app.use(express.json({
  limit: '10mb',
  // Stash the unparsed bytes so HMAC verification on payment webhooks can
  // hash the exact payload Razorpay signed. JSON.stringify(req.body) does
  // NOT round-trip — key order, whitespace and unicode escaping all differ
  // — so HMAC over a re-stringified body will reject every legitimate event.
  verify: (req, _res, buf) => {
    if (buf && buf.length) req.rawBody = buf.toString('utf8');
  },
}));
app.use(express.urlencoded({ extended: true }));

// Rate limiting — relaxed in test mode so the e2e test suite can run
const isTestMode = process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true';

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isTestMode ? 10000 : 200,
});
app.use(globalLimiter);

// Strict rate limit for auth (5 attempts per 15 min)
const authLimiter = rateLimit({
  windowMs: isTestMode ? 60 * 1000 : 15 * 60 * 1000,
  max: isTestMode ? 1000 : 5,
  skipSuccessfulRequests: true,
  message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
});
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/auth/onboard', authLimiter);
app.use('/api/v1/auth/google', authLimiter);

// Webhook rate limit — one tenant shouldn't be able to DOS us via webhook flood
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTestMode ? 10000 : 120,
  message: { error: 'Too many webhook requests' },
});
app.use('/api/v1/webhooks', webhookLimiter);
// Razorpay sends webhooks to /payments/webhook (mounted there for legacy
// compatibility); apply the same throttle so a flood can't exhaust the
// global limiter.
app.use('/api/v1/payments/webhook', webhookLimiter);

// Per-route brute-force guard for signature-verify endpoints. A timing
// oracle on /verify is impractical with 60 req/min cap and would-be
// attackers can't grind keys.
const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTestMode ? 10000 : 60,
  skipSuccessfulRequests: true,
  message: { error: 'Too many verification attempts' },
});
app.use('/api/v1/payments/verify', paymentLimiter);
app.use('/api/v1/payments/wallet-verify', paymentLimiter);
app.use('/api/v1/payments/checkout', paymentLimiter);
app.use('/api/v1/payments/wallet-checkout', paymentLimiter);

// ── Health checks ─────────────────────────────────────
// /health and /live: process up — used by k8s liveness or load balancers
// /ready          : process up AND DB reachable — used by k8s readiness;
//                   503s mean "don't route traffic at me yet"
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));
app.get('/live',   (_req, res) => res.json({ status: 'live', timestamp: new Date() }));
app.get('/ready', async (_req, res) => {
  try {
    const db = require('./utils/db');
    await db.raw('SELECT 1 AS ok');
    res.json({ status: 'ready', db: 'ok', timestamp: new Date() });
  } catch (err) {
    res.status(503).json({ status: 'not-ready', db: 'unreachable', error: err.message });
  }
});

// ── Auto audit: logs every successful authenticated mutation ──
app.use(autoAudit);

// ── API Routes ────────────────────────────────────────
const api = '/api/v1';
app.use(`${api}/auth`,       authRoutes);
app.use(`${api}/products`,   productRoutes);
app.use(`${api}/inventory`,  inventoryRoutes);
app.use(`${api}/orders`,     orderRoutes);
app.use(`${api}/purchases`,  purchaseRoutes);
app.use(`${api}/vendors`,    vendorRoutes);
app.use(`${api}/warehouses`, warehouseRoutes);
app.use(`${api}/channels`,   channelRoutes);
app.use(`${api}/customers`,  customerRoutes);
app.use(`${api}/invoices`,   invoiceRoutes);
app.use(`${api}/dashboard`,  dashboardRoutes);
app.use(`${api}/reports`,    reportRoutes);
app.use(`${api}/shipments`,  shipmentRoutes);
app.use(`${api}/plans`,      planRoutes);
app.use(`${api}/billing`,    billingRoutes);
app.use(`${api}/admin`,      adminRoutes);
app.use(`${api}/roles`,      roleRoutes);
app.use(`${api}/public`,     publicRoutes);
app.use(`${api}/webhooks`,   webhookRoutes);
app.use(`${api}/payments`,   paymentRoutes);
app.use(`${api}/users`,      usersRoutes);
app.use(`${api}/oauth`,      oauthRoutes);
app.use(`${api}/tickets`,    ticketsRoutes);
app.use(`${api}/metrics`,    metricsRoutes);

// ── 404 Handler ───────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global Error Handler ──────────────────────────────
app.use((err, req, res, _next) => {
  // Send to Sentry (no-op when DSN unset). Tag with tenant + user when known.
  if (process.env.SENTRY_DSN) {
    Sentry.withScope((scope) => {
      if (req.id)         scope.setTag('requestId', req.id);
      if (req.tenant?.id) scope.setTag('tenantId', req.tenant.id);
      if (req.user?.id)   scope.setUser({ id: req.user.id, email: req.user.email });
      Sentry.captureException(err);
    });
  }
  // Structured log — pino redacts the dangerous paths automatically.
  (req.log || logger).error({ err, path: req.originalUrl, method: req.method }, 'request error');
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(err.status || 500).json({
    error: 'Internal server error',
    requestId: req.id,
    ...(isDev && { message: err.message }),
  });
});

// Catch unhandled rejections / uncaught exceptions — ship to Sentry, log,
// don't crash. (Crashing on unhandledRejection is a footgun; we want the
// alert in Sentry without taking the API down.)
process.on('unhandledRejection', (reason) => {
  if (process.env.SENTRY_DSN) Sentry.captureException(reason);
  logger.error({ err: reason }, 'unhandledRejection');
});
process.on('uncaughtException', (err) => {
  if (process.env.SENTRY_DSN) Sentry.captureException(err);
  logger.fatal({ err }, 'uncaughtException');
  // For uncaught it IS safer to exit and let the supervisor restart, since
  // Node may be in a bad state. PM2/k8s/docker restarts immediately.
  setTimeout(() => process.exit(1), 500).unref();
});

(async () => {
  try {
    await initDb();
  } catch (err) {
    console.error('[initDb] failed:', err.message);
    process.exit(1);
  }

  let server = null;
  // LiteSpeed (lsnode.js) calls listen() automatically — skip in that environment
  if (!process.env.LSNODE_ROOT) {
    server = app.listen(PORT, () => {
      console.log(`Kartriq API running on http://localhost:${PORT}`);
    });
  }

  // Start background jobs (channel sync, inventory push, tracking, review queue)
  const cron = require('./jobs/cron.job');
  try {
    cron.start();
  } catch (err) {
    console.error('[cron] failed to start:', err.message);
  }

  // Graceful shutdown — release the port and clear cron timers so nodemon
  // restarts (or PM2/Docker stops) don't leave zombies hogging :5001.
  let shuttingDown = false;
  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[shutdown] received ${signal} — stopping cron + closing server`);
    try { cron.stop(); } catch {}
    if (server) {
      server.close(() => {
        console.log('[shutdown] server closed');
        process.exit(0);
      });
      // Force-exit if the server doesn't close within 4s (open keep-alive
      // connections can otherwise stall nodemon's restart).
      setTimeout(() => process.exit(0), 4000).unref();
    } else {
      process.exit(0);
    }
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon's default restart signal
})();

module.exports = app;
