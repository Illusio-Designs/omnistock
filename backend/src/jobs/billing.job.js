// Billing cron — run daily (e.g. 02:00).
// Responsibilities:
//   1. Roll forward subscriptions whose currentPeriodEnd has passed
//   2. Snapshot UsageMeter -> BillingInvoice for the ended period
//   3. Mark expired trials as PAST_DUE
//   4. Suspend tenants that stay PAST_DUE > GRACE_DAYS
//
// Triggers:
//   - `node src/jobs/billing.job.js`  (one-shot, for crontab / GitHub Actions)
//   - require('./jobs/billing.job').runBillingJob()  (from an in-process scheduler)

const prisma = require('../utils/prisma');
const { sendTrialEndingSoon, sendPastDue, sendInvoicePaid } = require('../services/email.service');
const settings = require('../services/settings.service');

async function getGraceDays() {
  const v = await settings.get('billing.graceDays');
  return parseInt(v || '7', 10);
}

// Send a reminder to tenants whose trial ends in N days
async function sendTrialReminders() {
  const target = new Date();
  target.setDate(target.getDate() + 3); // 3-day warning
  const soon = new Date(target); soon.setHours(23, 59, 59, 999);
  const start = new Date(target); start.setHours(0, 0, 0, 0);

  const trials = await prisma.subscription.findMany({
    where: { status: 'TRIALING', trialEndsAt: { gte: start, lte: soon } },
    include: { tenant: true },
  });
  let sent = 0;
  for (const s of trials) {
    await sendTrialEndingSoon({
      to: s.tenant.ownerEmail,
      name: s.tenant.ownerName || 'there',
      daysLeft: 3,
    }).catch(() => {});
    sent++;
  }
  return { trialReminders: sent };
}

