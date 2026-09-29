const jwt = require('jsonwebtoken');
const { api } = require('./apiClient');
const { newUser } = require('./dataFactory');
const seed = require('./seedData');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey_12345';

const login = (email, password) => api.post('/login', { email, password });

const registerUser = async (overrides) => {
  const user = newUser(overrides);
  const res = await api.post('/register', user);
  return { user, res };
};

// Register + login, returns { user, token, userId }
const createLoggedInUser = async (overrides) => {
  const { user, res } = await registerUser(overrides);
  if (res.status !== 201) throw new Error(`Register failed: ${res.status} ${JSON.stringify(res.data)}`);
  const l = await login(user.email, user.password);
  if (l.status !== 200) throw new Error(`Login failed: ${l.status} ${JSON.stringify(l.data)}`);
  return { user, token: l.data.token, userId: l.data.userId };
};

const loginAdmin = async () => {
  const l = await login(seed.admin.email, seed.admin.password);
  if (l.status !== 200) throw new Error(`Admin login failed: ${l.status}`);
  return { token: l.data.token, userId: l.data.userId };
};

// For crafting expired / forged tokens
const signToken = (payload, secret = JWT_SECRET) => jwt.sign(payload, secret);

module.exports = { login, registerUser, createLoggedInUser, loginAdmin, signToken };
