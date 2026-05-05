#!/usr/bin/env node
/**
 * FTP connection + directory listing test.
 *
 * Usage:
 *   FTP_PASSWORD='...' node scripts/ftp-test.js
 *
 * Reads FTP_HOST / FTP_USER / FTP_PORT / FTP_PASSWORD from env,
 * with sensible defaults baked in so you can just set the password.
 */

const tls = require('tls');
const net = require('net');

const HOST = process.env.FTP_HOST || 'ftp.kartriq.com';
const PORT = Number(process.env.FTP_PORT || 21);
const USER = process.env.FTP_USER || 'Rishi@kartriq.com';
const PASS = process.env.FTP_PASSWORD || '';
const SECURE = (process.env.FTP_SECURE || 'explicit').toLowerCase(); // 'explicit' | 'none'

if (!PASS) {
  console.error('ERROR: FTP_PASSWORD env var is required.');
  console.error('Run with:  FTP_PASSWORD="your-password" node scripts/ftp-test.js');
  process.exit(1);
}

function log(msg) {
  console.log(`[ftp-test] ${msg}`);
}

class FtpClient {
  constructor({ host, port, user, pass, secure }) {
    this.host = host;
    this.port = port;
    this.user = user;
    this.pass = pass;
    this.secure = secure;
    this.ctrl = null;
    this.buffer = '';
    this.queue = [];
  }

  _attachReader(sock) {
    sock.on('data', (chunk) => {
      this.buffer += chunk.toString('utf8');
      while (true) {
        const lines = this.buffer.split(/\r?\n/);
        // keep the last partial line in buffer
        this.buffer = lines.pop();
        if (!lines.length) break;
        for (const line of lines) {
          if (!line) continue;
          // multi-line response: "123-..." continues until "123 ..."
          const m = line.match(/^(\d{3})([ -])(.*)$/);
          if (!m) continue;
          const code = Number(m[1]);
          const isFinal = m[2] === ' ';
          if (!this._pending) this._pending = { code, lines: [line] };
          else this._pending.lines.push(line);
          if (isFinal && this._pending.code === code) {
            const resp = this._pending;
            this._pending = null;
            const cb = this.queue.shift();
            if (cb) cb(null, resp);
          }
        }
      }
    });
    sock.on('error', (err) => {
      const cb = this.queue.shift();
      if (cb) cb(err);
    });
  }

  _send(cmd) {
    return new Promise((resolve, reject) => {
      this.queue.push((err, resp) => (err ? reject(err) : resolve(resp)));
      this.ctrl.write(cmd + '\r\n');
    });
  }

  _waitGreeting() {
    return new Promise((resolve, reject) => {
      this.queue.push((err, resp) => (err ? reject(err) : resolve(resp)));
    });
  }

  async connect() {
    log(`connecting to ${this.host}:${this.port} (TCP)`);
    await new Promise((resolve, reject) => {
      this.ctrl = net.createConnection({ host: this.host, port: this.port }, resolve);
      this.ctrl.once('error', reject);
      this.ctrl.setTimeout(30000);
    });
    this._attachReader(this.ctrl);
    const greet = await this._waitGreeting();
    log(`greeting: ${greet.lines.join(' | ')}`);

    if (this.secure === 'explicit') {
      log('upgrading to TLS via AUTH TLS');
      const auth = await this._send('AUTH TLS');
      log(`AUTH TLS -> ${auth.lines.join(' | ')}`);
      if (auth.code !== 234 && auth.code !== 200) {
        throw new Error(`AUTH TLS failed: ${auth.lines.join(' | ')}`);
      }
      const tlsSock = tls.connect({
        socket: this.ctrl,
        servername: this.host,
        rejectUnauthorized: false,
      });
      await new Promise((resolve, reject) => {
        tlsSock.once('secureConnect', resolve);
        tlsSock.once('error', reject);
      });
      this.ctrl = tlsSock;
      this.queue = [];
      this._pending = null;
      this.buffer = '';
      this._attachReader(this.ctrl);
      log('TLS handshake complete');
    }

    log(`USER ${this.user}`);
    const u = await this._send(`USER ${this.user}`);
    log(`-> ${u.lines.join(' | ')}`);
    if (u.code !== 331 && u.code !== 230) throw new Error(`USER failed: ${u.lines.join(' | ')}`);

    if (u.code === 331) {
      const p = await this._send(`PASS ${this.pass}`);
      log(`PASS -> ${p.lines.join(' | ')}`);
      if (p.code !== 230 && p.code !== 202) throw new Error(`PASS failed: ${p.lines.join(' | ')}`);
    }

    if (this.secure === 'explicit') {
      await this._send('PBSZ 0');
      const prot = await this._send('PROT P');
      log(`PROT P -> ${prot.lines.join(' | ')}`);
    }

    await this._send('TYPE I');
  }

