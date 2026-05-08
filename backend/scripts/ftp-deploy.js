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

  // Open a fresh FTPS client. Used at start AND inside the per-file retry
  // loop — Pure-FTPd sometimes drops the data channel mid-batch on slow
  // links, so we tear down and reconnect rather than soldier on.
  async function makeClient() {
    const c = new ftp.Client(60_000);
    c.ftp.verbose = false;
    await c.access({
      host: HOST,
      port: PORT,
      user: USER,
      password: PASS,
      secure: SECURE === 'explicit',
      secureOptions: { rejectUnauthorized: false },
    });
    return c;
  }

  let client = await makeClient();
  try {
    console.log(`\n[ftp-deploy] connecting to ${HOST}:${PORT} (${SECURE} FTPS)`);
    await client.ensureDir(BASE_DIR);
    console.log(`[ftp-deploy] cwd: ${await client.pwd()}`);

    let uploaded = 0;
    let retried = 0;
    let failed = 0;
    // Cache: dirPath → Map(filename → size). Cleared whenever we
    // reconnect, since a fresh control socket invalidates cwd state.
    let dirSizesCache = new Map();

    // Wrap any FTP call so it reconnects+retries on control-socket death.
    // We pass a function that does the actual work; if it throws we
    // close & re-open the client and retry up to `attempts` times.
    async function withReconnect(label, fn, attempts = 3) {
      let lastErr = null;
      for (let i = 1; i <= attempts; i++) {
        try {
          return await fn();
        } catch (err) {
          lastErr = err;
          if (i < attempts) {
            // Most errors at this layer are control-socket related —
            // tear down + reconnect for the next attempt.
            try { client.close(); } catch (_) {}
            try {
              client = await makeClient();
              dirSizesCache = new Map(); // cwd state is gone
            } catch (reconnErr) {
              lastErr = reconnErr;
            }
          }
        }
      }
      throw new Error(`${label} failed after ${attempts} attempts: ${lastErr?.message}`);
    }

    for (const abs of files) {
      const remote = toRemote(abs);
      const remoteDir = remote.substring(0, remote.lastIndexOf('/'));
      const remoteName = remote.substring(remote.lastIndexOf('/') + 1);
      const localSize = fs.statSync(abs).size;

      try {
        // Ensure parent dir + cache its current listing (reconnect-safe)
        if (!dirSizesCache.has(remoteDir)) {
          await withReconnect(`list ${remoteDir}`, async () => {
            await client.ensureDir(remoteDir);
            const listing = await client.list();
            const m = new Map();
            for (const e of listing) if (!e.isDirectory) m.set(e.name, e.size);
            dirSizesCache.set(remoteDir, m);
          });
        }

        // Skip if already correct — saves a round-trip on diff-deploys
        if (dirSizesCache.get(remoteDir)?.get(remoteName) === localSize) {
          uploaded++;
          const pct = ((uploaded / files.length) * 100).toFixed(0).padStart(3);
          const rel = path.relative(ROOT, abs);
          process.stdout.write(`\r[ftp-deploy] ${pct}%  (${uploaded}/${files.length})  ${rel.padEnd(60).slice(0, 60)}`);
          continue;
        }

        // Upload + verify size landed (reconnect-safe). 3 attempts.
        await withReconnect(`upload ${remoteName}`, async () => {
          // Make sure cwd is right after a possible reconnect
          await client.ensureDir(remoteDir);
          await client.uploadFrom(abs, remoteName);
          const verify = await client.list();
          const v = verify.find((e) => !e.isDirectory && e.name === remoteName);
          if (!v || v.size !== localSize) {
            throw new Error(`size after upload was ${v ? v.size : 'missing'}, expected ${localSize}`);
          }
          if (!dirSizesCache.has(remoteDir)) dirSizesCache.set(remoteDir, new Map());
          dirSizesCache.get(remoteDir).set(remoteName, v.size);
        });
      } catch (err) {
        const rel = path.relative(ROOT, abs);
        console.log(`\n  ✗ ${rel} FAILED: ${err.message}`);
        failed++;
        continue;
      }

      uploaded++;
      // We don't know how many were retries vs first-try since
      // withReconnect is opaque — track it by side-channel later if it
      // becomes useful. For now just count retried = 0 and rely on the
      // FAILED counter as the meaningful signal.
      const pct = ((uploaded / files.length) * 100).toFixed(0).padStart(3);
      const rel = path.relative(ROOT, abs);
      process.stdout.write(`\r[ftp-deploy] ${pct}%  (${uploaded}/${files.length})  ${rel.padEnd(60).slice(0, 60)}`);
    }
    process.stdout.write('\n');

    console.log('\n[ftp-deploy] verifying with a fresh listing of /Backend/src');
    const sample = await client.list(`${BASE_DIR}/src`).catch(() => []);
    console.log(`[ftp-deploy] /Backend/src has ${sample.length} top-level entries.`);

    console.log('\n================ DEPLOY COMPLETE ================');
    console.log(`Uploaded:   ${uploaded} files (${(totalBytes / 1024).toFixed(1)} KB)`);
    if (retried > 0) console.log(`Retried:    ${retried} files succeeded after a retry`);
    if (failed > 0)  console.log(`FAILED:     ${failed} files did NOT upload — fix and re-run`);
    console.log(`To:         ${HOST}:${BASE_DIR}/`);
    console.log('Next:       restart the Node app in cPanel → Setup Node.js App');
    console.log('           → if package.json changed, click "Run NPM Install" first');
    console.log('==================================================\n');
    if (failed > 0) process.exitCode = 3;
  } catch (err) {
    console.error('\n[ftp-deploy] FAILED:', err.message);
    if (err.code) console.error('  code:', err.code);
    process.exitCode = 2;
  } finally {
    client.close();
  }
}

main();
