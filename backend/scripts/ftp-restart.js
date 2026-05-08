#!/usr/bin/env node
/**
 * Tells the live Node.js backend to restart by writing/touching
 * <FTP_BASE_DIR>/tmp/restart.txt over FTP.
 *
 * Why this works: cPanel's "Setup Node.js App" runs every Node.js
 * application under Phusion Passenger. Passenger watches each app's
 * `tmp/restart.txt` and recycles the worker the next time a request
 * comes in after the file's mtime changes. Updating the file is enough
 * — content doesn't matter — so we just write the current ISO
 * timestamp for traceability.
 *
 * Usage:
 *   node scripts/ftp-restart.js
 *
 * Reads the same FTP_HOST / FTP_USER / FTP_PASSWORD / FTP_BASE_DIR as
 * scripts/ftp-deploy.js, so the same backend/.env powers both.
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const os = require('os');
const path = require('path');
const ftp = require('basic-ftp');

const HOST = process.env.FTP_HOST || 'ftp.kartriq.com';
const PORT = Number(process.env.FTP_PORT || 21);
const USER = process.env.FTP_USER || '';
const PASS = process.env.FTP_PASSWORD || '';
const SECURE = (process.env.FTP_SECURE || 'explicit').toLowerCase();
const BASE_DIR = process.env.FTP_BASE_DIR || '/Backend';

if (!USER || !PASS) {
  console.error('ERROR: FTP_USER and FTP_PASSWORD must be set in env or backend/.env');
  process.exit(1);
}

(async () => {
  const tmpFile = path.join(os.tmpdir(), `restart-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, `Restart triggered at ${new Date().toISOString()}\n`);

  const client = new ftp.Client(20_000);
  client.ftp.verbose = false;
  try {
    console.log(`[ftp-restart] connecting to ${HOST}:${PORT} (${SECURE} FTPS)`);
    await client.access({
      host: HOST,
      port: PORT,
      user: USER,
      password: PASS,
      secure: SECURE === 'explicit',
      secureOptions: { rejectUnauthorized: false },
    });
    const remoteTmp = `${BASE_DIR.replace(/\/$/, '')}/tmp`;
    console.log(`[ftp-restart] ensuring ${remoteTmp}`);
    await client.ensureDir(remoteTmp);
    console.log(`[ftp-restart] uploading restart.txt`);
    await client.uploadFrom(tmpFile, 'restart.txt');
    console.log(`[ftp-restart] ✅ Passenger will recycle the Node app on next request.`);
  } catch (err) {
    console.error('[ftp-restart] FAILED:', err.message);
    process.exitCode = 2;
  } finally {
    client.close();
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  }
})();
