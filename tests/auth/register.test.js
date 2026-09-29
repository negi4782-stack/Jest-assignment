const { api } = require('../helpers/apiClient');
const { newUser } = require('../helpers/dataFactory');
const { login } = require('../helpers/auth');

describe('POST /register', () => {
  test('registers a new customer', async () => {
    const res = await api.post('/register', newUser());
    expect(res.status).toBe(201);
    expect(res.data).toEqual({ message: 'User registered successfully' });
  });

  test('does not leak password or token in the response', async () => {
    const res = await api.post('/register', newUser());
    expect(res.data.password).toBeUndefined();
    expect(res.data.token).toBeUndefined();
  });

  test('rejects a duplicate email', async () => {
    const user = newUser();
    await api.post('/register', user);
    const res = await api.post('/register', { ...user, name: 'Someone Else' });
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Email already in use');
  });

  test('ignores role in the body (no privilege escalation)', async () => {
    const user = newUser({ role: 'admin' });
    const reg = await api.post('/register', user);
    expect(reg.status).toBe(201);
    const res = await login(user.email, user.password);
    expect(res.data.role).toBe('customer');
  });

  // The controller has no input validation, so these are expected to expose bugs (500 instead of 400)
  test.each(['name', 'email', 'password'])('[BUG?] rejects missing %s with 400', async (field) => {
    const user = newUser();
    delete user[field];
    const res = await api.post('/register', user);
    expect(res.status).toBe(400);
  });

  test('[BUG?] rejects an invalid email format', async () => {
    const res = await api.post('/register', newUser({ email: 'not-an-email' }));
    expect(res.status).toBe(400);
  });
});
