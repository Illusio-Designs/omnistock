// CORS configuration — environment-aware
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

const origins = isProd
  ? ['https://omnistock.vercel.app']
  : [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8081',
      'http://localhost:8082',
    ];

module.exports = {
  origin: origins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
  maxAge: 86400,
};
