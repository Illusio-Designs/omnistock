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
