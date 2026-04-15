const prisma = require('../utils/prisma');
const { getAdapter } = require('./channel.service');

// ── Configuration ────────────────────────────────────────────────────────────
// Hours to wait after delivery before triggering the channel's review API.
// Configurable via env var; defaults to 72h (3 days).
const REVIEW_DELAY_HOURS = parseInt(process.env.REVIEW_REQUEST_DELAY_HOURS || '72', 10);

// Adapters that implement requestReview() — all others are skipped gracefully.
function adapterSupportsReview(adapter) {
  return adapter && typeof adapter.requestReview === 'function';
}

// ── Trigger review request for a single order ───────────────────────────────
async function requestReviewForOrder(orderId, { tenantId } = {}) {
  const where = { id: orderId };
  if (tenantId) where.tenantId = tenantId;
  const order = await prisma.order.findFirst({
    where,
    include: { channel: true },
  });
  if (!order) throw new Error('Order not found');
  if (order.status !== 'DELIVERED') throw new Error('Order is not delivered yet');
  if (!order.channelOrderId) throw new Error('Order has no channelOrderId');
  if (order.reviewRequestedAt) {
    return { alreadyRequested: true, requestedAt: order.reviewRequestedAt };
  }

  const adapter = getAdapter(order.channel);
  if (!adapterSupportsReview(adapter)) {
    throw new Error(`${order.channel.type}: channel does not support review requests`);
  }

  try {
    const result = await adapter.requestReview(order.channelOrderId, order);
    await prisma.order.update({
      where: { id: order.id },
      data: { reviewRequestedAt: new Date(), reviewRequestError: null },
    });
    return { success: true, result };
  } catch (err) {
    await prisma.order.update({
      where: { id: order.id },
      data: { reviewRequestError: err.message },
    });
    throw err;
  }
}

// ── Batch processor — run from a cron / scheduled job ───────────────────────
// Finds all DELIVERED orders where:
//   - delivered > N hours ago
//   - reviewRequestedAt IS NULL
//   - channel's adapter supports requestReview()
async function processReviewQueue({ delayHours = REVIEW_DELAY_HOURS, limit = 100, tenantId = null } = {}) {
  const cutoff = new Date(Date.now() - delayHours * 60 * 60 * 1000);

  const where = {
    status: 'DELIVERED',
    deliveredAt: { lte: cutoff },
    reviewRequestedAt: null,
    channelOrderId: { not: null },
  };
  if (tenantId) where.tenantId = tenantId;

  const orders = await prisma.order.findMany({
    where,
    include: { channel: true },
    take: limit,
    orderBy: { deliveredAt: 'asc' },
  });

  const results = { processed: 0, skipped: 0, failed: 0, errors: [] };

  for (const order of orders) {
    let adapter;
    try {
      adapter = getAdapter(order.channel);
    } catch (err) {
      results.skipped++;
      continue;
    }

    if (!adapterSupportsReview(adapter)) {
      results.skipped++;
      continue;
    }

    try {
      await adapter.requestReview(order.channelOrderId, order);
      await prisma.order.update({
        where: { id: order.id },
        data: { reviewRequestedAt: new Date(), reviewRequestError: null },
      });
      results.processed++;
    } catch (err) {
      results.failed++;
      results.errors.push(`${order.orderNumber}: ${err.message}`);
      await prisma.order.update({
        where: { id: order.id },
        data: { reviewRequestError: err.message },
      }).catch(() => {});
    }
  }

  return { ...results, cutoff, totalEligible: orders.length };
}

module.exports = {
  requestReviewForOrder,
  processReviewQueue,
  REVIEW_DELAY_HOURS,
};
