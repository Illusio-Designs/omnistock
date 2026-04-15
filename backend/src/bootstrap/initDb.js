const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const BACKEND_DIR = path.resolve(__dirname, '..', '..');
const STATE_FILE = path.join(BACKEND_DIR, '.seed-state.json');

function run(cmd) {
  execSync(cmd, { cwd: BACKEND_DIR, stdio: 'inherit' });
}

async function latestMigrationId(prisma) {
  const rows = await prisma.$queryRawUnsafe(
    'SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1'
  );
  return rows?.[0]?.migration_name || null;
}

function readState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); }
  catch { return {}; }
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

async function initDb() {
  console.log('[initDb] applying migrations…');
  run('npx prisma migrate deploy');

  const prisma = new PrismaClient();
  try {
    const current = await latestMigrationId(prisma);
    const state = readState();

    if (!current) {
      console.log('[initDb] no migrations found — skipping seed check.');
      return;
    }

    if (state.lastSeededMigration === current) {
      console.log(`[initDb] seed up-to-date (${current}).`);
      return;
    }

    console.log(`[initDb] schema changed (${state.lastSeededMigration || 'none'} → ${current}), running seed…`);
    await prisma.$disconnect();
    run('node prisma/seed.js');
    writeState({ lastSeededMigration: current, seededAt: new Date().toISOString() });
    console.log('[initDb] seed complete.');
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

module.exports = { initDb };