function nextPeriodEnd(start, cycle) {
  const d = new Date(start);
  if (cycle === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

function periodKey(d) {
  return d.toISOString().slice(0, 7); // YYYY-MM
}

async function snapshotInvoiceForSubscription(sub, period) {
  const tenantId = sub.tenantId;
  const plan = sub.plan;
  const base = Number(sub.billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice);

  // Compute PAYG overage from usage meter vs plan limits
  const meters = await prisma.usageMeter.findMany({
    where: { tenantId, period },
  });

  let overageAmount = 0;
  const lineItems = [{ type: 'base', planCode: plan.code, amount: base }];

  if (sub.payAsYouGo) {
    const rates = plan.meteredRates || {};
    for (const m of meters) {
      if (m.metric === 'orders' && plan.maxOrdersPerMonth !== null) {
        const over = Math.max(0, m.count - plan.maxOrdersPerMonth);
        if (over > 0 && rates.extraOrders) {
          const amt = over * Number(rates.extraOrders);
          overageAmount += amt;
          lineItems.push({ type: 'overage', metric: 'orders', qty: over, rate: rates.extraOrders, amount: amt });
        }
      }
    }
  }

  const totalAmount = base + overageAmount;
  const invoiceNumber = `INV-${tenantId.slice(0, 6)}-${period}-${Date.now()}`;

  return prisma.billingInvoice.create({
    data: {
      tenantId,
      subscriptionId: sub.id,
      invoiceNumber,
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
      baseAmount: base,
      overageAmount,
      totalAmount,
      currency: plan.currency || 'INR',
      status: 'DUE',
      lineItems,
    },
  });
}

// Lazy-required to avoid circular imports
function _payment() { return require('../services/payment.service'); }
function _db() { return require('../utils/db'); }

// Find the tenant's default saved Razorpay token (used for both wallet
// auto-topup and subscription auto-renewal — same payment method, two uses).
async function getDefaultMethod(tenantId) {
  const db = _db();
  const row = await db('tenant_payment_methods')
    .where({ tenantId, isActive: 1, isDefault: 1 })
    .whereNotNull('providerTokenId')
    .first();
  return row || null;
}

// Charge the saved token for the next period and roll forward on success.
// Returns { ok, paymentId, reason } so the caller can audit.
async function autoRenewSubscription(sub) {
  const method = await getDefaultMethod(sub.tenantId);
  if (!method) return { ok: false, reason: 'no default payment method' };

  const amount = Number(sub.billingCycle === 'YEARLY' ? sub.plan.yearlyPrice : sub.plan.monthlyPrice);
  if (!amount || amount <= 0) {
    // Free plan — just roll forward without a charge
    return { ok: true, free: true };
  }

  try {
    const { payment } = await _payment().chargeRecurringToken({
      token: method.providerTokenId,
      customerId: method.providerCustomerId,
      amount,
      currency: sub.plan.currency || 'INR',
      description: `${sub.plan.name} renewal (${sub.billingCycle})`,
      notes: {
        tenantId: sub.tenantId,
        subscriptionId: sub.id,
        planCode: sub.plan.code,
        billingCycle: sub.billingCycle,
        purpose: 'plan-renewal',
      },
    });

    // Reset failure counter
    await _db()('tenant_payment_methods')
      .where({ id: method.id })
      .update({ failureCount: 0, lastUsedAt: new Date(), updatedAt: new Date() });

    return { ok: true, paymentId: payment.id };
  } catch (err) {
    const reason = err?.error?.description || err?.message || 'Charge failed';
    await _db()('tenant_payment_methods')
      .where({ id: method.id })
      .update({
        failureCount: _db().raw('failureCount + 1'),
        lastFailureAt: new Date(),
        lastFailureReason: reason,
        updatedAt: new Date(),
      });
    return { ok: false, reason };
  }
}

async function rollForwardSubscriptions() {
  const now = new Date();
  const due = await prisma.subscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'TRIALING'] },
      currentPeriodEnd: { lte: now },
    },
    include: { plan: true },
  });

  let rolled = 0, invoiced = 0, autoRenewed = 0, autoRenewFailed = 0, pastDue = 0;
  for (const sub of due) {
    try {
      const isFree = !Number(sub.billingCycle === 'YEARLY' ? sub.plan.yearlyPrice : sub.plan.monthlyPrice);
      // Snapshot an invoice for the period that just ended (skip on trial / free)
      let inv = null;
      if (sub.status === 'ACTIVE' && !isFree) {
        inv = await snapshotInvoiceForSubscription(sub, periodKey(sub.currentPeriodStart));
        invoiced++;
      }

      // Auto-renew path — try to charge the saved token before extending the period.
      let charge = null;
      if (sub.autoRenew && !isFree) {
        charge = await autoRenewSubscription(sub);

        // Mark the invoice we just snapshotted as paid on success. If this
        // step throws, the customer was charged but the invoice would stay
        // DUE — log loudly so reconciliation can repair, don't silently
        // swallow.
        if (charge.ok && inv && charge.paymentId) {
          try {
            await prisma.billingInvoice.update({
              where: { id: inv.id },
              data: { status: 'PAID', paidAt: new Date(), providerRef: charge.paymentId },
            });
          } catch (invErr) {
            console.error(`[billing.job] CRITICAL: charged ${charge.paymentId} for sub ${sub.id} but invoice update failed:`, invErr.message);
            // Best-effort: stash the payment id on the subscription itself so
            // a reconciliation script can pair it back up later.
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { providerSubscriptionId: charge.paymentId },
            }).catch(() => {});
          }
        }
      }

      const charged = charge && charge.ok;
      const renewBlocked = sub.autoRenew && charge && !charge.ok;

      const newStart = new Date(sub.currentPeriodEnd);
      const newEnd = nextPeriodEnd(newStart, sub.billingCycle);

      // Decision matrix:
      //  TRIALING  → always roll into PAST_DUE so they're prompted to pay
      //  ACTIVE + free                       → roll forward, stay ACTIVE
      //  ACTIVE + autoRenew + charged        → roll forward, stay ACTIVE
      //  ACTIVE + autoRenew + chargeFailed   → DON'T roll (give the
      //                                         autopay job another chance
      //                                         later); mark PAST_DUE
      //  ACTIVE + manual (no autoRenew)      → DON'T roll forward; mark
      //                                         PAST_DUE so the tenant
      //                                         pays manually
      let nextStatus = sub.status;
      let extend = false;
      if (sub.status === 'TRIALING') { nextStatus = 'PAST_DUE'; extend = true; }
      else if (isFree) { nextStatus = 'ACTIVE'; extend = true; }
      else if (charged) { nextStatus = 'ACTIVE'; extend = true; autoRenewed++; }
      else if (renewBlocked) { nextStatus = 'PAST_DUE'; extend = false; autoRenewFailed++; }
      else { nextStatus = 'PAST_DUE'; extend = false; pastDue++; }

      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          ...(extend ? { currentPeriodStart: newStart, currentPeriodEnd: newEnd } : {}),
          status: nextStatus,
          lastRenewalAt: charged ? new Date() : sub.lastRenewalAt,
          lastRenewalError: renewBlocked ? charge.reason : (charged ? null : sub.lastRenewalError),
          renewalFailureCount: charged ? 0 : (renewBlocked ? (sub.renewalFailureCount || 0) + 1 : sub.renewalFailureCount),
        },
      });
      if (extend) rolled++;
    } catch (err) {
      console.error(`[billing.job] roll-forward failed for sub ${sub.id}:`, err.message);
    }
  }
  return { rolled, invoiced, autoRenewed, autoRenewFailed, pastDue };
}

