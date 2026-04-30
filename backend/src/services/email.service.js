// Email seam — uses nodemailer when SMTP settings are present, otherwise
// logs to console. Config is loaded from PlatformSetting (smtp.*) with
// fallback to SMTP_* env vars.

const settings = require('./settings.service');

let cached = { transporter: null, fromKey: '' };

async function getTransport() {
  const [host, port, user, pass, from] = await Promise.all([
    settings.get('smtp.host'),
    settings.get('smtp.port'),
    settings.get('smtp.user'),
    settings.get('smtp.pass'),
    settings.get('smtp.from'),
  ]);
  const cacheKey = `${host}|${port}|${user}`;
  if (cached.transporter && cached.fromKey === cacheKey) {
    return { transporter: cached.transporter, from: from || 'Uniflo <no-reply@uniflo.com>' };
  }
  if (!host) return { transporter: null, from };
  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port: Number(port || 587),
      secure: Number(port) === 465,
      auth: user ? { user, pass } : undefined,
    });
    cached = { transporter, fromKey: cacheKey };
    return { transporter, from: from || 'Uniflo <no-reply@uniflo.com>' };
  } catch {
    console.warn('[email] nodemailer not installed — falling back to console stub');
    return { transporter: null, from };
  }
}

async function send({ to, subject, html, text }) {
  const { transporter, from } = await getTransport();
  if (!transporter) {
    console.log('\n[email:stub] ---------------------------------');
    console.log(`  from:    ${from || 'Uniflo'}`);
    console.log(`  to:      ${to}`);
    console.log(`  subject: ${subject}`);
    console.log(`  body:    ${text || html?.replace(/<[^>]+>/g, '').slice(0, 200)}`);
    console.log('[email:stub] ---------------------------------\n');
    return { stub: true };
  }
  return transporter.sendMail({ from, to, subject, html, text });
}

// ── Templates ──────────────────────────────────────────────────
const siteUrl = () => process.env.FRONTEND_URL || 'http://localhost:3000';

const wrap = (body) => `
<div style="font-family:Inter,system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
  <div style="background:linear-gradient(135deg,#10b981,#0d9488);color:white;padding:16px 20px;border-radius:12px;">
    <strong>Uniflo</strong>
  </div>
  <div style="padding:24px 4px;color:#0f172a;line-height:1.6;font-size:14px;">
    ${body}
  </div>
  <div style="color:#94a3b8;font-size:11px;border-top:1px solid #e2e8f0;padding-top:12px;">
    You're receiving this because you signed up to Uniflo.
  </div>
</div>`;

const sendWelcome = ({ to, name, businessName }) => send({
  to,
  subject: `Welcome to Uniflo, ${name}!`,
  html: wrap(`
    <h2 style="margin-top:0;">Welcome, ${name} 👋</h2>
    <p>Your tenant <strong>${businessName}</strong> is ready. You have a 14-day free trial — no credit card required.</p>
    <p><a href="${siteUrl()}/dashboard" style="background:#10b981;color:white;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;">Open dashboard</a></p>
  `),
});

const sendTrialEndingSoon = ({ to, name, daysLeft }) => send({
  to,
  subject: `Your Uniflo trial ends in ${daysLeft} days`,
  html: wrap(`
    <h2 style="margin-top:0;">${daysLeft} days left on your trial</h2>
    <p>Hi ${name}, upgrade now to keep your data and avoid service interruption.</p>
    <p><a href="${siteUrl()}/dashboard/billing" style="background:#10b981;color:white;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;">Upgrade plan</a></p>
  `),
});

const sendInvoicePaid = ({ to, name, invoiceNumber, amount, currency = 'INR' }) => send({
  to,
  subject: `Invoice ${invoiceNumber} paid — ${currency} ${amount}`,
  html: wrap(`
    <h2 style="margin-top:0;">Payment received</h2>
    <p>Hi ${name}, we've received your payment for invoice <strong>${invoiceNumber}</strong>.</p>
    <p>Amount: <strong>${currency} ${amount}</strong></p>
  `),
});

const sendPastDue = ({ to, name, graceDays }) => send({
  to,
  subject: 'Payment past due — action required',
  html: wrap(`
    <h2 style="margin-top:0;">Payment past due</h2>
    <p>Hi ${name}, your latest subscription payment failed. Please update your payment method within <strong>${graceDays} days</strong> to avoid suspension.</p>
    <p><a href="${siteUrl()}/dashboard/billing" style="background:#ef4444;color:white;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block;">Update billing</a></p>
  `),
});

module.exports = { send, sendWelcome, sendTrialEndingSoon, sendInvoicePaid, sendPastDue };
