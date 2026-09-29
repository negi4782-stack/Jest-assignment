const axios = require('axios');

// validateStatus: () => true lets tests assert 4xx/5xx instead of throwing
const api = axios.create({
  baseURL: process.env.BASE_URL || 'http://localhost:3000/api',
  validateStatus: () => true,
  timeout: 10000,
});

const authHeader = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

module.exports = { api, authHeader };
