const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BACKEND_DIR = path.resolve(__dirname, '..', '..');
const STATE_FILE = path.join(BACKEND_DIR, '.seed-state.json');

function run(cmd) {
  execSync(cmd, { cwd: BACKEND_DIR, stdio: 'inherit' });
}

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return {}; }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function initDb() {
  const db = require('../utils/db');

  console.log('[initDb] running knex migrations…');
  const [batchNo, applied] = await db.migrate.latest();
  if (applied.length > 0) {
    console.log(`[initDb] applied batch ${batchNo}: ${applied.join(', ')}`);
  } else {
    console.log('[initDb] no pending migrations.');
  }

  // Check if we need to re-seed
  const state = readState();
  const migrationDir = path.join(BACKEND_DIR, 'migrations');
  const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.js')).sort();
  const latestFile = files[files.length - 1] || null;

  if (!latestFile) {
    console.log('[initDb] no migration files found.');
    return;
  }

  if (state.lastSeededMigration === latestFile) {
    console.log(`[initDb] seed up-to-date (${latestFile}).`);
    return;
  }

  console.log(`[initDb] schema changed (${state.lastSeededMigration || 'none'} → ${latestFile}), running seed…`);
  run('node prisma/seed.js');
  writeState({ lastSeededMigration: latestFile, seededAt: new Date().toISOString() });
  console.log('[initDb] seed complete.');
}

module.exports = { initDb };
