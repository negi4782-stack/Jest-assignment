const crypto = require('crypto');

const uniqueId = () => `${Date.now()}${crypto.randomBytes(3).toString('hex')}`;
const randomObjectId = () => crypto.randomBytes(12).toString('hex');

const newUser = (overrides = {}) => ({
  name: 'E2E User',
  email: `user${uniqueId()}@e2e.test`, // @e2e.test users are removed in teardown
  password: 'Passw0rd!23',
  ...overrides,
});

module.exports = { uniqueId, randomObjectId, newUser };
