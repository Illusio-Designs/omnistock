// Central database module — Knex query builder over mysql2.
// No DLL, no code generation, no binary.
// Usage:  const db = require('../utils/db');
//         const users = await db('users').where({ tenantId }).orderBy('createdAt', 'desc');

const knex = require('knex');
const config = require('../../knexfile');

const db = knex(config);

// UUID helper — all our primary keys are UUIDs
const { v4: uuid } = require('uuid');
db.uuid = uuid;

// Transaction helper — same shape as prisma.$transaction
// Usage: await db.tx(async (trx) => { await trx('users').insert(...); });
db.tx = (fn) => db.transaction(fn);

module.exports = db;
