// Wallet auto-topup job
//
// Walks every tenant_wallet with `autoTopupEnabled=1` and balance below
// `autoTopupTriggerBelow`, finds the default saved Razorpay token, and
// charges it for `autoTopupAmount`. On success we credit the wallet via
// the standard wallet.topup() path so the ledger stays consistent.
//
// We rely on Razorpay's webhook (payment.captured) as the source of truth
// for credit when both the synchronous response and the webhook arrive —
// wallet.topup is idempotent on `paymentRef`, so the first one wins.
//
// Runs every CRON_AUTOPAY_MIN minutes (default 15) when CRON_LEADER=true.

const db = require('../utils/db');
const logger = require('../utils/logger');
const wallet = require('../services/wallet.service');
const { chargeRecurringToken, getCreds } = require('../services/payment.service');

// Cooldown after a failed charge so we don't hammer Razorpay (or the user's
// card) when something is off. Each failure increments failureCount; we
// back off exponentially via lastFailureAt.
function backoffMinutes(failureCount) {
  if (failureCount <= 1) return 60;       // 1h
  if (failureCount === 2) return 6 * 60;  // 6h
  if (failureCount === 3) return 24 * 60; // 1d
  return 7 * 24 * 60;                     // 1w
}

async function findCandidates() {
  // Step 1: wallets that need a top-up and have autopay enabled.
  const wallets = await db('tenant_wallets as w')
    .leftJoin('tenants as t', 't.id', 'w.tenantId')
    .where('w.autoTopupEnabled', 1)
    .whereRaw('w.balance < w.autoTopupTriggerBelow')
    .select('w.tenantId', 'w.balance', 'w.autoTopupAmount', 'w.autoTopupTriggerBelow',
            't.businessName', 't.ownerEmail');

  if (!wallets.length) return [];

  // Step 2: for each tenant fetch ONE default active method. Doing this as
  // a separate per-row query keeps the SQL trivial and correct even when
  // (race condition) more than one row has isDefault=1; we just take the
  // most recently saved one.
  const tenantIds = wallets.map((w) => w.tenantId);
  const methods = await db('tenant_payment_methods')
    .whereIn('tenantId', tenantIds)
    .andWhere({ isDefault: 1, isActive: 1 })
    .whereNotNull('providerTokenId')
    .select('id as methodId', 'tenantId', 'providerTokenId as token',
            'providerCustomerId as customerId', 'failureCount', 'lastFailureAt')
    .orderBy('createdAt', 'desc');

  // Pick the first default method per tenant (orderBy desc → latest).
  const methodByTenant = new Map();
  for (const m of methods) {
    if (!methodByTenant.has(m.tenantId)) methodByTenant.set(m.tenantId, m);
  }

  const now = Date.now();
  const out = [];
  for (const w of wallets) {
    const m = methodByTenant.get(w.tenantId);
    if (!m) continue;
    if (m.lastFailureAt) {
      const cooldown = backoffMinutes(m.failureCount || 0) * 60_000;
      if (now - new Date(m.lastFailureAt).getTime() <= cooldown) continue;
    }
    out.push({ ...w, ...m });
  }
  return out;
}

async function chargeOne(row) {
  const amount = Number(row.autoTopupAmount || 0);
  if (!amount || amount <= 0) {
    logger.warn(`[autopay] tenant ${row.tenantId} has autoTopupEnabled but no autoTopupAmount`);
    return { skipped: true, reason: 'no amount configured' };
  }
  // Razorpay rejects recurring charges without a customer_id. If the saved
  // method row is missing one (rare — usually a token captured before the
  // payment.captured webhook hardened the persistence path), don't try to
  // charge — flag the row inactive so future runs skip it cleanly.
  if (!row.customerId) {
    await db('tenant_payment_methods')
      .where({ id: row.methodId })
      .update({
        isActive: 0,
        lastFailureAt: new Date(),
        lastFailureReason: 'Missing Razorpay customer_id — re-save the card',
        updatedAt: new Date(),
      });
    return { skipped: true, tenantId: row.tenantId, reason: 'no customerId on saved method' };
  }

  try {
    const { payment } = await chargeRecurringToken({
      token: row.token,
      customerId: row.customerId,
      amount,
      currency: 'INR',
      description: 'Wallet auto top-up',
      notes: {
        tenantId: row.tenantId,
        purpose: 'autopay',
        amount: String(amount),
        email: row.ownerEmail || row.ownerUserEmail || '',
      },
    });

    // Credit the wallet immediately. The webhook is idempotent so a
    // second credit won't happen.
    const credit = await wallet.topup(row.tenantId, amount, {
      paymentRef: payment.id,
      description: 'Auto top-up (Razorpay)',
      type: 'TOPUP',
    });

    // Reset failure counter + record success
    await db('tenant_payment_methods')
      .where({ id: row.methodId })
      .update({
        failureCount: 0,
        lastUsedAt: new Date(),
        lastFailureReason: null,
        updatedAt: new Date(),
      });

    return { ok: true, tenantId: row.tenantId, amount, paymentId: payment.id, balanceAfter: credit.balanceAfter };
  } catch (err) {
    const reason = err?.error?.description || err?.message || 'Charge failed';
    await db('tenant_payment_methods')
      .where({ id: row.methodId })
      .update({
        failureCount: db.raw('failureCount + 1'),
        lastFailureAt: new Date(),
        lastFailureReason: reason,
        updatedAt: new Date(),
      });
    logger.warn(`[autopay] charge failed for tenant ${row.tenantId}: ${reason}`);
    return { ok: false, tenantId: row.tenantId, error: reason };
  }
}

async function runAutopayJob() {
  // Don't even bother if we're in stub/no-creds mode — autopay needs a real key.
  const { isLive } = await getCreds();
  if (!isLive) {
    return { skipped: true, reason: 'razorpay not configured (stub mode)' };
  }

  const candidates = await findCandidates();
  if (!candidates.length) return { processed: 0 };

  const results = [];
  for (const row of candidates) {
    results.push(await chargeOne(row));
  }
  console.log(`[autopay] processed ${results.length} wallets`, results.map(r => ({ tenantId: r.tenantId, ok: r.ok })));
  return { processed: results.length, results };
}

if (require.main === module) {
  runAutopayJob()
    .then((r) => { logger.info({ detail: r }, '[autopay] done'); process.exit(0); })
    .catch((e) => { logger.error(e); process.exit(1); });
}

module.exports = { runAutopayJob, findCandidates };
