// CORS configuration
require('dotenv').config();

module.exports = {
  origin: [
    'http://localhost:3000',
    'https://omnistock.vercel.app',
  ],
  credentials: true,
};
