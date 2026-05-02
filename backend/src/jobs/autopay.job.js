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
  // Wallets that need a top-up + have at least one default saved token.
  const rows = await db('tenant_wallets as w')
    .leftJoin('tenant_payment_methods as m', function () {
      this.on('m.tenantId', '=', 'w.tenantId')
        .andOn('m.isDefault', '=', db.raw('1'))
        .andOn('m.isActive', '=', db.raw('1'));
    })
    .leftJoin('tenants as t', 't.id', 'w.tenantId')
    .leftJoin('users as u', function () {
      this.on('u.tenantId', '=', 'w.tenantId').andOn('u.isPlatformAdmin', '=', db.raw('0'));
    })
    .where('w.autoTopupEnabled', 1)
    .andWhere(function () {
      this.whereRaw('w.balance < w.autoTopupTriggerBelow');
    })
    .andWhere(function () {
      this.where('m.isActive', 1).andWhere('m.providerTokenId', 'is not', null);
    })
    .select(
      'w.tenantId', 'w.balance', 'w.autoTopupAmount', 'w.autoTopupTriggerBelow',
      'm.id as methodId', 'm.providerTokenId as token', 'm.providerCustomerId as customerId',
      'm.failureCount', 'm.lastFailureAt',
      't.businessName', 't.ownerEmail',
      db.raw('MIN(u.email) as ownerUserEmail'),
    )
    .groupBy('w.tenantId', 'w.balance', 'w.autoTopupAmount', 'w.autoTopupTriggerBelow',
             'm.id', 'm.providerTokenId', 'm.providerCustomerId', 'm.failureCount', 'm.lastFailureAt',
             't.businessName', 't.ownerEmail');

  // Apply cooldown filter in JS so we don't have to fight raw SQL.
  const now = Date.now();
  return rows.filter((r) => {
    if (!r.lastFailureAt) return true;
    const cooldown = backoffMinutes(r.failureCount || 0) * 60_000;
    return now - new Date(r.lastFailureAt).getTime() > cooldown;
  });
}

async function chargeOne(row) {
  const amount = Number(row.autoTopupAmount || 0);
  if (!amount || amount <= 0) {
    console.warn(`[autopay] tenant ${row.tenantId} has autoTopupEnabled but no autoTopupAmount`);
    return { skipped: true, reason: 'no amount configured' };
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
    console.warn(`[autopay] charge failed for tenant ${row.tenantId}: ${reason}`);
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
    .then((r) => { console.log('[autopay] done', r); process.exit(0); })
    .catch((e) => { console.error(e); process.exit(1); });
}

module.exports = { runAutopayJob, findCandidates };
