/** @type {import('next').NextConfig} */

// Content-Security-Policy in report-only mode first — flip to enforcing once
// the report endpoint shows zero violations for a release cycle. JWT lives in
// localStorage so a single XSS = account takeover; CSP is the last line of
// defense after input sanitization.
const apiOrigin = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1').origin; }
  catch { return 'http://localhost:5001'; }
})();

const cspDirectives = [
  "default-src 'self'",
  // 'unsafe-inline'/'unsafe-eval' required by Next.js dev + GA/FB pixel/Clarity
  // inline bootstrap. Tighten with nonces once we move analytics to a tag manager.
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://www.clarity.ms https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "worker-src 'self' blob:",
  `connect-src 'self' ${apiOrigin} https://api.razorpay.com https://lumberjack.razorpay.com https://www.google-analytics.com https://*.clarity.ms https://accounts.google.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io`,
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://accounts.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy-Report-Only', value: cspDirectives },
];

const nextConfig = {
  reactStrictMode: true,
  // Standalone output bundles only the files actually imported by the server,
  // shrinking the Docker image from ~1GB to ~150MB and speeding up cold starts.
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  poweredByHeader: false,
  // Memory tuning — webpack's persistent file cache gzips bundles to disk
  // every compile. On low-RAM / low-pagefile Windows boxes this triggers
  // RangeError: Array buffer allocation failed in node:zlib. Switching to
  // in-memory cache trades cold-start speed for working dev sessions.
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = { type: 'memory' };
    }
    return config;
  },
};

// Wrap with Sentry only if a DSN + auth token are provided. The plugin is a
// no-op without auth (it would skip source-map upload anyway) but importing
// it requires `@sentry/nextjs` to be installed. We try/catch so dev environments
// without the package still build.
function withOptionalSentry(cfg) {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return cfg;
  try {
    const { withSentryConfig } = require('@sentry/nextjs');
    return withSentryConfig(cfg, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      silent: !process.env.CI,
      // Tunnel ad-blocker-bypass route. Stops uBlock/Brave from swallowing
      // error events. Add to CSP connect-src if you flip CSP to enforcing.
      tunnelRoute: '/monitoring',
      hideSourceMaps: true,
      disableLogger: true,
      widenClientFileUpload: true,
    });
  } catch {
    return cfg;
  }
}

module.exports = withOptionalSentry(nextConfig);
