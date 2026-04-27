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
  description?: string;
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
        help: 'Pick the marketplace where your Seller Central account is registered — it sets the SP-API endpoint.',
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
        help: 'Pick the marketplace where your Seller Central account is registered — it sets the SP-API endpoint.',
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
      { key: 'supplierId',  label: 'Supplier ID',  kind: 'text',     required: true, help: 'Meesho Supplier Panel → Profile → Business Details. Numeric ID shown under your store name.' },
      { key: 'apiKey',      label: 'API Key',      kind: 'password', required: true, secret: true, help: 'Meesho Supplier Panel → Settings → Developer → Generate API Key. Copy immediately, shown once.' },
    ],
  },

  MYNTRA: {
    type: 'MYNTRA',
    name: 'Myntra Partner Portal',
    fields: [
      { key: 'sellerId', label: 'Seller ID', kind: 'text',     required: true, help: 'Myntra Partner Portal → Profile → Account Details. Listed as Vendor/Seller Code.' },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true, help: 'Myntra Partner Portal → Settings → API Access → Generate Key. Request access if not visible.' },
    ],
  },

  NYKAA: {
    type: 'NYKAA',
    name: 'Nykaa Partner API',
    fields: [
      { key: 'partnerId', label: 'Partner ID', kind: 'text',     required: true, help: 'Nykaa Seller Portal → My Account → Brand Profile. Shown as Partner/Brand Code.' },
      { key: 'apiKey',    label: 'API Key',    kind: 'password', required: true, secret: true, help: 'Email partner-tech@nykaa.com to request API access; key arrives via your account manager.' },
    ],
  },

  AJIO: {
    type: 'AJIO',
    name: 'Ajio / Reliance',
    fields: [
      { key: 'sellerId', label: 'Seller ID', kind: 'text',     required: true, help: 'Ajio Business Portal → My Profile → Seller Information. Alphanumeric vendor code.' },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true, help: 'Ajio Business Portal → Integrations → API Console → Generate. Request via category manager if locked.' },
    ],
  },

  TATA_CLIQ: {
    type: 'TATA_CLIQ',
    name: 'Tata CLiQ',
    fields: [
      { key: 'vendorId', label: 'Vendor ID', kind: 'text',     required: true, help: 'Tata CLiQ Marketplace → Account → Company Details. Begins with vendor code prefix.' },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true, help: 'Tata CLiQ Marketplace → Settings → API Integration → Generate Key.' },
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
      { key: 'sellerId', label: 'Seller ID', kind: 'text',     required: true, help: 'Snapdeal Seller Zone → Account → Profile. Listed under Seller Code.' },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true, help: 'Seller Zone → Account → API Integration → Generate API Key. Save before closing.' },
    ],
  },

  GLOWROAD: {
    type: 'GLOWROAD',
    name: 'GlowRoad',
    description: 'GlowRoad reseller marketplace.',
    fields: [
      { key: 'sellerId', label: 'Seller ID', kind: 'text',     required: true, help: 'GlowRoad Supplier Panel → Profile → Business Info. Numeric supplier ID.' },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true, help: 'GlowRoad Supplier Panel → Settings → API Access → Generate Key.' },
    ],
  },

  JIOMART: {
    type: 'JIOMART',
    name: 'JioMart Seller',
    docsUrl: 'https://seller.jiomart.com',
    description: 'Reliance JioMart seller panel API.',
    fields: [
      { key: 'sellerId', label: 'Seller ID', kind: 'text',     required: true, help: 'JioMart Seller Panel → My Account → Store Details. Listed as Seller/Vendor Code.' },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true, help: 'JioMart Seller Panel → Settings → API → Generate Token. Production keys only.' },
    ],
  },

  PAYTM_MALL: {
    type: 'PAYTM_MALL',
    name: 'Paytm Mall',
    docsUrl: 'https://seller.paytm.com',
    description: 'Paytm Mall seller API.',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', kind: 'text',     required: true, help: 'Paytm Seller Panel → Profile → Business Details. Alphanumeric MID issued at onboarding.' },
      { key: 'apiKey',     label: 'API Key',     kind: 'password', required: true, secret: true, help: 'Paytm Seller Panel → Settings → API Keys → Generate. Use Production key for live orders.' },
    ],
  },

  LIMEROAD: {
    type: 'LIMEROAD',
    name: 'LimeRoad',
    description: 'LimeRoad seller API.',
    fields: [
      { key: 'sellerId', label: 'Seller ID', kind: 'text',     required: true, help: 'LimeRoad Vendor Panel → Profile → Brand Information. Numeric vendor ID.' },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true, help: 'LimeRoad Vendor Panel → Settings → API → Generate Key. Email vendor support if option missing.' },
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
      { key: 'appId',      label: 'App ID (Client ID)',     kind: 'text',     required: true, help: 'developer.ebay.com → My Account → Application Keysets → App ID column.' },
      { key: 'certId',     label: 'Cert ID (Client Secret)',kind: 'password', required: true, secret: true, help: 'developer.ebay.com → My Account → Application Keysets → Cert ID. Treat as password.' },
      { key: 'devId',      label: 'Dev ID',                 kind: 'text',     required: true, help: 'developer.ebay.com → My Account → Application Keysets → Dev ID. Same across all your apps.' },
      { key: 'userToken',  label: 'User Access Token',      kind: 'password', required: true, secret: true, help: 'developer.ebay.com → User Tokens → Get a User Token. Pick matching environment, sign in with seller account.' },
      {
        key: 'environment',
        label: 'Environment',
        kind: 'select',
        required: true,
        options: [
          { value: 'production', label: 'Production' },
          { value: 'sandbox',    label: 'Sandbox' },
        ],
        help: 'Production for live orders. Sandbox uses developer.ebay.com test data — no real listings touched.',
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
      { key: 'apiKey',       label: 'API Key (keystring)', kind: 'text',     required: true, help: 'etsy.com/developers/your-apps → select your app → Keystring. 24-char alphanumeric.' },
      { key: 'sharedSecret', label: 'Shared Secret',       kind: 'password', required: true, secret: true, help: 'etsy.com/developers/your-apps → your app → Shared Secret. Shown next to the keystring.' },
      { key: 'accessToken',  label: 'Access Token',        kind: 'password', required: true, secret: true, help: 'Run the OAuth 2.0 PKCE flow described in Etsy Open API v3 docs to mint a per-shop token.' },
      { key: 'shopId',       label: 'Shop ID',             kind: 'text',     required: true, help: 'etsy.com/your/shops/me/dashboard → URL contains /shop/<ID>. Numeric.' },
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
      { key: 'siteUrl',        label: 'Site URL',        kind: 'url',      required: true, placeholder: 'https://yourstore.com', help: 'Your WordPress site root with https:// — no /wp-admin or /wp-json suffix.' },
      { key: 'consumerKey',    label: 'Consumer Key',    kind: 'password', required: true, secret: true, help: 'WP admin → WooCommerce → Settings → Advanced → REST API. Starts with ck_.' },
      { key: 'consumerSecret', label: 'Consumer Secret', kind: 'password', required: true, secret: true, help: 'Shown ONCE on the same screen after generating the key. Starts with cs_. Save it now.' },
    ],
  },

  MAGENTO: {
    type: 'MAGENTO',
    name: 'Magento / Adobe Commerce',
    fields: [
      { key: 'storeUrl',    label: 'Store URL',    kind: 'url',      required: true, help: 'Storefront base URL with https://. The /rest/V1 path is appended automatically.' },
      { key: 'accessToken', label: 'Access Token', kind: 'password', required: true, secret: true, help: 'Magento admin → System → Extensions → Integrations → Add → Activate. Copy Access Token shown.' },
    ],
  },

  BIGCOMMERCE: {
    type: 'BIGCOMMERCE',
    name: 'BigCommerce',
    fields: [
      { key: 'storeHash',   label: 'Store Hash',   kind: 'text',     required: true, placeholder: 'abc123def', help: 'BigCommerce admin URL: store-<HASH>.mybigcommerce.com. Copy the part after store-.' },
      { key: 'accessToken', label: 'Access Token', kind: 'password', required: true, secret: true, help: 'BigCommerce admin → Settings → API Accounts → Create V2/V3 API token. Shown once at creation.' },
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
      { key: 'storeUrl', label: 'Store URL', kind: 'url',      required: true, placeholder: 'https://yourstore.com', help: 'OpenCart storefront base URL with https://. The /api endpoint is appended automatically.' },
      { key: 'username', label: 'API Username', kind: 'text',  required: true, help: 'OpenCart admin → System → Users → API → username you set when creating the API user.' },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true, help: 'OpenCart admin → System → Users → API → click your API user → API Key field.' },
    ],
  },

  BLINKIT: {
    type: 'BLINKIT',
    name: 'Blinkit (Grofers)',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', kind: 'text',     required: true, help: 'Blinkit Seller Central → Profile → Store Details. Numeric merchant code from your KAM.' },
      { key: 'apiKey',     label: 'API Key',     kind: 'password', required: true, secret: true, help: 'Issued by your Blinkit Key Account Manager — request via blinkitseller@blinkit.com.' },
    ],
  },

  ZEPTO: {
    type: 'ZEPTO',
    name: 'Zepto',
    fields: [
      { key: 'merchantId', label: 'Merchant ID', kind: 'text',     required: true, help: 'Zepto Brand Portal → Account → Brand Profile. Listed as Brand/Vendor Code.' },
      { key: 'apiKey',     label: 'API Key',     kind: 'password', required: true, secret: true, help: 'Provided by your Zepto category manager — email partnerships@zepto.co.in to request.' },
    ],
  },

  SWIGGY_INSTAMART: {
    type: 'SWIGGY_INSTAMART',
    name: 'Swiggy Instamart',
    fields: [
      { key: 'partnerId', label: 'Partner ID', kind: 'text',     required: true, help: 'Swiggy Partner Portal → Profile → Brand. Numeric partner ID from onboarding email.' },
      { key: 'apiKey',    label: 'API Key',    kind: 'password', required: true, secret: true, help: 'Issued by Swiggy Instamart KAM — request via instamart.partners@swiggy.in.' },
    ],
  },

  BB_NOW: {
    type: 'BB_NOW',
    name: 'BB Now (BigBasket)',
    fields: [
      { key: 'vendorId', label: 'Vendor ID', kind: 'text',     required: true, help: 'BigBasket Vendor Portal → Profile → Company. Listed as Vendor Code (alphanumeric).' },
      { key: 'apiKey',   label: 'API Key',   kind: 'password', required: true, secret: true, help: 'Issued by your BigBasket account manager — request via vendor.connect@bigbasket.com.' },
    ],
  },

  SHIPROCKET: {
    type: 'SHIPROCKET',
    name: 'Shiprocket',
    docsUrl: 'https://apidocs.shiprocket.in',
    description: 'Shiprocket shipping aggregator for pickups, rates, AWBs and tracking.',
    fields: [
      { key: 'email',    label: 'Shiprocket Email',    kind: 'text',     required: true, help: 'Email you log into app.shiprocket.in with. Must have API access enabled in Settings → API.' },
      { key: 'password', label: 'Shiprocket Password', kind: 'password', required: true, secret: true, help: 'Same password used at app.shiprocket.in login. We exchange it for a 24-hour token.' },
    ],
  },

  FSHIP: {
    type: 'FSHIP',
    name: 'Fship',
    description: 'Fship shipping aggregator.',
    fields: [
      { key: 'email',    label: 'Email',    kind: 'text',     required: true, help: 'Email used at app.fship.in login — same account that owns your pickup addresses.' },
      { key: 'password', label: 'Password', kind: 'password', required: true, secret: true, help: 'Your Fship dashboard password. Used to fetch the API auth token automatically.' },
    ],
  },

  DELHIVERY: {
    type: 'DELHIVERY',
    name: 'Delhivery',
    docsUrl: 'https://track.delhivery.com/api-doc/',
    fields: [
      { key: 'token', label: 'API Token', kind: 'password', required: true, secret: true, help: 'Delhivery client portal → Settings → API → Generate Token. Use Production token for live shipments.' },
      {
        key: 'mode',
        label: 'Mode',
        kind: 'select',
        required: true,
        options: [
          { value: 'test',       label: 'Test' },
          { value: 'production', label: 'Production' },
        ],
        help: 'Production hits live Delhivery booking. Test points to staging.delhivery.com — no real pickups.',
      },
    ],
  },

  BLUEDART: {
    type: 'BLUEDART',
    name: 'BlueDart',
    fields: [
      { key: 'customerCode', label: 'Customer Code', kind: 'text',     required: true, help: 'BlueDart issued 6-digit customer/account code shown on your contract or invoice.' },
      { key: 'apiKey',       label: 'API Key',       kind: 'password', required: true, secret: true, help: 'BlueDart API portal → Profile → API Keys. Request via your BlueDart RM if not visible.' },
      { key: 'licenseKey',   label: 'License Key',   kind: 'password', required: true, secret: true, help: 'BlueDart API portal → Profile → License Key. Different from API Key — both are required.' },
    ],
  },

  DTDC: {
    type: 'DTDC',
    name: 'DTDC',
    fields: [
      { key: 'customerCode', label: 'Customer Code', kind: 'text',     required: true, help: 'DTDC customer/account code from your contract — shown on tracker.dtdc.com → My Profile.' },
      { key: 'apiKey',       label: 'API Key',       kind: 'password', required: true, secret: true, help: 'tracker.dtdc.com → API Integration → Generate Key. Email apisupport@dtdc.com if missing.' },
    ],
  },

  XPRESSBEES: {
    type: 'XPRESSBEES',
    name: 'Xpressbees',
    fields: [
      { key: 'email',    label: 'Email',    kind: 'text',     required: true, help: 'Email used at shipment.xpressbees.com login. Must be the merchant account, not subuser.' },
      { key: 'password', label: 'Password', kind: 'password', required: true, secret: true, help: 'Your Xpressbees dashboard password — exchanged server-side for the JWT auth token.' },
    ],
  },

  ECOMEXPRESS: {
    type: 'ECOMEXPRESS',
    name: 'EcomExpress',
    fields: [
      { key: 'username', label: 'Username', kind: 'text',     required: true, help: 'API username issued by EcomExpress onboarding team — different from dashboard login.' },
      { key: 'password', label: 'Password', kind: 'password', required: true, secret: true, help: 'API password issued alongside the username. Email it.support@ecomexpress.in to reset.' },
    ],
  },

  SHADOWFAX: {
    type: 'SHADOWFAX',
    name: 'Shadowfax',
    fields: [
      { key: 'token', label: 'API Token', kind: 'password', required: true, secret: true, help: 'Shadowfax client dashboard → Settings → API Token. Request via merchant.support@shadowfax.in.' },
    ],
  },

  NIMBUSPOST: {
    type: 'NIMBUSPOST',
    name: 'NimbusPost',
    fields: [
      { key: 'email',    label: 'Email',    kind: 'text',     required: true, help: 'Email used at app.nimbuspost.com login — primary account, not subuser.' },
      { key: 'password', label: 'Password', kind: 'password', required: true, secret: true, help: 'Your NimbusPost dashboard password. Server exchanges it for the bearer token.' },
    ],
  },

  CLICKPOST: {
    type: 'CLICKPOST',
    name: 'ClickPost',
    fields: [
      { key: 'username', label: 'Username', kind: 'text',     required: true, help: 'ClickPost merchant dashboard → Settings → API → username field (your account email or org slug).' },
      { key: 'apiKey',   label: 'API Key',  kind: 'password', required: true, secret: true, help: 'ClickPost merchant dashboard → Settings → API → Generate Key.' },
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
      { key: 'accountNumber', label: 'Account Number', kind: 'text',     required: true, help: 'Your 9-digit FedEx shipping account number — printed on FedEx invoices and contracts.' },
      { key: 'apiKey',        label: 'API Key',        kind: 'password', required: true, secret: true, help: 'developer.fedex.com → Projects → your project → API Key. Treat as client_id.' },
      { key: 'apiSecret',     label: 'Secret Key',     kind: 'password', required: true, secret: true, help: 'developer.fedex.com → Projects → your project → Secret Key. Shown once at creation.' },
      {
        key: 'environment',
        label: 'Environment',
        kind: 'select',
        required: true,
        options: [
          { value: 'production', label: 'Production' },
          { value: 'sandbox',    label: 'Sandbox' },
        ],
        help: 'Production hits live FedEx API. Sandbox uses apis-sandbox.fedex.com — test labels only, no pickup booked.',
      },
    ],
  },

  DHL: {
    type: 'DHL',
    name: 'DHL Express',
    docsUrl: 'https://developer.dhl.com',
    description: 'DHL MyDHL API for rates, labels and tracking.',
    fields: [
      { key: 'accountNumber', label: 'DHL Account Number', kind: 'text',     required: true, help: 'Your 9-digit DHL Express account number — printed on DHL contract / waybill stationery.' },
      { key: 'apiKey',        label: 'API Key',            kind: 'password', required: true, secret: true, help: 'developer.dhl.com → My Apps → your app → API Key (client_id).' },
      { key: 'apiSecret',     label: 'API Secret',         kind: 'password', required: true, secret: true, help: 'developer.dhl.com → My Apps → your app → API Secret. Shown once on app creation.' },
      {
        key: 'environment',
        label: 'Environment',
        kind: 'select',
        required: true,
        options: [
          { value: 'production', label: 'Production' },
          { value: 'sandbox',    label: 'Sandbox' },
        ],
        help: 'Production hits express.api.dhl.com live. Sandbox uses express.api-test.dhl.com — no real pickups booked.',
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
      { key: 'accountNumber', label: 'UPS Account Number', kind: 'text',     required: true, help: 'Your 6-character UPS shipper number — shown on ups.com → Profile → Account Summary.' },
      { key: 'clientId',      label: 'Client ID',          kind: 'text',     required: true, help: 'developer.ups.com → My Apps → your app → Client ID.' },
      { key: 'clientSecret',  label: 'Client Secret',      kind: 'password', required: true, secret: true, help: 'developer.ups.com → My Apps → your app → Client Secret. Shown once on app creation.' },
      {
        key: 'environment',
        label: 'Environment',
        kind: 'select',
        required: true,
        options: [
          { value: 'production', label: 'Production' },
          { value: 'sandbox',    label: 'Sandbox' },
        ],
        help: 'Production hits onlinetools.ups.com live. Sandbox uses wwwcie.ups.com — test labels only, no pickup booked.',
      },
    ],
  },

  ITHINK: {
    type: 'ITHINK',
    name: 'iThink Logistics',
    description: 'iThink Logistics shipping aggregator.',
    fields: [
      { key: 'apiKey',   label: 'API Key',  kind: 'password', required: true, secret: true, help: 'iThink Logistics dashboard → Settings → API → Generate Key. 32-char hex.' },
      { key: 'clientId', label: 'Client ID',kind: 'text',     required: false, help: 'Optional — required by some iThink endpoints.' },
    ],
  },

  PICKRR: {
    type: 'PICKRR',
    name: 'Pickrr',
    description: 'Pickrr shipping aggregator.',
    fields: [
      { key: 'authToken', label: 'Auth Token', kind: 'password', required: true, secret: true, help: 'Pickrr dashboard → Settings → API → Auth Token. Email tech@pickrr.com if option missing.' },
    ],
  },

  SHIPWAY: {
    type: 'SHIPWAY',
    name: 'Shipway',
    docsUrl: 'https://shipway.com',
    description: 'Shipway post-ship tracking and returns platform.',
    fields: [
      { key: 'username',  label: 'Username',    kind: 'text',     required: true, help: 'Email used at app.shipway.com login — primary merchant account.' },
      { key: 'licenseKey',label: 'License Key', kind: 'password', required: true, secret: true, help: 'Shipway dashboard → Settings → API → License Key. 32-char alphanumeric.' },
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
      { key: 'webhookSecret', label: 'Webhook HMAC Secret', kind: 'password', required: true, secret: true, help: 'Pick any 32+ char random string. Use it in your sender to sign requests with HMAC-SHA256.' },
    ],
  },
};

export function getSchemaForType(type: string): ChannelSchema | null {
  return CHANNEL_SCHEMAS[type] || null;
}
