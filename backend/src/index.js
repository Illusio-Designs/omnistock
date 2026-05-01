const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

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
const { autoAudit } = require('./services/audit.service');

const { initDb } = require('./bootstrap/initDb');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Trust proxy (needed behind nginx/Apache/load balancer) ──
app.set('trust proxy', 1);

// ── Security & Middleware ──────────────────────────────
app.use(helmet());
const corsConfig = require('./config/cors.config');
app.use(cors(corsConfig));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
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

// ── Health Check ──────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

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

// ── 404 Handler ───────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Global Error Handler ──────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err.stack);
  const isDev = process.env.NODE_ENV !== 'production';
  res.status(500).json({
    error: 'Internal server error',
    ...(isDev && { message: err.message }),
  });
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
      console.log(`Omnistock API running on http://localhost:${PORT}`);
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
