// Bootstrap — creates tables + seeds on startup.
// Seed runs ONCE. After all data exists, it never runs again.

async function initDb() {
  const db = require('../utils/db');
  const SCHEMA_SQL = require('../config/schema.sql.js');

  // 1. Create tables (IF NOT EXISTS — safe to re-run)
  console.log('[initDb] ensuring tables exist...');
  await db.raw('SET FOREIGN_KEY_CHECKS = 0');
  const statements = SCHEMA_SQL.split(';').map(s => s.trim()).filter(Boolean);
  for (const sql of statements) {
    await db.raw(sql);
  }
  await db.raw('SET FOREIGN_KEY_CHECKS = 1');
  console.log(`[initDb] ${statements.length} tables ready.`);

  // Lightweight migrations — add columns that are newer than the base schema.sql
  const migrations = [
    { table: 'orders', column: 'rtoScore',        ddl: 'INT DEFAULT NULL' },
    { table: 'orders', column: 'rtoRiskLevel',    ddl: "VARCHAR(16) DEFAULT NULL" },
    { table: 'orders', column: 'rtoFactors',      ddl: 'LONGTEXT DEFAULT NULL' },
    { table: 'orders', column: 'needsApproval',   ddl: 'TINYINT(1) NOT NULL DEFAULT 0' },
    { table: 'orders', column: 'approvedAt',      ddl: 'DATETIME(3) DEFAULT NULL' },
    { table: 'orders', column: 'approvedById',    ddl: 'VARCHAR(191) DEFAULT NULL' },
    { table: 'orders', column: 'rejectedAt',      ddl: 'DATETIME(3) DEFAULT NULL' },
    { table: 'orders', column: 'rejectionReason', ddl: 'TEXT DEFAULT NULL' },

    // Fulfillment model — who physically ships the order
    { table: 'orders', column: 'fulfillmentType',        ddl: "VARCHAR(16) NOT NULL DEFAULT 'SELF'" },
    { table: 'orders', column: 'channelFulfillmentCenter', ddl: 'VARCHAR(191) DEFAULT NULL' },
    { table: 'orders', column: 'awb',                    ddl: 'VARCHAR(191) DEFAULT NULL' },
    { table: 'orders', column: 'courierTrackingUrl',     ddl: 'TEXT DEFAULT NULL' },

    // Data-quality flagging for channels that give incomplete orders
    { table: 'orders', column: 'dataCompleteness', ddl: "VARCHAR(16) DEFAULT 'COMPLETE'" },
    { table: 'orders', column: 'missingFields',    ddl: 'LONGTEXT DEFAULT NULL' },
    { table: 'orders', column: 'enrichedAt',       ddl: 'DATETIME(3) DEFAULT NULL' },
    { table: 'orders', column: 'enrichedById',     ddl: 'VARCHAR(191) DEFAULT NULL' },

    // Per-channel default fulfillment (SELF | CHANNEL | BOTH)
    { table: 'channels', column: 'defaultFulfillmentType', ddl: "VARCHAR(16) NOT NULL DEFAULT 'SELF'" },

    // User profile extras
    { table: 'users', column: 'phone', ddl: 'VARCHAR(30) DEFAULT NULL' },
  ];

  // Create wallet tables if they don't exist (separate from column migrations)
  const walletTables = [
    `CREATE TABLE IF NOT EXISTS \`tenant_wallets\` (
      \`id\` varchar(191) NOT NULL,
      \`tenantId\` varchar(191) NOT NULL,
      \`balance\` decimal(12,2) NOT NULL DEFAULT 0.00,
      \`currency\` varchar(8) NOT NULL DEFAULT 'INR',
      \`lowBalanceThreshold\` decimal(12,2) NOT NULL DEFAULT 100.00,
      \`autoTopupEnabled\` tinyint(1) NOT NULL DEFAULT 0,
      \`autoTopupAmount\` decimal(12,2) DEFAULT NULL,
      \`autoTopupTriggerBelow\` decimal(12,2) DEFAULT NULL,
      \`createdAt\` datetime(3) NOT NULL DEFAULT current_timestamp(3),
      \`updatedAt\` datetime(3) NOT NULL DEFAULT current_timestamp(3) ON UPDATE current_timestamp(3),
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`tenant_wallets_tenantId_unique\` (\`tenantId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    `CREATE TABLE IF NOT EXISTS \`wallet_transactions\` (
      \`id\` varchar(191) NOT NULL,
      \`tenantId\` varchar(191) NOT NULL,
      \`walletId\` varchar(191) NOT NULL,
      \`type\` varchar(16) NOT NULL,
      \`amount\` decimal(12,2) NOT NULL,
      \`balanceAfter\` decimal(12,2) NOT NULL,
      \`metric\` varchar(32) DEFAULT NULL,
      \`quantity\` int(11) DEFAULT NULL,
      \`reference\` varchar(191) DEFAULT NULL,
      \`description\` text DEFAULT NULL,
      \`createdById\` varchar(191) DEFAULT NULL,
      \`paymentRef\` varchar(191) DEFAULT NULL,
      \`createdAt\` datetime(3) NOT NULL DEFAULT current_timestamp(3),
      PRIMARY KEY (\`id\`),
      KEY \`wallet_txn_tenant_idx\` (\`tenantId\`, \`createdAt\`),
      KEY \`wallet_txn_wallet_idx\` (\`walletId\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  ];
  for (const sql of walletTables) {
    try { await db.raw(sql); } catch (e) { console.warn('[initDb] wallet table:', e.message); }
  }
  for (const m of migrations) {
    try {
      const [cols] = await db.raw(
        "SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
        [m.table, m.column]
      );
      const exists = Array.isArray(cols) ? cols.length > 0 : !!cols;
      if (!exists) {
        await db.raw(`ALTER TABLE \`${m.table}\` ADD COLUMN \`${m.column}\` ${m.ddl}`);
        console.log(`[initDb] migrated: ${m.table}.${m.column}`);
      }
    } catch (e) {
      console.warn(`[initDb] migration ${m.table}.${m.column} skipped:`, e.message);
    }
  }

  // Enum extensions — additive only (safe to re-run)
  // Extends `category` on channels & channel_requests with new pending categories.
  const TYPE_ENUM = "ENUM('AMAZON','FLIPKART','MYNTRA','MEESHO','SNAPDEAL','PAYTM_MALL','NYKAA','AJIO','TATA_CLIQ','GLOWROAD','JIOMART','LIMEROAD','EBAY','ETSY','BLINKIT','ZEPTO','SWIGGY_INSTAMART','BB_NOW','AMAZON_SMARTBIZ','SHOPIFY','WOOCOMMERCE','MAGENTO','BIGCOMMERCE','OPENCART','WEBSITE','OFFLINE','POS','SHIPROCKET','DELHIVERY','FSHIP','BLUEDART','DTDC','ECOMEXPRESS','XPRESSBEES','SHADOWFAX','FEDEX','DHL','UPS','ITHINK','PICKRR','SHIPWAY','NIMBUSPOST','CLICKPOST','INSTAGRAM','FACEBOOK','WHATSAPP_BUSINESS','B2B_PORTAL','WHOLESALE','DISTRIBUTOR','CUSTOM_WEBHOOK','OTHER','WALMART','AMAZON_US','AMAZON_UK','AMAZON_UAE','AMAZON_SA','AMAZON_SG','AMAZON_AU','AMAZON_DE','LAZADA','SHOPEE','NOON','MERCADO_LIBRE','ALLEGRO','FRUUGO','ONBUY','MANOMANO','RAKUTEN','ZALANDO','KAUFLAND','WISH','INDIAMART','INDUSTRYBUYING','MOGLIX','PURPLLE','BEWAKOOF','SHOPCLUES','FIRSTCRY','PEPPERFRY','CROMA','TATA_NEU','FLIPKART_MINUTES','TATA_1MG','DUNZO','COUNTRY_DELIGHT','ARAMEX','EKART','INDIA_POST','GATI','SAFEXPRESS','TRACKON','PROFESSIONAL_COURIERS','SMARTR','SHYPLITE','ICARRY','DOTZOT','SHIPDELIGHT','WIX','SQUARESPACE','SALESFORCE_COMMERCE','PRESTASHOP','ECWID','ZOHO_COMMERCE','DUKAAN','SHOOPY','BIKAYI','KARTROCKET','INSTAMOJO_PAGES','TIKTOK_SHOP','PINTEREST','YOUTUBE_SHOPPING','SNAPCHAT','TALLY','TALLY_PRIME','ZOHO_BOOKS','QUICKBOOKS','XERO','SAP_B1','SAP_S4HANA','ERPNEXT','DYNAMICS_365','NETSUITE','ODOO','BUSY','MARG_ERP','LOGIC_ERP','SHOPIFY_POS','SQUARE_POS','LIGHTSPEED_POS','LOYVERSE_POS','GOFRUGAL','POSIST','PETPOOJA','VYAPAR','ZOHO_POS','RAZORPAY','PAYU','CCAVENUE','CASHFREE','STRIPE','PAYPAL','PAYTM_PG','PHONEPE_BUSINESS','INSTAMOJO','CLEARTAX','GSTZEN','TAXCLOUD_IRP','AVALARA','ZOHO_GST','HUBSPOT','SALESFORCE_CRM','ZOHO_CRM','MAILCHIMP','KLAVIYO','SENDINBLUE','WEBENGAGE','MOENGAGE','CLEVERTAP','FRESHDESK','ZENDESK','GORGIAS','RETURN_PRIME','WERETURN','ANCHANTO_RETURNS','EASYVMS','AMAZON_FBA','FLIPKART_SMART_FULFILLMENT','WAREIQ','LOGINEXT','HOLISOL') NOT NULL";
  const enumExtensions = [
    { table: 'channels', column: 'type',     ddl: TYPE_ENUM, sentinel: 'WALMART' },
    {
      table: 'channels',
      column: 'category',
      ddl: "ENUM('ECOM','QUICKCOM','LOGISTICS','OWNSTORE','SOCIAL','B2B','CUSTOM','ACCOUNTING','POS_SYSTEM','PAYMENT','TAX','CRM','RETURNS','FULFILLMENT') NOT NULL DEFAULT 'ECOM'",
      sentinel: 'ACCOUNTING',
    },
    {
      table: 'channel_requests',
      column: 'category',
      ddl: "ENUM('ECOM','QUICKCOM','LOGISTICS','OWNSTORE','SOCIAL','B2B','CUSTOM','ACCOUNTING','POS_SYSTEM','PAYMENT','TAX','CRM','RETURNS','FULFILLMENT') NOT NULL DEFAULT 'CUSTOM'",
      sentinel: 'ACCOUNTING',
    },
  ];
  for (const m of enumExtensions) {
    try {
      const [rows] = await db.raw(
        "SELECT COLUMN_TYPE FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
        [m.table, m.column]
      );
      const current = Array.isArray(rows) ? rows[0]?.COLUMN_TYPE : rows?.COLUMN_TYPE;
      const sentinel = (m.sentinel || 'ACCOUNTING').toUpperCase();
      if (current && !current.toUpperCase().includes(sentinel)) {
        await db.raw(`ALTER TABLE \`${m.table}\` MODIFY COLUMN \`${m.column}\` ${m.ddl}`);
        console.log(`[initDb] enum extended: ${m.table}.${m.column}`);
      }
    } catch (e) {
      console.warn(`[initDb] enum extension ${m.table}.${m.column} skipped:`, e.message);
    }
  }

  // 2. Check if seed already ran — if all key tables have data, skip
  const [planRows] = await db.raw("SELECT COUNT(*) as cnt FROM `plans`").catch(() => [{ cnt: 0 }]);
  const [contentRows] = await db.raw("SELECT COUNT(*) as cnt FROM `public_content`").catch(() => [{ cnt: 0 }]);
  const [userRows] = await db.raw("SELECT COUNT(*) as cnt FROM `users`").catch(() => [{ cnt: 0 }]);
  const planCount = Number(planRows?.[0]?.cnt ?? planRows?.cnt ?? 0);
  const contentCount = Number(contentRows?.[0]?.cnt ?? contentRows?.cnt ?? 0);
  const userCount = Number(userRows?.[0]?.cnt ?? userRows?.cnt ?? 0);

  if (planCount > 0 && contentCount > 0 && userCount > 0) {
    console.log('[initDb] data exists -- skipping seed.');
    return;
  }

  // 3. First run — seed everything
  console.log('[initDb] first run -- seeding...');
  const { run: seed } = require('../scripts/seed');
  await seed();
  console.log('[initDb] seed complete.');
}

module.exports = { initDb };
