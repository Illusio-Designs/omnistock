// RFC 6238 TOTP implementation — used for 2FA.
// Compatible with Google Authenticator, Authy, 1Password, Microsoft Authenticator.
//
// Uses only Node's built-in `crypto` — no external deps so the install
// surface stays small.

const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;
const ALGORITHM = 'sha1';

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(str) {
  const cleaned = str.replace(/=+$/, '').replace(/\s/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx < 0) throw new Error(`Invalid base32 char: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Generate a fresh 20-byte (160-bit) base32-encoded TOTP secret. */
function generateSecret() {
  const buf = crypto.randomBytes(20);
  return base32Encode(buf);
}

function hotp(secret, counter) {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  // counter is < 2^53 in practice — write as two 32-bit halves
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter % 0x100000000, 4);
  const hmac = crypto.createHmac(ALGORITHM, key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** DIGITS).padStart(DIGITS, '0');
}

/** Current TOTP code for `secret` (default: now). */
function generateTOTP(secret, atUnixSeconds = Math.floor(Date.now() / 1000)) {
  return hotp(secret, Math.floor(atUnixSeconds / STEP_SECONDS));
}

/**
 * Verify a user-supplied 6-digit token. Accepts the previous, current, and
 * next 30-second window to tolerate small clock drift.
 */
function verifyTOTP(secret, token, atUnixSeconds = Math.floor(Date.now() / 1000)) {
  if (!token || !/^\d{6}$/.test(String(token))) return false;
  const counter = Math.floor(atUnixSeconds / STEP_SECONDS);
  for (let delta = -1; delta <= 1; delta++) {
    const expected = hotp(secret, counter + delta);
    // Constant-time compare to avoid a timing oracle
    if (expected.length === token.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(token)))) {
      return true;
    }
  }
  return false;
}

/**
 * otpauth:// URL the authenticator app scans to import the secret.
 * issuer = "Kartriq", account = user email.
 */
function otpauthUrl({ secret, account, issuer = 'Kartriq' }) {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

module.exports = { generateSecret, generateTOTP, verifyTOTP, otpauthUrl };
