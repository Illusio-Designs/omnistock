// Single source of truth for every channel-platform URL that has a
// production / sandbox split. One global env var — CHANNEL_MODE — picks
// which set is used:
//
//   CHANNEL_MODE=sandbox      → all adapters call sandbox hosts
//   CHANNEL_MODE=production   → all adapters call production hosts
//   (unset)                   → production
//
// Adapters that only have a single host (no sandbox available) just live
// in the PRODUCTION_ONLY map; sandbox mode falls back to that same URL.

// ── Per-platform URLs ──────────────────────────────────────────────────

const PLATFORMS = {
  // ════════════════════════════════════════════════════════
  // E-commerce marketplaces
  // ════════════════════════════════════════════════════════

  AMAZON: {
    production: {
      NA: 'https://sellingpartnerapi-na.amazon.com',
      EU: 'https://sellingpartnerapi-eu.amazon.com', // covers IN, UK, DE, FR, IT, ES, NL, SE, PL, TR, AE, SA, EG, ZA
      FE: 'https://sellingpartnerapi-fe.amazon.com', // JP, AU, SG
    },
    sandbox: {
      NA: 'https://sandbox.sellingpartnerapi-na.amazon.com',
      EU: 'https://sandbox.sellingpartnerapi-eu.amazon.com',
      FE: 'https://sandbox.sellingpartnerapi-fe.amazon.com',
    },
    lwaTokenUrl: 'https://api.amazon.com/auth/o2/token',
  },

  EBAY: {
    production: 'https://api.ebay.com',
    sandbox:    'https://api.sandbox.ebay.com',
  },

  WALMART: {
    production: {
      US: 'https://marketplace.walmartapis.com',
      CA: 'https://marketplace.walmartapis.com/ca',
      MX: 'https://marketplace.walmartapis.com/mx',
    },
    sandbox: {
      US: 'https://sandbox.walmartapis.com',
      CA: 'https://sandbox.walmartapis.com/ca',
      MX: 'https://sandbox.walmartapis.com/mx',
    },
  },

  FLIPKART: {
    production: {
      api:  'https://api.flipkart.net/sellers',
      auth: 'https://api.flipkart.net/oauth-service/oauth/token',
    },
    sandbox: {
      api:  'https://sandbox-api.flipkart.net/sellers',
      auth: 'https://sandbox-api.flipkart.net/oauth-service/oauth/token',
    },
  },

  LAZADA: {
    production: {
      SG: 'https://api.lazada.sg/rest',
      MY: 'https://api.lazada.com.my/rest',
      VN: 'https://api.lazada.vn/rest',
      TH: 'https://api.lazada.co.th/rest',
      PH: 'https://api.lazada.com.ph/rest',
      ID: 'https://api.lazada.co.id/rest',
    },
    sandbox: {
      SG: 'https://api-sandbox.lazada.sg/rest',
      MY: 'https://api-sandbox.lazada.com.my/rest',
      VN: 'https://api-sandbox.lazada.vn/rest',
      TH: 'https://api-sandbox.lazada.co.th/rest',
      PH: 'https://api-sandbox.lazada.com.ph/rest',
      ID: 'https://api-sandbox.lazada.co.id/rest',
    },
    authHost: 'https://auth.lazada.com/rest',
  },

  SHOPEE: {
    production: 'https://partner.shopeemobile.com',
    sandbox:    'https://partner.test-stable.shopeemobile.com',
  },

  ALLEGRO: {
    production: {
      api:  'https://api.allegro.pl',
      auth: 'https://allegro.pl',
    },
    sandbox: {
      api:  'https://api.allegro.pl.allegrosandbox.pl',
      auth: 'https://allegro.pl.allegrosandbox.pl',
    },
  },

  MERCADOLIBRE: {
    production: 'https://api.mercadolibre.com',
    // No separate sandbox host — Mercado Libre uses real API with test users.
  },

  ETSY: {
    production: 'https://openapi.etsy.com/v3/application',
    // Etsy retired their sandbox in 2023; real API is used for everything.
  },

  // ════════════════════════════════════════════════════════
  // Logistics / shipping carriers
  // ════════════════════════════════════════════════════════

  DELHIVERY: {
    production: 'https://track.delhivery.com',
    sandbox:    'https://staging-express.delhivery.com',
  },

  SHIPROCKET: {
    production: 'https://apiv2.shiprocket.in/v1/external',
    // Shiprocket has no public sandbox; use a real account with low-value orders.
  },

  FEDEX: {
    production: 'https://apis.fedex.com',
    sandbox:    'https://apis-sandbox.fedex.com',
  },

  DHL: {
    production: 'https://api-eu.dhl.com',
    sandbox:    'https://api-sandbox.dhl.com',
  },

  UPS: {
    production: 'https://onlinetools.ups.com',
    sandbox:    'https://wwwcie.ups.com',
  },

  // ════════════════════════════════════════════════════════
  // Single-URL platforms (no sandbox available — listed for reference)
  // ════════════════════════════════════════════════════════

  AJIO:        { production: 'https://sellerapi.ajio.com/v1' },
  JIOMART:     { production: 'https://sellerapi.jiomart.com/v1' },
  GLOWROAD:    { production: 'https://supplier.glowroad.com/api/v1' },
  MEESHO:      { production: 'https://supplier.meesho.com/api/v3' },
  MYNTRA:      { production: 'https://omnishipper.myntra.com/api/v2' },
  NYKAA:       { production: 'https://sellerapi.nykaa.com/v1' },
  TATA_CLIQ:   { production: 'https://sellerapi.tatacliq.com/v1' },
  SNAPDEAL:    { production: 'https://api.snapdeal.com/v1' },
  PAYTM_MALL:  { production: 'https://sellerapi.paytmmall.com/v1' },
  LIMEROAD:    { production: 'https://sellerapi.limeroad.com/v1' },
  KAUFLAND:    { production: 'https://sellerapi.kaufland.com/v2' },
  ONBUY:       { production: 'https://api.onbuy.com/v2' },
  RAKUTEN:     { production: 'https://api.rms.rakuten.co.jp/es/2.0' },
  WISH:        { production: 'https://merchant.wish.com' },
  MANOMANO:    { production: 'https://www.manomano.com' },
  FRUUGO:      { production: 'https://www.fruugo.com' },
};

