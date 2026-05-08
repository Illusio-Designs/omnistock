#!/usr/bin/env node
/**
 * FTP connection + directory listing test (basic-ftp library).
 *
 * Usage:
 *   FTP_PASSWORD='...' node scripts/ftp-test.js
 *
 * Reads FTP_HOST / FTP_USER / FTP_PORT / FTP_PASSWORD from env.
 * Connects via explicit FTPS (AUTH TLS over port 21), authenticates,
 * lists the remote root, walks one level deep into each subdirectory,
 * and prints a summary so we know the layout before writing the deploy
 * action's `server-dir` value.
 *
 * basic-ftp handles Pure-FTPd's TLS session-reuse requirement on the
 * data channel — the hand-rolled net/tls version hangs on LIST because
 * Node's stock tls.connect doesn't share the control-channel session.
 */

// Load backend/.env so FTP_HOST / FTP_USER / FTP_PASSWORD work without
// having to export them on every run. dotenv is already a dep.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const ftp = require('basic-ftp');

const HOST = process.env.FTP_HOST || 'ftp.kartriq.com';
const PORT = Number(process.env.FTP_PORT || 21);
const USER = process.env.FTP_USER || 'Rishi@kartriq.com';
const PASS = process.env.FTP_PASSWORD || '';
const SECURE = (process.env.FTP_SECURE || 'explicit').toLowerCase();

if (!PASS) {
  console.error('ERROR: FTP_PASSWORD env var is required.');
  console.error('Run with:  FTP_PASSWORD="your-password" node scripts/ftp-test.js');
  process.exit(1);
}

function fmt(entry) {
  const kind = entry.isDirectory ? 'DIR ' : entry.isSymbolicLink ? 'LINK' : 'FILE';
  const sz = entry.isDirectory ? '   ' : String(entry.size || 0).padStart(10);
  return `  ${kind}  ${sz}  ${entry.name}`;
}

(async () => {
  const client = new ftp.Client(30_000);
  client.ftp.verbose = false;
  try {
    console.log(`[ftp-test] connecting to ${HOST}:${PORT} (${SECURE} FTPS)`);
    await client.access({
      host: HOST,
      port: PORT,
      user: USER,
      password: PASS,
      // 'explicit' here = AUTH TLS upgrade over port 21
      secure: SECURE === 'explicit' ? true : false,
      secureOptions: { rejectUnauthorized: false },
    });

    const cwd = await client.pwd();
    console.log('\n================ REMOTE DIRECTORY ================');
    console.log(`PWD: ${cwd}`);

    console.log('--- LIST (root) ---');
    const root = await client.list();
    if (!root.length) console.log('  (empty)');
    for (const e of root) console.log(fmt(e));

    const dirs = root.filter((e) => e.isDirectory && e.name !== '.' && e.name !== '..');
    for (const d of dirs.slice(0, 10)) {
      console.log(`\n--- LIST ${cwd.replace(/\/$/, '')}/${d.name} ---`);
      try {
        const sub = await client.list(d.name);
        if (!sub.length) console.log('  (empty)');
        for (const e of sub.slice(0, 50)) console.log(fmt(e));
        if (sub.length > 50) console.log(`  ... ${sub.length - 50} more entries`);
      } catch (e) {
        console.log(`  (could not list: ${e.message})`);
      }
    }

    console.log('\n================ SUMMARY ================');
    console.log(`Total root entries: ${root.length}`);
    console.log(`Subdirs scanned:    ${Math.min(dirs.length, 10)} of ${dirs.length}`);
    console.log(`User landed in:     ${cwd}`);
    console.log('==========================================\n');

    console.log('[ftp-test] OK — connection + listing succeeded');
    process.exit(0);
  } catch (err) {
    console.error('\n[ftp-test] FAILED:', err.message);
    if (err.code) console.error('  code:', err.code);
    process.exit(2);
  } finally {
    client.close();
  }
})();
