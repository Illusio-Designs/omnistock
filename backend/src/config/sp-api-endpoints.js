// Back-compat shim — superseded by channel-endpoints.js, which covers all
// platforms (not just Amazon SP-API). Kept temporarily so adapters that
// still `require('./sp-api-endpoints')` keep working.
module.exports = require('./channel-endpoints');