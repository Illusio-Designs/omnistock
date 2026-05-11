#!/usr/bin/env node
/**
 * Auto-detect the laptop's Wi-Fi IPv4 address and start Expo with that
 * host baked into the QR code / manifest. Saves having to figure out the
 * LAN IP manually every time the router hands out a new DHCP lease.
 *
 * Run via:   npm run start          (= node scripts/start-wifi.js)
 *
 * What it does:
 *   1. Reads os.networkInterfaces() — same source as ipconfig / ifconfig.
 *   2. Picks the first non-loopback IPv4 on a Wi-Fi-ish adapter,
 *      with fallback to any non-internal IPv4 if naming heuristics fail.
 *   3. Sets REACT_NATIVE_PACKAGER_HOSTNAME so Expo broadcasts this
 *      exact host in the manifest. Phone scans QR → connects directly.
 *   4. Spawns `npx expo start` inheriting stdio so the QR + logs show
 *      in this terminal as usual.
 */

const os = require('os');
const { spawn } = require('child_process');

function pickWifiIp() {
  const nets = os.networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(nets)) {
    for (const a of addrs || []) {
      if (a.family !== 'IPv4' && a.family !== 4) continue;
      if (a.internal) continue;
      // 169.254.x is APIPA (link-local, no real network) — skip
      if (a.address.startsWith('169.254.')) continue;
      candidates.push({ name, address: a.address });
    }
  }

  if (candidates.length === 0) return null;

  // Prefer interfaces that look like Wi-Fi over Ethernet / vEthernet /
  // virtual switches. Cross-platform name patterns.
  const isWifi = (n) =>
    /wi[-_]?fi|wlan|wireless|airport|en0|en1/i.test(n);
  const wifi = candidates.find((c) => isWifi(c.name));
  return (wifi || candidates[0]).address;
}

const ip = pickWifiIp();
if (!ip) {
  console.error('[start-wifi] could not detect a non-loopback IPv4 address.');
  console.error('             Make sure Wi-Fi is connected and try again.');
  process.exit(1);
}

console.log(`\n[start-wifi] using host ${ip} (auto-detected)\n`);

// Pass-through any extra CLI args (e.g. --clear, --dev-client) to expo start.
const passthrough = process.argv.slice(2);

// `shell: true` so .cmd shim resolution works on Windows. Args are
// hard-coded above (no user input), so the shell-injection warning
// from Node 20+ doesn't apply here.
const child = spawn('npx', ['expo', 'start', ...passthrough], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: ip },
});

child.on('exit', (code) => process.exit(code ?? 0));