// Retry auto-renew on subs that landed in PAST_DUE because the saved card
// charge previously failed. Without this, rollForwardSubscriptions never
// re-picks them up (it filters status IN ['ACTIVE','TRIALING']) and the user
// stays past-due even after fixing their card. Exponential back-off mirrors
// the wallet autopay job: 1h → 6h → 1d → 1w.
function renewalBackoffMinutes(failureCount) {
  if (failureCount <= 1) return 60;
  if (failureCount === 2) return 6 * 60;
  if (failureCount === 3) return 24 * 60;
  return 7 * 24 * 60;
}

async function retryFailedRenewals() {
  const due = await prisma.subscription.findMany({
    where: { status: 'PAST_DUE', autoRenew: true },
    include: { plan: true },
  });
  let recovered = 0, stillFailing = 0;
  const now = Date.now();
  for (const sub of due) {
    if (sub.lastRenewalAt && sub.lastRenewalError) {
      // Use lastRenewalAt as the cooldown anchor (set whenever we last touched the sub).
    }
    if (sub.lastRenewalError) {
      const lastFail = sub.updatedAt ? new Date(sub.updatedAt).getTime() : 0;
      const cooldownMs = renewalBackoffMinutes(sub.renewalFailureCount || 1) * 60_000;
      if (now - lastFail < cooldownMs) continue;
    }
    try {
      const charge = await autoRenewSubscription(sub);
      if (charge.ok) {
        const newStart = new Date(sub.currentPeriodEnd);
        const newEnd = nextPeriodEnd(newStart, sub.billingCycle);
        // Snapshot a fresh invoice and mark it paid.
        let inv;
        try { inv = await snapshotInvoiceForSubscription(sub, periodKey(newStart)); } catch {}
        if (inv && charge.paymentId) {
          await prisma.billingInvoice.update({
            where: { id: inv.id },
            data: { status: 'PAID', paidAt: new Date(), providerRef: charge.paymentId },
          }).catch(() => {});
        }
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            currentPeriodStart: newStart,
            currentPeriodEnd: newEnd,
            status: 'ACTIVE',
            lastRenewalAt: new Date(),
            lastRenewalError: null,
            renewalFailureCount: 0,
          },
        });
        recovered++;
      } else {
        await prisma.subscription.update({
          where: { id: sub.id },
          data: {
            lastRenewalError: charge.reason,
            renewalFailureCount: (sub.renewalFailureCount || 0) + 1,
          },
        });
        stillFailing++;
      }
    } catch (err) {
      console.error(`[billing.job] retry renewal failed for sub ${sub.id}:`, err.message);
    }
  }
  return { recovered, stillFailing };
}

async function suspendOverdueTenants() {
  const graceDays = await getGraceDays();
  const cutoff = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000);
  const overdue = await prisma.subscription.findMany({
    where: {
      status: 'PAST_DUE',
      updatedAt: { lte: cutoff },
    },
  });
  let suspended = 0;
  for (const sub of overdue) {
    await prisma.tenant.update({
      where: { id: sub.tenantId },
      data: { status: 'SUSPENDED' },
    });
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'EXPIRED' },
    });
    suspended++;
  }
  return { suspended };
}

async function runBillingJob() {
  console.log('[billing.job] starting…');
  const roll = await rollForwardSubscriptions();
  const retry = await retryFailedRenewals();
  const suspend = await suspendOverdueTenants();
  const reminders = await sendTrialReminders();
  console.log('[billing.job] done', { ...roll, ...retry, ...suspend, ...reminders });
  return { ...roll, ...retry, ...suspend, ...reminders };
}

// Allow direct CLI invocation
if (require.main === module) {
  runBillingJob()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}

module.exports = { runBillingJob, snapshotInvoiceForSubscription, rollForwardSubscriptions, retryFailedRenewals, suspendOverdueTenants };
