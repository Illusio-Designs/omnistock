// CORS configuration — environment-aware.
//
// Production allow-list comes from the CORS_ALLOWED_ORIGINS env var
// (comma-separated) so adding a new domain doesn't need a code push.
// Falls back to the canonical production origins when unset.
//
// Dev mode allows the usual local ports plus Expo's tunnel pattern so
// device testing works without disabling CORS.

require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

const PROD_DEFAULTS = [
  'https://kartriq.com',
  'https://www.kartriq.com',
  'https://app.kartriq.com',
  'https://kartriq.vercel.app',
];

const DEV_DEFAULTS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:8081',
  'http://localhost:8082',
  // Expo Web preview
  'http://localhost:19006',
];

function parseEnvList() {
  return (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

const fromEnv = parseEnvList();

const origins = isProd
  ? (fromEnv.length ? fromEnv : PROD_DEFAULTS)
  : [...DEV_DEFAULTS, ...fromEnv];

// Origin checker — accepts the static list AND a dynamic regex for Vercel
// preview URLs (e.g. https://kartriq-git-feature-foo-illusio.vercel.app)
// so feature branches don't need to be added one-by-one. Mobile (Expo)
// requests have no Origin header — those are allowed too.
const VERCEL_PREVIEW_RE = /^https:\/\/kartriq(-[a-z0-9-]+)?\.vercel\.app$/i;

function originFn(origin, callback) {
  if (!origin) return callback(null, true);
  if (origins.includes(origin)) return callback(null, true);
  if (isProd && VERCEL_PREVIEW_RE.test(origin)) return callback(null, true);
  return callback(new Error(`Origin not allowed by CORS: ${origin}`));
}

module.exports = {
  origin: originFn,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'x-tenant-id',
    // Added with the idempotency middleware
    'Idempotency-Key',
    'idempotency-key',
  ],
  maxAge: 86400,
};
