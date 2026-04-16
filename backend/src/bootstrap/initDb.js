// Bootstrap — creates tables + seeds on startup.
// Re-runs only when DB_VERSION (passed from index.js) changes.

const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '..', '..');
const STATE_FILE = path.join(BACKEND_DIR, '.seed-state.json');

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return {}; }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function initDb(version) {
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

  // 2. Check version — only seed when version changes or tables are empty
  const state = readState();

  if (state.version === version) {
    const [rows] = await db.raw("SELECT COUNT(*) as cnt FROM `plans`").catch(() => [{ cnt: 0 }]);
    const count = Number(rows?.[0]?.cnt ?? rows?.cnt ?? 0);
    if (count > 0) {
      console.log(`[initDb] v${version} already seeded — skipping.`);
      return;
    }
    console.log(`[initDb] v${version} state exists but tables are empty �� re-seeding...`);
  } else {
    console.log(`[initDb] version changed (${state.version || 'none'} -> ${version}) — running seeds...`);
  }

  // 3. Run seed
  const { run: seed } = require('../scripts/seed');
  await seed();

  writeState({ version, seededAt: new Date().toISOString() });
  console.log('[initDb] seed complete.');
}

module.exports = { initDb };
