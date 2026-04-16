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
