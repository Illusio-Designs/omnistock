// Tenant wallet for Pay-As-You-Go
//
// Instead of post-paid overage billing, tenants pre-fund a wallet and overages
// are debited in real-time. This removes bill-shock at period end and lets the
// tenant cap their exposure by choosing how much to top up.
//
// Operations:
//   getOrCreateWallet(tenantId)    — idempotent fetch + create
//   getBalance(tenantId)           — current balance
//   topup(tenantId, amount, ref)   — add credit (from payment gateway)
//   debit(tenantId, amount, meta)  — deduct for overage usage (atomic)
//   history(tenantId, limit)       — recent transactions

const prisma = require('../utils/prisma');
const { randomUUID } = require('crypto');

async function getOrCreateWallet(tenantId) {
  let wallet = await prisma.tenantWallet.findUnique({ where: { tenantId } }).catch(() => null);
  if (wallet) return wallet;

  // Fall back to raw query if Prisma client doesn't know about this model yet
  // (new table created via initDb migration; client regenerate required otherwise)
  try {
    wallet = await prisma.tenantWallet.create({
      data: { id: randomUUID(), tenantId, balance: 0, currency: 'INR', lowBalanceThreshold: 100 },
    });
  } catch {
    // Raw fallback — works even if Prisma client isn't regenerated
    const id = randomUUID();
    await prisma.$executeRawUnsafe(
      `INSERT INTO tenant_wallets (id, tenantId, balance, currency, lowBalanceThreshold) VALUES (?, ?, 0, 'INR', 100)`,
      id, tenantId
    );
    const [row] = await prisma.$queryRawUnsafe(
      `SELECT * FROM tenant_wallets WHERE tenantId = ?`, tenantId
    );
    wallet = row;
  }
  return wallet;
}

async function getBalance(tenantId) {
  const w = await getOrCreateWallet(tenantId);
  return Number(w.balance || 0);
}

// Credit the wallet (TOPUP, REFUND, ADJUSTMENT_CREDIT)
async function topup(tenantId, amount, { reference, description, createdById, paymentRef, type = 'TOPUP' } = {}) {
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new Error('Topup amount must be positive');

  await getOrCreateWallet(tenantId);
  return prisma.$transaction(async (tx) => {
    // Lock the wallet row
    const [w] = await tx.$queryRawUnsafe(
      `SELECT * FROM tenant_wallets WHERE tenantId = ? FOR UPDATE`, tenantId
    );
    const newBalance = Number(w.balance) + amt;
    await tx.$executeRawUnsafe(
      `UPDATE tenant_wallets SET balance = ?, updatedAt = NOW(3) WHERE tenantId = ?`,
      newBalance, tenantId
    );
    const txId = randomUUID();
    await tx.$executeRawUnsafe(
      `INSERT INTO wallet_transactions (id, tenantId, walletId, type, amount, balanceAfter, reference, description, createdById, paymentRef)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      txId, tenantId, w.id, type, amt, newBalance, reference || null, description || null, createdById || null, paymentRef || null
    );
    return { balanceAfter: newBalance, amount: amt, transactionId: txId };
  });
}

// Debit the wallet for overage usage. Returns null if insufficient funds (caller decides).
async function debit(tenantId, amount, { metric, quantity, reference, description, createdById } = {}) {
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new Error('Debit amount must be positive');

  await getOrCreateWallet(tenantId);
  return prisma.$transaction(async (tx) => {
    const [w] = await tx.$queryRawUnsafe(
      `SELECT * FROM tenant_wallets WHERE tenantId = ? FOR UPDATE`, tenantId
    );
    const current = Number(w.balance);
    if (current < amt) {
      return { ok: false, balance: current, required: amt };
    }
    const newBalance = current - amt;
    await tx.$executeRawUnsafe(
      `UPDATE tenant_wallets SET balance = ?, updatedAt = NOW(3) WHERE tenantId = ?`,
      newBalance, tenantId
    );
    const txId = randomUUID();
    await tx.$executeRawUnsafe(
      `INSERT INTO wallet_transactions (id, tenantId, walletId, type, amount, balanceAfter, metric, quantity, reference, description, createdById)
       VALUES (?, ?, ?, 'DEBIT', ?, ?, ?, ?, ?, ?, ?)`,
      txId, tenantId, w.id, -amt, newBalance, metric || null, quantity || null, reference || null, description || null, createdById || null
    );
    return { ok: true, balanceAfter: newBalance, amount: amt, transactionId: txId };
  });
}

async function history(tenantId, limit = 50) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT * FROM wallet_transactions WHERE tenantId = ? ORDER BY createdAt DESC LIMIT ?`,
    tenantId, Number(limit)
  );
  return rows;
}

async function isLowBalance(tenantId) {
  const w = await getOrCreateWallet(tenantId);
  return Number(w.balance) < Number(w.lowBalanceThreshold);
}

module.exports = {
  getOrCreateWallet,
  getBalance,
  topup,
  debit,
  history,
  isLowBalance,
};
