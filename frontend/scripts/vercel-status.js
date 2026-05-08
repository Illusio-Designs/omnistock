#!/usr/bin/env node
/**
 * Watch the latest Vercel deployment and ping with the build error if it fails.
 * Mirrors what backend/scripts/ftp-stderr.js --watch does for the production
 * Node app, but for the Vercel-hosted frontend.
 *
 * Modes:
 *   node scripts/vercel-status.js                # watch latest deployment
 *                                                until terminal state, then exit
 *   node scripts/vercel-status.js --once         # print latest status & exit
 *   node scripts/vercel-status.js --sha <commit> # watch deployment for a
 *                                                specific git commit SHA
 *   node scripts/vercel-status.js --logs         # also dump full build log
 *                                                output regardless of result
 *
 * Setup (one time):
 *   1. Generate a Vercel API token at https://vercel.com/account/tokens
 *      (scope: full account or just this project's team).
 *   2. Find your project id at https://vercel.com/<team>/<project>/settings
 *      (the value labelled "Project ID" near the top).
 *   3. If your project is under a team rather than a personal account, also
 *      grab the team id from https://vercel.com/teams/<team>/settings.
 *   4. Add the values to frontend/.env.local (NOT frontend/.env, which gets
 *      committed elsewhere):
 *
 *      VERCEL_TOKEN=xxxxxxxx
 *      VERCEL_PROJECT_ID=prj_xxxxxxxx
 *      VERCEL_TEAM_ID=team_xxxxxxxx       # optional, only if project is in a team
 *
 *   These are read by this script only — they aren't NEXT_PUBLIC_*, so they
 *   don't end up in the browser bundle.
 *
 * Exit codes:
 *   0  — deployment READY (built & live)
 *   1  — deployment ERROR or CANCELED
 *   2  — could not reach the Vercel API or auth failed
 *   3  — required env vars missing
 *
 * Tip: chain this after a push to fail loudly when a Vercel build breaks.
 *   git push omnistock main && node scripts/vercel-status.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Tiny inline .env loader ────────────────────────────────────────────────
// The frontend doesn't ship with `dotenv`. We only need a handful of vars,
// so a 15-line parser is cheaper than adding a runtime dep.
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip a single layer of matching quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
// Load .env.local first (gitignored, has secrets), then .env (committed defaults)
const ROOT = path.join(__dirname, '..');
loadEnvFile(path.join(ROOT, '.env.local'));
loadEnvFile(path.join(ROOT, '.env'));

// ── Config ────────────────────────────────────────────────────────────────
const TOKEN = process.env.VERCEL_TOKEN || '';
const PROJECT_ID = process.env.VERCEL_PROJECT_ID || '';
const TEAM_ID = process.env.VERCEL_TEAM_ID || '';

if (!TOKEN || !PROJECT_ID) {
  console.error(
    '\n\x1b[31m[vercel-status] missing config.\x1b[0m\n' +
    'Set VERCEL_TOKEN and VERCEL_PROJECT_ID in frontend/.env.local — see the\n' +
    'header of this script for the one-time setup.'
  );
  process.exit(3);
}

const args = process.argv.slice(2);
const argIdx = (flag) => args.indexOf(flag);
const ONCE = args.includes('--once');
const WANT_LOGS = args.includes('--logs');
const SHA_ARG = argIdx('--sha') !== -1 ? args[argIdx('--sha') + 1] : null;

const POLL_INTERVAL_MS = 5_000;
const MAX_WAIT_MS = 15 * 60 * 1000; // 15 min hard cap

const TEAM_QS = TEAM_ID ? `&teamId=${encodeURIComponent(TEAM_ID)}` : '';

// ── ANSI colors ───────────────────────────────────────────────────────────
const c = {
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  blue:   (s) => `\x1b[34m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
};

const STATE_COLOR = {
  READY:     c.green,
  BUILDING:  c.blue,
  INITIALIZING: c.blue,
  QUEUED:    c.yellow,
  ERROR:     c.red,
  CANCELED:  c.dim,
};

// ── HTTP helper with helpful error messages ───────────────────────────────
async function vercel(pathQs) {
  const url = `https://api.vercel.com${pathQs}`;
  let res;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
  } catch (e) {
    console.error(c.red(`[vercel-status] network error: ${e.message}`));
    process.exit(2);
  }
  if (res.status === 401 || res.status === 403) {
    console.error(c.red(`[vercel-status] auth failed (${res.status}) — check VERCEL_TOKEN.`));
    process.exit(2);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(c.red(`[vercel-status] HTTP ${res.status} on ${url}\n${body.slice(0, 400)}`));
    process.exit(2);
  }
  return res.json();
}

// ── Find the deployment we care about ─────────────────────────────────────
async function findDeployment() {
  const params = `projectId=${encodeURIComponent(PROJECT_ID)}&limit=10${TEAM_QS}`;
  const data = await vercel(`/v6/deployments?${params}`);
  const list = data.deployments || [];
  if (!list.length) {
    console.error(c.red('[vercel-status] no deployments found for this project.'));
    process.exit(2);
  }
  if (SHA_ARG) {
    const match = list.find(
      (d) => (d.meta?.githubCommitSha || '').startsWith(SHA_ARG) ||
             (d.meta?.gitlabCommitSha || '').startsWith(SHA_ARG) ||
             (d.meta?.bitbucketCommitSha || '').startsWith(SHA_ARG)
    );
    if (!match) {
      console.error(c.red(
        `[vercel-status] no deployment matched commit ${SHA_ARG} in the last 10. ` +
        'Vercel may not have picked it up yet — try again in 30s.'
      ));
      process.exit(2);
    }
    return match;
  }
  return list[0];
}

// ── Pretty-print state line ───────────────────────────────────────────────
function fmtState(d) {
  const state = d.state || d.readyState || 'UNKNOWN';
  const colorize = STATE_COLOR[state] || ((s) => s);
  const sha = (d.meta?.githubCommitSha || '').slice(0, 7);
  const msg = (d.meta?.githubCommitMessage || '').split('\n')[0].slice(0, 80);
  const url = d.url ? `https://${d.url}` : '';
  return `${colorize(state.padEnd(12))} ${c.dim(sha.padEnd(8))} ${msg}${url ? '  ' + c.dim(url) : ''}`;
}

// ── Build log fetch (used on ERROR) ───────────────────────────────────────
async function fetchEvents(deploymentId) {
  const events = await vercel(`/v3/deployments/${deploymentId}/events?builds=1${TEAM_QS}`);
  return Array.isArray(events) ? events : [];
}

function printEvents(events, { onlyErrors = true } = {}) {
  const interesting = events.filter((e) => {
    if (e.type === 'stderr') return true;
    if (e.type === 'fatal') return true;
    if (!onlyErrors) return true;
    const text = (e.payload?.text || e.text || '').toLowerCase();
    return /error|failed|fatal|cannot find|missing/.test(text);
  });
  const target = interesting.length ? interesting : events.slice(-50);
  for (const e of target) {
    const line = e.payload?.text ?? e.text ?? '';
    const stamped = e.created || e.payload?.date || '';
    const ts = stamped ? new Date(stamped).toISOString().slice(11, 19) : '--:--:--';
    if (e.type === 'stderr' || e.type === 'fatal') {
      console.log(`${c.dim(ts)} ${c.red(line)}`);
    } else {
      console.log(`${c.dim(ts)} ${line}`);
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────
(async () => {
  const initial = await findDeployment();
  const id = initial.uid || initial.id;
  const target = c.bold(id) +
    (initial.meta?.githubCommitSha ? c.dim(`  (sha ${initial.meta.githubCommitSha.slice(0, 7)})`) : '');
  console.log(`[vercel-status] watching deployment ${target}`);

  // Print initial state
  console.log(`  ${fmtState(initial)}`);

  // If --once, just exit with the right code
  if (ONCE) {
    if (WANT_LOGS) {
      const events = await fetchEvents(id);
      printEvents(events, { onlyErrors: false });
    }
    process.exit(terminalExitCode(initial.state || initial.readyState));
  }

  // Already terminal? Don't poll.
  const initialState = initial.state || initial.readyState;
  if (isTerminal(initialState)) {
    return finishUp({ uid: id, state: initialState });
  }

  // Poll loop
  const start = Date.now();
  let lastState = initialState;
  while (Date.now() - start < MAX_WAIT_MS) {
    await sleep(POLL_INTERVAL_MS);
    const fresh = await vercel(`/v13/deployments/${id}?${TEAM_QS.slice(1)}`);
    const state = fresh.state || fresh.readyState;
    if (state !== lastState) {
      console.log(`  ${fmtState(fresh)}`);
      lastState = state;
    }
    if (isTerminal(state)) {
      return finishUp({ uid: id, state, fresh });
    }
  }
  console.log(c.yellow(`[vercel-status] timed out after ${MAX_WAIT_MS / 60000} min — last state: ${lastState}`));
  process.exit(2);

  // ── helpers below ──
  function isTerminal(state) {
    return state === 'READY' || state === 'ERROR' || state === 'CANCELED';
  }
  function terminalExitCode(state) {
    if (state === 'READY') return 0;
    if (state === 'ERROR' || state === 'CANCELED') return 1;
    return 2;
  }
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function finishUp({ uid, state, fresh }) {
    if (state === 'READY') {
      const url = fresh?.alias?.[0] || fresh?.url;
      console.log('\n' + c.green('✓ deployment READY') + (url ? `  → https://${url}` : ''));
      if (WANT_LOGS) {
        console.log(c.dim('─'.repeat(70)));
        printEvents(await fetchEvents(uid), { onlyErrors: false });
      }
      process.exit(0);
    }

    // ERROR or CANCELED — pull build events and print errors
    console.log('\n' + c.red(`✗ deployment ${state}  — pulling build log…`));
    console.log(c.dim('─'.repeat(70)));
    const events = await fetchEvents(uid);
    if (!events.length) {
      console.log(c.yellow('(no events returned — open the deployment in Vercel for full logs)'));
    } else {
      printEvents(events, { onlyErrors: true });
    }
    console.log(c.dim('─'.repeat(70)));
    if (fresh?.url) console.log(c.dim('logs: ') + `https://vercel.com/dashboard?selectedDeployment=${uid}`);
    console.log(c.red(`\n[vercel-status] BUILD FAILED — fix the error above, commit, and push again.`));
    process.exit(1);
  }
})().catch((err) => {
  console.error(c.red(`[vercel-status] unexpected error: ${err.stack || err.message}`));
  process.exit(2);
});
