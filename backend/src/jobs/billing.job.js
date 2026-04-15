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

async function rollForwardSubscriptions() {
  const now = new Date();
  const due = await prisma.subscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'TRIALING'] },
      currentPeriodEnd: { lte: now },
    },
    include: { plan: true },
  });

  let rolled = 0, invoiced = 0;
  for (const sub of due) {
    try {
      // Snapshot an invoice for the period that just ended (skip on trial)
      if (sub.status === 'ACTIVE') {
        await snapshotInvoiceForSubscription(sub, periodKey(sub.currentPeriodStart));
        invoiced++;
      }

      const newStart = new Date(sub.currentPeriodEnd);
      const newEnd = nextPeriodEnd(newStart, sub.billingCycle);

      await prisma.subscription.update({
        where: { id: sub.id },
        data: {
          currentPeriodStart: newStart,
          currentPeriodEnd: newEnd,
          // Trials transition to ACTIVE only if they have a real plan AND
          // payment is on file — otherwise → PAST_DUE for grace period.
          status: sub.status === 'TRIALING' ? 'PAST_DUE' : 'ACTIVE',
        },
      });
      rolled++;
    } catch (err) {
      console.error(`[billing.job] roll-forward failed for sub ${sub.id}:`, err.message);
    }
  }
  return { rolled, invoiced };
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
  const suspend = await suspendOverdueTenants();
  const reminders = await sendTrialReminders();
  console.log('[billing.job] done', { ...roll, ...suspend, ...reminders });
  return { ...roll, ...suspend, ...reminders };
}

// Allow direct CLI invocation
if (require.main === module) {
  runBillingJob()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
}

module.exports = { runBillingJob, snapshotInvoiceForSubscription, rollForwardSubscriptions, suspendOverdueTenants };
