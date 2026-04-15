// Per-channel credential schemas.
// Each tenant (seller) uses these field definitions to self-serve-connect
// their own channel. The backend stores everything encrypted (AES-256-GCM)
// via POST /api/v1/channels/:id/connect.

export type FieldKind = 'text' | 'password' | 'url' | 'select' | 'textarea';

export interface ChannelField {
  key: string;
  label: string;
  kind: FieldKind;
  placeholder?: string;
  help?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  secret?: boolean; // hidden after save; masked in UI
}

export interface ChannelSchema {
  type: string;
  name: string;
  docsUrl?: string;
  description: string;
  steps?: string[];
  fields: ChannelField[];
  // OAuth flow — tenant clicks "Authorize" instead of pasting credentials.
  // Set to a provider key when the platform owns the OAuth app.
  oauth?: 'amazon' | 'shopify' | 'flipkart' | 'meta';
}

export const CHANNEL_SCHEMAS: Record<string, ChannelSchema> = {
  AMAZON_SMARTBIZ: {
    type: 'AMAZON_SMARTBIZ',
    name: 'Amazon Smart Biz',
    docsUrl: 'https://smartcommerce.amazon.in/smartbiz',
    description: 'Amazon India\'s D2C website builder, powered by Amazon SP-API + MCF.',
    oauth: 'amazon',
    steps: [
      'Click "Authorize with Amazon" below',
      'Log in to your Amazon Seller Central account when prompted',
      'Approve OmniStock\'s access to your inventory, orders and MCF',
      'You\'ll be redirected back — that\'s it',
    ],
    fields: [
      {
        key: 'region',
        label: 'Amazon Region',
        kind: 'select',
        required: true,
        options: [
          { value: 'IN', label: 'India (amazon.in)' },
          { value: 'US', label: 'North America' },
          { value: 'EU', label: 'Europe / UK' },
        ],
      },
    ],
  },

  AMAZON: {
    type: 'AMAZON',
    name: 'Amazon Marketplace',
    docsUrl: 'https://developer-docs.amazon.com/sp-api',
    description: 'Amazon SP-API for sellers on amazon.in / .com / .co.uk etc.',
    oauth: 'amazon',
    steps: [
      'Click "Authorize with Amazon" below',
      'Sign in to Seller Central',
      'Approve OmniStock\'s access scopes',
      'You\'ll be redirected back automatically',
    ],
    fields: [
      {
        key: 'region',
        label: 'Amazon Region',
        kind: 'select',
        required: true,
        options: [
          { value: 'IN', label: 'India (amazon.in)' },
          { value: 'US', label: 'North America' },
          { value: 'EU', label: 'Europe / UK' },
        ],
      },
    ],
  },

  FLIPKART: {
    type: 'FLIPKART',
    name: 'Flipkart Seller Hub',
    docsUrl: 'https://seller.flipkart.com/api-docs',
    description: 'Flipkart Marketplace API for inventory, listings and orders.',
    oauth: 'flipkart',
    steps: [
      'Click "Authorize with Flipkart" below',
      'Sign in to Flipkart Seller Hub',
      'Grant OmniStock access to your seller data',
      'You\'ll be redirected back automatically',
    ],
    fields: [],
  },

  MEESHO: {
    type: 'MEESHO',
    name: 'Meesho Supplier Panel',
    description: 'Meesho supplier-side API.',
    fields: [
      { key: 'supplierId',  label: 'Supplier ID',  kind: 'text',     required: true },
      { key: 'apiKey',      label: 'API Key',      kind: 'password', required: true, secret: true },
    ],
  },

  MYNTRA: {
    type: 'MYNTRA',
    name: 'Myntra Partner Portal',
    fields: [
      { key: 'sellerId', label: 'Seller ID', kind: 'text',     required: true },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true },
    ],
  },

  NYKAA: {
    type: 'NYKAA',
    name: 'Nykaa Partner API',
    fields: [
      { key: 'partnerId', label: 'Partner ID', kind: 'text',     required: true },
      { key: 'apiKey',    label: 'API Key',    kind: 'password', required: true, secret: true },
    ],
  },

  AJIO: {
    type: 'AJIO',
    name: 'Ajio / Reliance',
    fields: [
      { key: 'sellerId', label: 'Seller ID', kind: 'text',     required: true },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true },
    ],
  },

  TATA_CLIQ: {
    type: 'TATA_CLIQ',
    name: 'Tata CLiQ',
    fields: [
      { key: 'vendorId', label: 'Vendor ID', kind: 'text',     required: true },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true },
    ],
  },

  SNAPDEAL: {
    type: 'SNAPDEAL',
    name: 'Snapdeal Seller Zone',
    docsUrl: 'https://sellerzone.snapdeal.com',
    description: 'Snapdeal seller API for inventory, orders and listings.',
    steps: [
      'Log in to Seller Zone → Account → API Integration',
      'Generate Seller ID + API Key pair',
    ],
    fields: [
      { key: 'sellerId', label: 'Seller ID', kind: 'text',     required: true },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true },
    ],
  },

  GLOWROAD: {
    type: 'GLOWROAD',
    name: 'GlowRoad',
    description: 'GlowRoad reseller marketplace.',
    fields: [
      { key: 'sellerId', label: 'Seller ID', kind: 'text',     required: true },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true },
    ],
  },

  JIOMART: {
    type: 'JIOMART',
    name: 'JioMart Seller',
    docsUrl: 'https://seller.jiomart.com',
    description: 'Reliance JioMart seller panel API.',
    fields: [
      { key: 'sellerId', label: 'Seller ID', kind: 'text',     required: true },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true },
    ],
  },

  PAYTM_MALL: {
    type: 'PAYTM_MALL',
    name: 'Paytm Mall',
    docsUrl: 'https://seller.paytm.com',
    description: 'Paytm Mall seller API.',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', kind: 'text',     required: true },
      { key: 'apiKey',     label: 'API Key',     kind: 'password', required: true, secret: true },
    ],
  },

  LIMEROAD: {
    type: 'LIMEROAD',
    name: 'LimeRoad',
    description: 'LimeRoad seller API.',
    fields: [
      { key: 'sellerId', label: 'Seller ID', kind: 'text',     required: true },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true },
    ],
  },

  EBAY: {
    type: 'EBAY',
    name: 'eBay',
    docsUrl: 'https://developer.ebay.com/api-docs/static/oauth-tokens.html',
    description: 'eBay Trading / Sell APIs. Create a developer app, then generate a User Access Token.',
    steps: [
      'Register at https://developer.ebay.com',
      'Create an application → note App ID, Cert ID, Dev ID',
      'Go to User Tokens tab → Get User Token (production or sandbox)',
      'Paste all four values below',
    ],
    fields: [
      { key: 'appId',      label: 'App ID (Client ID)',     kind: 'text',     required: true },
      { key: 'certId',     label: 'Cert ID (Client Secret)',kind: 'password', required: true, secret: true },
      { key: 'devId',      label: 'Dev ID',                 kind: 'text',     required: true },
      { key: 'userToken',  label: 'User Access Token',      kind: 'password', required: true, secret: true },
      {
        key: 'environment',
        label: 'Environment',
        kind: 'select',
        required: true,
        options: [
          { value: 'production', label: 'Production' },
          { value: 'sandbox',    label: 'Sandbox' },
        ],
      },
    ],
  },

  ETSY: {
    type: 'ETSY',
    name: 'Etsy',
    docsUrl: 'https://www.etsy.com/developers/documentation',
    description: 'Etsy Open API v3 — register a developer app and authorize a shop.',
    steps: [
      'Register an app at https://www.etsy.com/developers/register',
      'Copy API Key (keystring) and Shared Secret',
      'Run the OAuth 2.0 flow to get an access token for your shop',
    ],
    fields: [
      { key: 'apiKey',       label: 'API Key (keystring)', kind: 'text',     required: true },
      { key: 'sharedSecret', label: 'Shared Secret',       kind: 'password', required: true, secret: true },
      { key: 'accessToken',  label: 'Access Token',        kind: 'password', required: true, secret: true },
      { key: 'shopId',       label: 'Shop ID',             kind: 'text',     required: true },
    ],
  },

  SHOPIFY: {
    type: 'SHOPIFY',
    name: 'Shopify',
    docsUrl: 'https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/authorization-code-grant',
    description: 'OAuth into your Shopify store. OmniStock has a public Partner app — every store installs it.',
    oauth: 'shopify',
    steps: [
      'Enter your store domain (e.g. mystore.myshopify.com)',
      'Click "Authorize with Shopify"',
      'Approve the requested scopes in Shopify admin',
      'You\'ll be redirected back automatically',
    ],
    fields: [
      { key: 'shop', label: 'Shop domain', kind: 'text', required: true, placeholder: 'mystore.myshopify.com', help: 'The myshopify.com subdomain — no https://, no trailing slash.' },
    ],
  },

  WOOCOMMERCE: {
    type: 'WOOCOMMERCE',
    name: 'WooCommerce',
    docsUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
    description: 'WooCommerce REST API — generate a pair of read/write keys.',
    steps: [
      'WP admin → WooCommerce → Settings → Advanced → REST API',
      'Add key → Permissions: Read/Write → Generate',
    ],
    fields: [
      { key: 'siteUrl',        label: 'Site URL',        kind: 'url',      required: true, placeholder: 'https://yourstore.com' },
      { key: 'consumerKey',    label: 'Consumer Key',    kind: 'password', required: true, secret: true },
      { key: 'consumerSecret', label: 'Consumer Secret', kind: 'password', required: true, secret: true },
    ],
  },

  MAGENTO: {
    type: 'MAGENTO',
    name: 'Magento / Adobe Commerce',
    fields: [
      { key: 'storeUrl',    label: 'Store URL',    kind: 'url',      required: true },
      { key: 'accessToken', label: 'Access Token', kind: 'password', required: true, secret: true },
    ],
  },

  BIGCOMMERCE: {
    type: 'BIGCOMMERCE',
    name: 'BigCommerce',
    fields: [
      { key: 'storeHash',   label: 'Store Hash',   kind: 'text',     required: true, placeholder: 'abc123def' },
      { key: 'accessToken', label: 'Access Token', kind: 'password', required: true, secret: true },
    ],
  },

  OPENCART: {
    type: 'OPENCART',
    name: 'OpenCart',
    docsUrl: 'https://docs.opencart.com/en-gb/administration/system/api/',
    description: 'OpenCart REST API — create a dedicated API user in the admin.',
    steps: [
      'Admin → System → Users → API → Add New API',
      'Generate an API key and whitelist your server IPs',
    ],
    fields: [
      { key: 'storeUrl', label: 'Store URL', kind: 'url',      required: true, placeholder: 'https://yourstore.com' },
      { key: 'username', label: 'API Username', kind: 'text',  required: true },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true },
    ],
  },

  BLINKIT: {
    type: 'BLINKIT',
    name: 'Blinkit (Grofers)',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', kind: 'text',     required: true },
      { key: 'apiKey',     label: 'API Key',     kind: 'password', required: true, secret: true },
    ],
  },

  ZEPTO: {
    type: 'ZEPTO',
    name: 'Zepto',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', kind: 'text',     required: true },
      { key: 'apiKey',     label: 'API Key',     kind: 'password', required: true, secret: true },
    ],
  },

  SWIGGY_INSTAMART: {
    type: 'SWIGGY_INSTAMART',
    name: 'Swiggy Instamart',
    fields: [
      { key: 'partnerId', label: 'Partner ID', kind: 'text',     required: true },
      { key: 'apiKey',    label: 'API Key',    kind: 'password', required: true, secret: true },
    ],
  },

  BB_NOW: {
    type: 'BB_NOW',
    name: 'BB Now (BigBasket)',
    fields: [
      { key: 'vendorId', label: 'Vendor ID', kind: 'text',     required: true },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true },
    ],
  },

  SHIPROCKET: {
    type: 'SHIPROCKET',
    name: 'Shiprocket',
    docsUrl: 'https://apidocs.shiprocket.in',
    description: 'Shiprocket shipping aggregator for pickups, rates, AWBs and tracking.',
    fields: [
      { key: 'email',    label: 'Shiprocket Email',    kind: 'text',     required: true },
      { key: 'password', label: 'Shiprocket Password', kind: 'password', required: true, secret: true },
    ],
  },

  FSHIP: {
    type: 'FSHIP',
    name: 'Fship',
    description: 'Fship shipping aggregator.',
    fields: [
      { key: 'email',    label: 'Email',    kind: 'text',     required: true },
      { key: 'password', label: 'Password', kind: 'password', required: true, secret: true },
    ],
  },

  DELHIVERY: {
    type: 'DELHIVERY',
    name: 'Delhivery',
    docsUrl: 'https://track.delhivery.com/api-doc/',
    fields: [
      { key: 'token', label: 'API Token', kind: 'password', required: true, secret: true },
      {
        key: 'mode',
        label: 'Mode',
        kind: 'select',
        required: true,
        options: [
          { value: 'test',       label: 'Test' },
          { value: 'production', label: 'Production' },
        ],
      },
    ],
  },

  BLUEDART: {
    type: 'BLUEDART',
    name: 'BlueDart',
    fields: [
      { key: 'customerCode', label: 'Customer Code', kind: 'text',     required: true },
      { key: 'apiKey',       label: 'API Key',       kind: 'password', required: true, secret: true },
      { key: 'licenseKey',   label: 'License Key',   kind: 'password', required: true, secret: true },
    ],
  },

  DTDC: {
    type: 'DTDC',
    name: 'DTDC',
    fields: [
      { key: 'customerCode', label: 'Customer Code', kind: 'text',     required: true },
      { key: 'apiKey',       label: 'API Key',       kind: 'password', required: true, secret: true },
    ],
  },

  XPRESSBEES: {
    type: 'XPRESSBEES',
    name: 'Xpressbees',
    fields: [
      { key: 'email',    label: 'Email',    kind: 'text',     required: true },
      { key: 'password', label: 'Password', kind: 'password', required: true, secret: true },
    ],
  },

  ECOMEXPRESS: {
    type: 'ECOMEXPRESS',
    name: 'EcomExpress',
    fields: [
      { key: 'username', label: 'Username', kind: 'text',     required: true },
      { key: 'password', label: 'Password', kind: 'password', required: true, secret: true },
    ],
  },

  SHADOWFAX: {
    type: 'SHADOWFAX',
    name: 'Shadowfax',
    fields: [
      { key: 'token', label: 'API Token', kind: 'password', required: true, secret: true },
    ],
  },

  NIMBUSPOST: {
    type: 'NIMBUSPOST',
    name: 'NimbusPost',
    fields: [
      { key: 'email',    label: 'Email',    kind: 'text',     required: true },
      { key: 'password', label: 'Password', kind: 'password', required: true, secret: true },
    ],
  },

  CLICKPOST: {
    type: 'CLICKPOST',
    name: 'ClickPost',
    fields: [
      { key: 'username', label: 'Username', kind: 'text',     required: true },
      { key: 'apiKey',   label: 'API Key',  kind: 'password', required: true, secret: true },
    ],
  },

  FEDEX: {
    type: 'FEDEX',
    name: 'FedEx',
    docsUrl: 'https://developer.fedex.com',
    description: 'FedEx Web Services — OAuth 2.0 client credentials for shipping APIs.',
    steps: [
      'Register at https://developer.fedex.com',
      'Create a Production project → note API Key and Secret Key',
      'Paste your 9-digit FedEx Account Number',
    ],
    fields: [
      { key: 'accountNumber', label: 'Account Number', kind: 'text',     required: true },
      { key: 'apiKey',        label: 'API Key',        kind: 'password', required: true, secret: true },
      { key: 'apiSecret',     label: 'Secret Key',     kind: 'password', required: true, secret: true },
      {
        key: 'environment',
        label: 'Environment',
        kind: 'select',
        required: true,
        options: [
          { value: 'production', label: 'Production' },
          { value: 'sandbox',    label: 'Sandbox' },
        ],
      },
    ],
  },

  DHL: {
    type: 'DHL',
    name: 'DHL Express',
    docsUrl: 'https://developer.dhl.com',
    description: 'DHL MyDHL API for rates, labels and tracking.',
    fields: [
      { key: 'accountNumber', label: 'DHL Account Number', kind: 'text',     required: true },
      { key: 'apiKey',        label: 'API Key',            kind: 'password', required: true, secret: true },
      { key: 'apiSecret',     label: 'API Secret',         kind: 'password', required: true, secret: true },
      {
        key: 'environment',
        label: 'Environment',
        kind: 'select',
        required: true,
        options: [
          { value: 'production', label: 'Production' },
          { value: 'sandbox',    label: 'Sandbox' },
        ],
      },
    ],
  },

  UPS: {
    type: 'UPS',
    name: 'UPS',
    docsUrl: 'https://developer.ups.com',
    description: 'UPS Developer Kit — OAuth 2.0 client credentials.',
    steps: [
      'Register at https://developer.ups.com',
      'Create an app → request production access',
      'Copy Client ID + Client Secret',
    ],
    fields: [
      { key: 'accountNumber', label: 'UPS Account Number', kind: 'text',     required: true },
      { key: 'clientId',      label: 'Client ID',          kind: 'text',     required: true },
      { key: 'clientSecret',  label: 'Client Secret',      kind: 'password', required: true, secret: true },
      {
        key: 'environment',
        label: 'Environment',
        kind: 'select',
        required: true,
        options: [
          { value: 'production', label: 'Production' },
          { value: 'sandbox',    label: 'Sandbox' },
        ],
      },
    ],
  },

  ITHINK: {
    type: 'ITHINK',
    name: 'iThink Logistics',
    description: 'iThink Logistics shipping aggregator.',
    fields: [
      { key: 'apiKey',   label: 'API Key',  kind: 'password', required: true, secret: true },
      { key: 'clientId', label: 'Client ID',kind: 'text',     required: false, help: 'Optional — required by some iThink endpoints.' },
    ],
  },

  PICKRR: {
    type: 'PICKRR',
    name: 'Pickrr',
    description: 'Pickrr shipping aggregator.',
    fields: [
      { key: 'authToken', label: 'Auth Token', kind: 'password', required: true, secret: true },
    ],
  },

  SHIPWAY: {
    type: 'SHIPWAY',
    name: 'Shipway',
    docsUrl: 'https://shipway.com',
    description: 'Shipway post-ship tracking and returns platform.',
    fields: [
      { key: 'username',  label: 'Username',    kind: 'text',     required: true },
      { key: 'licenseKey',label: 'License Key', kind: 'password', required: true, secret: true },
    ],
  },

  INSTAGRAM: {
    type: 'INSTAGRAM',
    name: 'Instagram Shopping',
    docsUrl: 'https://developers.facebook.com/docs/instagram-platform',
    description: 'Connect your Instagram Business account via the Meta public app.',
    oauth: 'meta',
    steps: [
      'Click "Authorize with Meta" below',
      'Sign in with Facebook and approve the scopes',
      'You\'ll be redirected back. After connecting, pick the Instagram Business account.',
    ],
    fields: [],
  },

  FACEBOOK: {
    type: 'FACEBOOK',
    name: 'Facebook Shop',
    docsUrl: 'https://developers.facebook.com/docs/commerce-platform',
    description: 'Connect your Facebook Page + Commerce catalog via the Meta public app.',
    oauth: 'meta',
    fields: [],
  },

  WHATSAPP_BUSINESS: {
    type: 'WHATSAPP_BUSINESS',
    name: 'WhatsApp Business',
    docsUrl: 'https://developers.facebook.com/docs/whatsapp',
    description: 'Connect your WhatsApp Business phone number via the Meta public app.',
    oauth: 'meta',
    fields: [],
  },

  CUSTOM_WEBHOOK: {
    type: 'CUSTOM_WEBHOOK',
    name: 'Custom Webhook',
    description: 'Generic webhook receiver. Use when your own system pushes orders to OmniStock.',
    steps: [
      'Pick a strong HMAC secret and set it below',
      'Configure your source system to POST to /api/v1/webhooks/channels/:id',
      'Sign the raw body with HMAC-SHA256 using your secret and send it in the x-omnistock-signature header',
    ],
    fields: [
      { key: 'webhookSecret', label: 'Webhook HMAC Secret', kind: 'password', required: true, secret: true },
    ],
  },
};

export function getSchemaForType(type: string): ChannelSchema | null {
  return CHANNEL_SCHEMAS[type] || null;
}
