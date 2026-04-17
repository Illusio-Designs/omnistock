// Tenant wallet for Pay-As-You-Go
//
// Tenants pre-fund a wallet and overages are debited in real-time.
// Uses the Knex-backed "prisma" shim with FOR UPDATE row locks for safety.

const db = require('../utils/db');
const prisma = require('../utils/prisma');
const { randomUUID } = require('crypto');

async function getOrCreateWallet(tenantId) {
  let wallet = await prisma.tenantWallet.findFirst({ where: { tenantId } });
  if (wallet) return wallet;

  wallet = await prisma.tenantWallet.create({
    data: { tenantId, balance: 0, currency: 'INR', lowBalanceThreshold: 100 },
  });
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
  return db.transaction(async (trx) => {
    const [w] = await trx.raw('SELECT * FROM tenant_wallets WHERE tenantId = ? FOR UPDATE', [tenantId]);
    const row = Array.isArray(w) ? w[0] : w;
    const newBalance = Number(row.balance) + amt;
    await trx('tenant_wallets').where({ tenantId }).update({ balance: newBalance, updatedAt: new Date() });
    const txId = randomUUID();
    await trx('wallet_transactions').insert({
      id: txId, tenantId, walletId: row.id, type, amount: amt, balanceAfter: newBalance,
      reference: reference || null, description: description || null,
      createdById: createdById || null, paymentRef: paymentRef || null,
      createdAt: new Date(),
    });
    return { balanceAfter: newBalance, amount: amt, transactionId: txId };
  });
}

// Debit the wallet for overage usage. Returns { ok: false, ... } if insufficient funds.
async function debit(tenantId, amount, { metric, quantity, reference, description, createdById } = {}) {
  const amt = Number(amount);
  if (!amt || amt <= 0) throw new Error('Debit amount must be positive');

  await getOrCreateWallet(tenantId);
  return db.transaction(async (trx) => {
    const [w] = await trx.raw('SELECT * FROM tenant_wallets WHERE tenantId = ? FOR UPDATE', [tenantId]);
    const row = Array.isArray(w) ? w[0] : w;
    const current = Number(row.balance);
    if (current < amt) {
      return { ok: false, balance: current, required: amt };
    }
    const newBalance = current - amt;
    await trx('tenant_wallets').where({ tenantId }).update({ balance: newBalance, updatedAt: new Date() });
    const txId = randomUUID();
    await trx('wallet_transactions').insert({
      id: txId, tenantId, walletId: row.id, type: 'DEBIT', amount: -amt, balanceAfter: newBalance,
      metric: metric || null, quantity: quantity || null,
      reference: reference || null, description: description || null,
      createdById: createdById || null,
      createdAt: new Date(),
    });
    return { ok: true, balanceAfter: newBalance, amount: amt, transactionId: txId };
  });
}

async function history(tenantId, limit = 50) {
  return db('wallet_transactions')
    .where({ tenantId })
    .orderBy('createdAt', 'desc')
    .limit(Number(limit));
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
