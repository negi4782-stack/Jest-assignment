const jwt = require('jsonwebtoken');
const { api } = require('../helpers/apiClient');
const { newUser } = require('../helpers/dataFactory');
const { login } = require('../helpers/auth');

describe('POST /login', () => {
  const user = newUser();

  beforeAll(async () => {
    const res = await api.post('/register', user);
    expect(res.status).toBe(201);
  });

  test('logs in with valid credentials', async () => {
    const res = await login(user.email, user.password);
    expect(res.status).toBe(200);
    expect(typeof res.data.token).toBe('string');
    expect(res.data.role).toBe('customer');
    expect(res.data.userId).toMatch(/^[a-f0-9]{24}$/);
  });

  test('token payload contains userId and role, and expires in about 1 day', async () => {
    const res = await login(user.email, user.password);
    const decoded = jwt.decode(res.data.token);
    expect(decoded.userId).toBe(res.data.userId);
    expect(decoded.role).toBe('customer');
    expect(decoded.exp - decoded.iat).toBe(24 * 60 * 60);
  });

  test('rejects a wrong password', async () => {
    const res = await login(user.email, 'WrongPassword!1');
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Invalid credentials');
  });

  test('rejects an unknown email with the same message (no user enumeration)', async () => {
    const res = await login('nobody-here@e2e.test', 'Passw0rd!23');
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Invalid credentials');
  });

  test('[BUG?] rejects missing password with 400', async () => {
    const res = await api.post('/login', { email: user.email });
    expect(res.status).toBe(400);
  });

  test('[BUG?] rejects missing email with 400', async () => {
    const res = await api.post('/login', { password: user.password });
    expect(res.status).toBe(400);
  });
});
