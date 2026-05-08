#!/usr/bin/env node
/**
 * Manual one-shot deploy of the local backend/ to FTP_BASE_DIR.
 *
 * Mirrors what .github/workflows/backend-deploy-ftp.yml does on push, so
 * you can validate a change locally before it auto-deploys.
 *
 * NEVER UPLOADED — production-managed:
 *   .env / .env.*    — server has its own production secrets
 *   package-lock.json — server's lock is owned by cPanel nodevenv
 *   node_modules     — server's is a SYMLINK into cPanel's nodevenv;
 *                      overwriting would break the Node app
 *   .htaccess        — Apache routing config for the API subdomain
 *   tmp / logs / *.log — runtime state
 *   .well-known      — SSL/ACME challenges
 *   scripts/ftp-*.js — local-only deploy helpers
 *
 * UPLOADED:
 *   src/**           — all backend code, recursively
 *   package.json     — top-level only (no lockfile)
 *
 * Usage:
 *   node scripts/ftp-deploy.js --dry-run    # preview the file list
 *   node scripts/ftp-deploy.js              # do it
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const ftp = require('basic-ftp');

const HOST = process.env.FTP_HOST || 'ftp.kartriq.com';
const PORT = Number(process.env.FTP_PORT || 21);
const USER = process.env.FTP_USER || '';
const PASS = process.env.FTP_PASSWORD || '';
const SECURE = (process.env.FTP_SECURE || 'explicit').toLowerCase();
const BASE_DIR = process.env.FTP_BASE_DIR || '/Backend';

const args = new Set(process.argv.slice(2));
const DRY = args.has('--dry-run');

if (!USER || !PASS) {
  console.error('ERROR: FTP_USER and FTP_PASSWORD must be set in backend/.env');
  process.exit(1);
}

const ROOT = path.join(__dirname, '..');

// Things we recursively walk + upload.
const INCLUDE_DIRS = ['src'];
// Top-level files always uploaded. package-lock.json is intentionally
// absent — the server's lock is managed by cPanel's nodevenv.
const TOP_FILES = ['package.json'];

// Per-file skip patterns (any segment match → skip).
const SEGMENT_BLOCKLIST = new Set([
  'node_modules', '.git', '.github', '.vscode', '.idea',
  'tmp', 'logs', 'coverage', '.cache', '.nyc_output',
  '__tests__', 'test', 'tests', '.well-known',
]);
// Exact filename skip.
const NAME_BLOCKLIST = new Set([
  '.env', '.env.local', '.env.development', '.env.production',
  '.envrc', '.DS_Store', 'Thumbs.db', '.eslintcache',
  'stderr.log', '.htaccess',
  'DEPLOY_TEST.txt',
  // Lockfile lives with cPanel's nodevenv — never push from local
  'package-lock.json',
  // Don't push the deploy scripts themselves to prod
  'ftp-test.js', 'ftp-deploy.js',
]);
// Suffix skip.
const SUFFIX_BLOCKLIST = ['.test.js', '.spec.js', '.log'];

function shouldSkip(absPath) {
  const rel = path.relative(ROOT, absPath).split(path.sep);
  for (const seg of rel) {
    if (SEGMENT_BLOCKLIST.has(seg)) return true;
  }
  const name = rel[rel.length - 1];
  if (NAME_BLOCKLIST.has(name)) return true;
  for (const suf of SUFFIX_BLOCKLIST) {
    if (name.endsWith(suf)) return true;
  }
  return false;
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (shouldSkip(abs)) continue;
    if (entry.isDirectory()) walk(abs, out);
    else if (entry.isFile()) out.push(abs);
  }
  return out;
}

// Convert a local absolute path to its remote path under BASE_DIR.
// Local: E:\omnistock\backend\src\index.js
// Remote: /Backend/src/index.js
function toRemote(absPath) {
  const rel = path.relative(ROOT, absPath).split(path.sep).join('/');
  return `${BASE_DIR.replace(/\/$/, '')}/${rel}`;
}

async function main() {
  // Build the upload set
  const files = [];
  for (const dir of INCLUDE_DIRS) {
    walk(path.join(ROOT, dir), files);
  }
  for (const f of TOP_FILES) {
    const abs = path.join(ROOT, f);
    if (fs.existsSync(abs) && !shouldSkip(abs)) files.push(abs);
  }

  const totalBytes = files.reduce((s, f) => s + fs.statSync(f).size, 0);
  console.log(`[ftp-deploy] target: ${BASE_DIR} on ${HOST}`);
  console.log(`[ftp-deploy] include: ${[...INCLUDE_DIRS, ...TOP_FILES].join(', ')}`);
  console.log(`[ftp-deploy] excluded: .env, package-lock.json, node_modules, .htaccess, scripts/ftp-*.js`);
  console.log(`[ftp-deploy] files queued: ${files.length}  (${(totalBytes / 1024).toFixed(1)} KB)`);

  if (DRY) {
    console.log('\n[ftp-deploy] --dry-run — printing the list and exiting:\n');
    for (const f of files) {
      const sz = fs.statSync(f).size;
      console.log(`  ${String(sz).padStart(8)}  ${path.relative(ROOT, f)}`);
    }
    console.log('\n[ftp-deploy] No files were uploaded.');
    return;
  }

  const client = new ftp.Client(60_000);
  client.ftp.verbose = false;
  try {
    console.log(`\n[ftp-deploy] connecting to ${HOST}:${PORT} (${SECURE} FTPS)`);
    await client.access({
      host: HOST,
      port: PORT,
      user: USER,
      password: PASS,
      secure: SECURE === 'explicit',
      secureOptions: { rejectUnauthorized: false },
    });
    await client.ensureDir(BASE_DIR);
    console.log(`[ftp-deploy] cwd: ${await client.pwd()}`);

    let uploaded = 0;
    const remoteDirsCreated = new Set();
    for (const abs of files) {
      const remote = toRemote(abs);
      const remoteDir = remote.substring(0, remote.lastIndexOf('/'));
      const remoteName = remote.substring(remote.lastIndexOf('/') + 1);

      // ensureDir on every unique parent — basic-ftp internally CDs back
      // and forth, so we cache to avoid the round-trips.
      if (!remoteDirsCreated.has(remoteDir)) {
        await client.ensureDir(remoteDir);
        remoteDirsCreated.add(remoteDir);
      }
      // Now CWD is remoteDir thanks to ensureDir; uploadFrom relative name
      await client.uploadFrom(abs, remoteName);

      uploaded++;
      const pct = ((uploaded / files.length) * 100).toFixed(0).padStart(3);
      const rel = path.relative(ROOT, abs);
      process.stdout.write(`\r[ftp-deploy] ${pct}%  (${uploaded}/${files.length})  ${rel.padEnd(60).slice(0, 60)}`);
    }
    process.stdout.write('\n');

    console.log('\n[ftp-deploy] verifying with a fresh listing of /Backend/src');
    const sample = await client.list(`${BASE_DIR}/src`).catch(() => []);
    console.log(`[ftp-deploy] /Backend/src has ${sample.length} top-level entries.`);

    console.log('\n================ DEPLOY COMPLETE ================');
    console.log(`Uploaded: ${uploaded} files (${(totalBytes / 1024).toFixed(1)} KB)`);
    console.log(`To:       ${HOST}:${BASE_DIR}/`);
    console.log('Next:     restart the Node app in cPanel → Setup Node.js App');
    console.log('         → if package.json changed, click "Run NPM Install" first');
    console.log('==================================================\n');
  } catch (err) {
    console.error('\n[ftp-deploy] FAILED:', err.message);
    if (err.code) console.error('  code:', err.code);
    process.exitCode = 2;
  } finally {
    client.close();
  }
}

main();