  async pwd() {
    const r = await this._send('PWD');
    const m = r.lines[0].match(/"([^"]+)"/);
    return m ? m[1] : null;
  }

  async cwd(dir) {
    const r = await this._send(`CWD ${dir}`);
    if (r.code >= 300) throw new Error(`CWD ${dir} failed: ${r.lines.join(' | ')}`);
  }

  async _openPasv() {
    // Prefer EPSV (works over IPv4/v6 + TLS reliably)
    let host = this.host;
    let port;
    const epsv = await this._send('EPSV');
    if (epsv.code === 229) {
      const m = epsv.lines[0].match(/\(\|\|\|(\d+)\|\)/);
      if (!m) throw new Error(`bad EPSV reply: ${epsv.lines.join(' | ')}`);
      port = Number(m[1]);
    } else {
      const pasv = await this._send('PASV');
      if (pasv.code !== 227) throw new Error(`PASV failed: ${pasv.lines.join(' | ')}`);
      const m = pasv.lines[0].match(/(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/);
      if (!m) throw new Error(`bad PASV reply: ${pasv.lines.join(' | ')}`);
      host = `${m[1]}.${m[2]}.${m[3]}.${m[4]}`;
      port = (Number(m[5]) << 8) + Number(m[6]);
    }

    const raw = net.createConnection({ host, port });
    if (this.secure !== 'explicit') return raw;
    return new Promise((resolve, reject) => {
      raw.once('connect', () => {
        const sec = tls.connect({
          socket: raw,
          servername: this.host,
          rejectUnauthorized: false,
        });
        sec.once('secureConnect', () => resolve(sec));
        sec.once('error', reject);
      });
      raw.once('error', reject);
    });
  }

  async list(path = '') {
    const data = await this._openPasv();
    const chunks = [];
    data.on('data', (c) => chunks.push(c));
    const done = new Promise((resolve, reject) => {
      data.once('end', resolve);
      data.once('error', reject);
    });
    const cmd = path ? `LIST ${path}` : 'LIST';
    const r = await this._send(cmd);
    if (r.code >= 400) throw new Error(`${cmd} failed: ${r.lines.join(' | ')}`);
    await done;
    // wait for the 226 transfer complete
    await new Promise((resolve) => {
      this.queue.push(() => resolve());
    });
    return Buffer.concat(chunks).toString('utf8');
  }

  async quit() {
    try {
      await this._send('QUIT');
    } catch (_) {}
    try {
      this.ctrl.end();
    } catch (_) {}
  }
}

(async () => {
  const c = new FtpClient({ host: HOST, port: PORT, user: USER, pass: PASS, secure: SECURE });
  try {
    await c.connect();
    const cwd = await c.pwd();
    console.log('\n================ REMOTE DIRECTORY ================');
    console.log(`PWD: ${cwd}`);
    console.log('--- LIST (root) ---');
    const root = await c.list();
    console.log(root.trim() || '(empty)');

    // Walk 1 level deep into directories that look interesting
    const lines = root.split(/\r?\n/).filter(Boolean);
    const dirs = lines
      .map((l) => {
        const parts = l.trim().split(/\s+/);
        const name = parts.slice(8).join(' ');
        return l.startsWith('d') ? name : null;
      })
      .filter(Boolean)
      .filter((n) => n && n !== '.' && n !== '..');

    for (const d of dirs.slice(0, 10)) {
      console.log(`\n--- LIST /${d} ---`);
      try {
        const sub = await c.list(d);
        console.log(sub.trim() || '(empty)');
      } catch (e) {
        console.log(`(could not list: ${e.message})`);
      }
    }
    console.log('==================================================\n');

    log('OK — connection + listing succeeded');
    await c.quit();
    process.exit(0);
  } catch (err) {
    console.error('\n[ftp-test] FAILED:', err.message);
    try {
      await c.quit();
    } catch (_) {}
    process.exit(2);
  }
})();
