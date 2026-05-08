#!/usr/bin/env node
/**
 * Pulls and prints /Backend/stderr.log — the server-side error log
 * Phusion Passenger writes when the Node app fails to boot or crashes.
 *
 * Modes:
 *   node scripts/ftp-stderr.js                # tail the last ~80 lines
 *   node scripts/ftp-stderr.js --full         # download and print the
 *                                              entire log
 *   node scripts/ftp-stderr.js --since-restart # show only entries
 *                                              after the most recent
 *                                              "[seed]"/"started" marker
 *   node scripts/ftp-stderr.js --truncate     # also wipe the log on
 *                                              server after reading
 *                                              (handy after a clean run)
 *   node scripts/ftp-stderr.js --watch        # poll every 3s until
 *                                              app comes up healthy or
 *                                              60s timeout
 *
 * Exit codes:
 *   0  — no recent error markers found in tail
 *   1  — stack-trace markers detected (Error:, MODULE_NOT_FOUND,
 *        SyntaxError, etc.) — re-deploy needed
 *   2  — could not reach FTP server
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
const REMOTE_LOG = `${BASE_DIR.replace(/\/$/, '')}/stderr.log`;

const args = new Set(process.argv.slice(2));
const FULL = args.has('--full');
const TRUNCATE = args.has('--truncate');
const WATCH = args.has('--watch');
const SINCE_RESTART = args.has('--since-restart');
const TAIL_LINES = 80;

if (!USER || !PASS) {
  console.error('ERROR: FTP_USER / FTP_PASSWORD must be set in backend/.env');
  process.exit(2);
}

// Patterns that mean "the app crashed". Used both for exit-code semantics
// and to highlight matching lines in the output.
const ERROR_PATTERNS = [
  /MODULE_NOT_FOUND/i,
  /Cannot find module/i,
  /SyntaxError/,
  /TypeError/,
  /ReferenceError/,
  /Error:.*at\s/,                 // a stack trace
  /UnhandledPromiseRejection/i,
  /listen EADDRINUSE/i,
  /ECONNREFUSED/i,
  /ER_ACCESS_DENIED/i,
];

function hasErrors(text) {
  return ERROR_PATTERNS.some((re) => re.test(text));
}

function colorize(line) {
  if (hasErrors(line)) return `\x1b[31m${line}\x1b[0m`; // red
  if (/Warning|deprecated/i.test(line)) return `\x1b[33m${line}\x1b[0m`; // yellow
  return line;
}

async function makeClient() {
  const c = new ftp.Client(20_000);
  c.ftp.verbose = false;
  await c.access({
    host: HOST, port: PORT, user: USER, password: PASS,
    secure: SECURE === 'explicit',
    secureOptions: { rejectUnauthorized: false },
  });
  return c;
}

async function downloadLog(client) {
  const tmp = path.join(os.tmpdir(), `kartriq-stderr-${Date.now()}.log`);
  try {
    await client.downloadTo(tmp, REMOTE_LOG);
    const content = fs.readFileSync(tmp, 'utf8');
    fs.unlinkSync(tmp);
    return content;
  } catch (e) {
    if (/550/.test(e.message)) return ''; // file doesn't exist yet — fine
    throw e;
  }
}

async function truncate(client) {
  // Upload an empty file to overwrite. Phusion Passenger keeps writing
  // to whatever inode is at the path, so this is enough — no need to
  // restart Node.
  const tmp = path.join(os.tmpdir(), `kartriq-empty-${Date.now()}.log`);
  fs.writeFileSync(tmp, '');
  try {
    await client.uploadFrom(tmp, REMOTE_LOG.replace(/^.*\//, ''));
    // Wait — the path needs to be relative to the cwd. Let me redo:
  } finally {
    fs.unlinkSync(tmp);
  }
}

// Cleaner truncate that uses an absolute remote path
async function truncateAbsolute(client) {
  const tmpLocal = path.join(os.tmpdir(), `kartriq-empty-${Date.now()}.log`);
  fs.writeFileSync(tmpLocal, '');
  try {
    // basic-ftp's uploadFrom defaults to cwd; cd to the parent first.
    const remoteDir = REMOTE_LOG.substring(0, REMOTE_LOG.lastIndexOf('/'));
    const remoteName = REMOTE_LOG.substring(REMOTE_LOG.lastIndexOf('/') + 1);
    await client.ensureDir(remoteDir);
    await client.uploadFrom(tmpLocal, remoteName);
  } finally {
    fs.unlinkSync(tmpLocal);
  }
}

function tail(text, n) {
  const lines = text.split(/\r?\n/);
  if (lines.length <= n) return text;
  return lines.slice(lines.length - n).join('\n');
}

function sliceSinceRestart(text) {
  // Each Passenger boot is preceded by a "Node.js v..." or our own
  // "[bootstrap] " marker. Find the LAST such marker and return
  // everything from there.
  const lines = text.split(/\r?\n/);
  let cut = 0;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/^Node\.js v\d|^\[bootstrap\] |kartriq.*started|listening on/i.test(lines[i])) {
      cut = i;
      break;
    }
  }
  return lines.slice(cut).join('\n');
}

async function once(client) {
  const content = await downloadLog(client);
  if (!content || content.trim() === '') {
    console.log('[ftp-stderr] log is empty — no errors to report. ✓');
    return { content: '', errored: false };
  }
  const view = FULL ? content : SINCE_RESTART ? sliceSinceRestart(content) : tail(content, TAIL_LINES);
  console.log(`[ftp-stderr] ${REMOTE_LOG} (${content.length} bytes total, showing ${view.split('\n').length} lines):`);
  console.log('─'.repeat(60));
  for (const line of view.split('\n')) console.log(colorize(line));
  console.log('─'.repeat(60));
  const errored = hasErrors(view);
  if (errored) {
    console.log('\x1b[31m[ftp-stderr] ⚠ stack-trace markers found in tail — investigate above\x1b[0m');
  } else {
    console.log('[ftp-stderr] no error markers in the tail. ✓');
  }
  return { content, errored };
}

(async () => {
  let client;
  try {
    client = await makeClient();
  } catch (e) {
    console.error('[ftp-stderr] could not reach FTP:', e.message);
    process.exit(2);
  }

  try {
    if (WATCH) {
      const deadline = Date.now() + 60_000;
      console.log('[ftp-stderr] watching stderr.log for 60s…');
      let lastSize = -1;
      while (Date.now() < deadline) {
        const { content, errored } = await once(client);
        if (errored) {
          process.exit(1);
        }
        // Probe /health — if it answers cleanly + uptime < 30s, we just
        // restarted and the boot completed. Stop watching.
        try {
          const https = require('https');
          await new Promise((resolve, reject) => {
            https.get('https://api.kartriq.com/health', (res) => {
              let body = '';
              res.on('data', (c) => (body += c));
              res.on('end', () => {
                try {
                  const j = JSON.parse(body);
                  if (j.status === 'ok' && Number(j.uptime) >= 0) {
                    console.log(`[ftp-stderr] /health ok (uptime ${j.uptime}s) — boot looks healthy.`);
                    resolve();
                  } else reject(new Error('unhealthy'));
                } catch (err) { reject(err); }
              });
            }).on('error', reject);
          });
          // Healthy + no errors in stderr — stop early
          process.exit(0);
        } catch (_) {
          // not yet healthy — keep watching
        }
        if (content.length === lastSize) {
          // no new output; pause a bit longer
          await new Promise((r) => setTimeout(r, 3000));
        } else {
          lastSize = content.length;
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      console.log('[ftp-stderr] watch timed out without /health responding healthy.');
      process.exit(1);
    } else {
      const { errored } = await once(client);
      if (TRUNCATE) {
        console.log('[ftp-stderr] truncating remote log…');
        await truncateAbsolute(client);
        console.log('[ftp-stderr] log cleared.');
      }
      process.exit(errored ? 1 : 0);
    }
  } finally {
    try { client.close(); } catch (_) {}
  }
})();
