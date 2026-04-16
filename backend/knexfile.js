require('dotenv').config();

// Parse DATABASE_URL into knex connection config
// Format: mysql://user:pass@host:port/database
function parseUrl(url) {
  if (!url) return { host: 'localhost', port: 3306, user: 'root', password: '', database: 'omnistock' };
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: u.username || 'root',
    password: u.password || '',
    database: u.pathname.replace(/^\//, ''),
  };
}

module.exports = {
  client: 'mysql2',
  connection: parseUrl(process.env.DATABASE_URL),
  pool: { min: 2, max: 10 },
  migrations: {
    tableName: '_knex_migrations',
    directory: './migrations',
  },
  seeds: {
    directory: './seeds',
  },
};
