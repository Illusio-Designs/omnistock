const crypto = require('crypto');

const ALGO = 'aes-256-gcm';

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length !== 64) {
    throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  }
  return Buffer.from(key, 'hex');
}

// Encrypt a plain JS object → returns JSON-serialisable object { iv, tag, data }
function encryptCredentials(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const json = JSON.stringify(obj);
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex'),
    data: encrypted.toString('hex'),
  };
}

// Decrypt the stored { iv, tag, data } object → original plain JS object
function decryptCredentials(stored) {
  if (!stored || !stored.iv || !stored.data) return null;
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(stored.iv, 'hex'));
  decipher.setAuthTag(Buffer.from(stored.tag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(stored.data, 'hex')),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString('utf8'));
}

// Return a safe copy of credentials with values masked for API responses
function maskCredentials(stored) {
  if (!stored) return null;
  if (!stored.iv) {
    // Unencrypted legacy — mask in-place
    return Object.fromEntries(
      Object.entries(stored).map(([k, v]) => [
        k,
        typeof v === 'string' ? `${'*'.repeat(Math.max(0, v.length - 4))}${v.slice(-4)}` : v,
      ])
    );
  }
  return { encrypted: true, hint: 'Credentials are stored encrypted.' };
}

module.exports = { encryptCredentials, decryptCredentials, maskCredentials };
