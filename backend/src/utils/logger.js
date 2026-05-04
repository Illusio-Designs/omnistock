// Structured logger backed by Pino. Replaces ad-hoc console.log/error.
//
// Usage:
//   const logger = require('../utils/logger');
//   logger.info({ orderId }, 'order created');
//   logger.error({ err, tenantId }, 'sync failed');
//
// Per-request scoping is added by the requestId middleware (index.js):
//   req.log = logger.child({ requestId, tenantId, userId });
//   req.log.info('hit /channels');
//
// In dev (NODE_ENV !== 'production'), output is human-friendly via
// pino-pretty. In prod it's single-line JSON suitable for ingestion by
// Loki/Datadog/Cloudwatch/etc. Set LOG_LEVEL=debug for noisier logs.

const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

const transport = isProd
  ? undefined
  : {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname',
        translateTime: 'HH:MM:ss.l',
        singleLine: false,
      },
    };

const logger = pino({
  level,
  transport,
  // Standard log redaction — Pino strips these paths from any object passed
  // in. Adds a defence-in-depth layer over `safeErrLog()` in payment.routes.
  redact: {
    paths: [
      '*.password', '*.passwordHash',
      '*.token', '*.accessToken', '*.refreshToken', '*.apiKey', '*.apiSecret',
      '*.clientSecret', '*.keySecret', '*.webhookSecret',
      '*.providerTokenId', '*.razorpay_signature',
      'req.headers.authorization', 'req.headers.cookie',
      'req.headers["x-razorpay-signature"]',
      'err.config', 'err.request', 'err.response.config',
    ],
    censor: '[REDACTED]',
  },
  base: {
    env: process.env.NODE_ENV || 'development',
    service: 'kartriq-backend',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      requestId: req.id,
      tenantId: req.tenant?.id,
      userId: req.user?.id,
    }),
  },
});

module.exports = logger;
