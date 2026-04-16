// RTO (Return to Origin) risk scoring
//
// Scores an order 0-100 based on factors that predict whether it will come
// back undelivered. Key for Indian e-commerce where COD RTO rates can exceed 30%.
//
// Tenant workflow:
//   - Score < HIGH_THRESHOLD  → auto-approve, flows straight through
//   - Score ≥ HIGH_THRESHOLD  → needsApproval=true, tenant must approve/reject
//
// Factors (each contributes additive points):
//   +30 COD payment method
//   +15 New customer (no previous delivered orders)
//   +25 Customer has prior RTO history (per RTO)
//   +15 Pincode has poor historical RTO rate (tenant-specific)
//   +10 Order value > ₹5000 (high-value cash risk)
//   +20 Missing or invalid phone number
//   +10 Missing pincode
//    +5 Late night order (22:00–05:00 local)
//   +10 Channel with historically high RTO (marketplaces vs D2C)
//  -10 Prepaid (reduces risk)
//  -10 Loyal customer (>=3 delivered orders, no RTO)

const prisma = require('../utils/prisma');

const LOW_THRESHOLD = 30;
const MEDIUM_THRESHOLD = 60;
const HIGH_THRESHOLD = 60; // orders ≥ this need tenant approval

// Channels known to have higher RTO in practice (marketplaces, COD-heavy)
const HIGH_RTO_CHANNEL_TYPES = new Set([
  'MEESHO', 'SNAPDEAL', 'JIOMART',
  // social commerce is ad-impulse driven, treat as medium-high
  'FACEBOOK', 'INSTAGRAM', 'WHATSAPP_BUSINESS',
]);

function riskLevel(score) {
  if (score >= MEDIUM_THRESHOLD) return 'HIGH';
  if (score >= LOW_THRESHOLD) return 'MEDIUM';
  return 'LOW';
}

// Normalised payment check: accepts COD | cashondelivery | "Cash on Delivery" | null
function isCOD(payment) {
  const v = String(payment || '').toLowerCase().replace(/[\s-_]/g, '');
  return v.includes('cod') || v.includes('cashondelivery') || v.includes('cashon');
}

function isValidIndianPhone(phone) {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  // Indian mobile: 10 digits, optionally prefixed 91
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
}

// Summarise historical delivery outcome for a customer
async function getCustomerHistory(tenantId, customerId) {
  if (!customerId) return { delivered: 0, returned: 0, total: 0 };
  const [delivered, returned, total] = await Promise.all([
    prisma.order.count({ where: { tenantId, customerId, status: 'DELIVERED' } }),
    prisma.order.count({ where: { tenantId, customerId, status: 'RETURNED' } }),
    prisma.order.count({ where: { tenantId, customerId } }),
  ]);
  return { delivered, returned, total };
}

// Historical RTO rate for a pincode within the tenant
async function getPincodeRtoRate(tenantId, pincode) {
  if (!pincode) return null;
  const p = String(pincode).trim();
  if (!p) return null;
  // Count delivered vs returned for this pincode over the last 180 days
  const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
  const orders = await prisma.order.findMany({
    where: { tenantId, orderedAt: { gte: cutoff } },
    select: { status: true, shippingAddress: true },
    take: 2000,
  });
  let delivered = 0;
  let returned = 0;
  for (const o of orders) {
    const addrPin = String(o.shippingAddress?.pincode || '').trim();
    if (addrPin !== p) continue;
    if (o.status === 'DELIVERED') delivered++;
    else if (o.status === 'RETURNED') returned++;
  }
  const totalDecisive = delivered + returned;
  if (totalDecisive < 3) return null; // not enough data
  return returned / totalDecisive;
}

async function scoreOrder({
  tenantId,
  paymentMethod,
  total,
  customerId,
  customer,
  shippingAddress,
  orderedAt,
  channelType,
}) {
  const factors = [];
  let score = 0;

  // Payment method
  if (isCOD(paymentMethod)) {
    score += 30;
    factors.push({ factor: 'payment_cod', points: 30, detail: 'Cash on Delivery' });
  } else if (paymentMethod) {
    score -= 10;
    factors.push({ factor: 'payment_prepaid', points: -10, detail: 'Prepaid order' });
  }

  // Customer history
  const hist = await getCustomerHistory(tenantId, customerId);
  if (hist.total === 0) {
    score += 15;
    factors.push({ factor: 'new_customer', points: 15, detail: 'First order from this customer' });
  } else if (hist.returned > 0) {
    const pts = Math.min(40, hist.returned * 25);
    score += pts;
    factors.push({ factor: 'customer_rto_history', points: pts, detail: `${hist.returned} prior RTO(s)` });
  } else if (hist.delivered >= 3) {
    score -= 10;
    factors.push({ factor: 'loyal_customer', points: -10, detail: `${hist.delivered} successful deliveries` });
  }

  // Pincode history
  try {
    const pinRate = await getPincodeRtoRate(tenantId, shippingAddress?.pincode);
    if (pinRate != null && pinRate > 0.3) {
      score += 15;
      factors.push({ factor: 'pincode_high_rto', points: 15, detail: `${Math.round(pinRate * 100)}% RTO in pincode` });
    }
  } catch { /* non-fatal */ }

  // High-value order
  const val = Number(total) || 0;
  if (val > 5000) {
    score += 10;
    factors.push({ factor: 'high_value', points: 10, detail: `Order \u20B9${val.toLocaleString()}` });
  }

  // Contact / address quality
  const phone = customer?.phone || shippingAddress?.phone;
  if (!isValidIndianPhone(phone)) {
    score += 20;
    factors.push({ factor: 'invalid_phone', points: 20, detail: 'Missing or invalid phone number' });
  }
  if (!shippingAddress?.pincode) {
    score += 10;
    factors.push({ factor: 'missing_pincode', points: 10, detail: 'No pincode provided' });
  }

  // Time-of-day risk
  const hour = new Date(orderedAt || Date.now()).getHours();
  if (hour >= 22 || hour < 5) {
    score += 5;
    factors.push({ factor: 'late_night', points: 5, detail: 'Late-night order' });
  }

  // Channel risk
  if (HIGH_RTO_CHANNEL_TYPES.has(channelType)) {
    score += 10;
    factors.push({ factor: 'channel_risky', points: 10, detail: `${channelType} has higher RTO rates` });
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    level: riskLevel(score),
    needsApproval: score >= HIGH_THRESHOLD,
    factors,
  };
}

// Score + persist on an order row
async function scoreAndPersist(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, channel: true },
  });
  if (!order) throw new Error('Order not found');

  const result = await scoreOrder({
    tenantId: order.tenantId,
    paymentMethod: order.paymentMethod,
    total: order.total,
    customerId: order.customerId,
    customer: order.customer,
    shippingAddress: order.shippingAddress,
    orderedAt: order.orderedAt,
    channelType: order.channel?.type,
  });

  await prisma.order.update({
    where: { id: order.id },
    data: {
      rtoScore: result.score,
      rtoRiskLevel: result.level,
      rtoFactors: result.factors,
      needsApproval: result.needsApproval,
    },
  });
  return result;
}

module.exports = {
  scoreOrder,
  scoreAndPersist,
  LOW_THRESHOLD,
  MEDIUM_THRESHOLD,
  HIGH_THRESHOLD,
  riskLevel,
};