// Common Amazon SP-API metadata kept here so callers don't duplicate it.
const AMAZON_MARKETPLACE_IDS = {
  IN: 'A21TJRUUN4KGV',
  US: 'ATVPDKIKX0DER',
  CA: 'A2EUQ1WTGCTBG2',
  MX: 'A1AM78C64UM0Y8',
  BR: 'A2Q3Y263D00KWC',
  UK: 'A1F83G8C2ARO7P',
  DE: 'A1PA6795UKMFR9',
  FR: 'A13V1IB3VIYZZH',
  IT: 'APJ6JRA9NG5V4',
  ES: 'A1RKKUPIHCS9HS',
  NL: 'A1805IZSGTT6HS',
  SE: 'A2NODRKZP88ZB9',
  PL: 'A1C3SOZRARQ6R3',
  TR: 'A33AVAJ2PDY3EV',
  AE: 'A2VIGQ35RCS4UG',
  SA: 'A17E79C6D8DWNP',
  EG: 'ARBP9OOSHTCHU',
  ZA: 'AE08WJ6YKNBMC',
  JP: 'A1VC38T7YXB528',
  AU: 'A39IBJ37TRP1C6',
  SG: 'A19VAU5U5O7RUS',
};

const AMAZON_REGION_TO_ZONE = {
  IN: 'EU', US: 'NA', CA: 'NA', MX: 'NA', BR: 'NA',
  UK: 'EU', DE: 'EU', FR: 'EU', IT: 'EU', ES: 'EU', NL: 'EU', SE: 'EU',
  PL: 'EU', TR: 'EU', AE: 'EU', SA: 'EU', EG: 'EU', ZA: 'EU',
  JP: 'FE', AU: 'FE', SG: 'FE',
  // Legacy aliases — historic creds may have stored region: 'EU' or 'NA'
  EU: 'EU', NA: 'NA', FE: 'FE',
};

// ── Mode resolution ────────────────────────────────────────────────────

function getMode() {
  return String(process.env.CHANNEL_MODE || 'production').toLowerCase() === 'sandbox'
    ? 'sandbox'
    : 'production';
}

// Resolve the URL set for a platform under the active mode. If sandbox is
// not configured for a platform, falls back to production transparently.
function resolve(platform) {
  const cfg = PLATFORMS[platform];
  if (!cfg) throw new Error(`Unknown channel platform: ${platform}`);
  const mode = getMode();
  return cfg[mode] || cfg.production;
}

// Convenience helpers ──────────────────────────────────────────────────
//   getEndpoint('EBAY')             → 'https://api.ebay.com' (or sandbox)
//   getEndpoint('AMAZON', 'IN')     → resolves IN → EU zone → URL
//   getEndpoint('LAZADA', 'SG')     → 'https://api.lazada.sg/rest' (or sandbox)
//   getEndpoint('FLIPKART', 'auth') → '.../oauth-service/oauth/token'
function getEndpoint(platform, key = null) {
  if (platform === 'AMAZON' || platform === 'AMAZON_SMARTBIZ') {
    const region = key || 'IN';
    const zone = AMAZON_REGION_TO_ZONE[region] || 'EU';
    return resolve('AMAZON')[zone];
  }
  const r = resolve(platform);
  if (typeof r === 'string') return r;
  return key ? r[key] : r;
}

// Convert any prod SP-API URL into its sandbox sibling. Useful when the
// caller already has a prod URL in hand and just wants to flip it.
function toSandboxHost(prodEndpoint) {
  return prodEndpoint.replace('https://sellingpartnerapi-', 'https://sandbox.sellingpartnerapi-');
}

module.exports = {
  PLATFORMS,
  AMAZON_MARKETPLACE_IDS,
  AMAZON_REGION_TO_ZONE,
  // Back-compat aliases for adapters still importing the old names
  MARKETPLACE_IDS: AMAZON_MARKETPLACE_IDS,
  REGION_TO_ZONE:  AMAZON_REGION_TO_ZONE,
  LWA_TOKEN_URL:   PLATFORMS.AMAZON.lwaTokenUrl,
  PROD:            PLATFORMS.AMAZON.production,
  SANDBOX:         PLATFORMS.AMAZON.sandbox,
  getMode,
  getEndpoint,
  toSandboxHost,
};