const { api } = require('../helpers/apiClient');
const { randomObjectId } = require('../helpers/dataFactory');
const { createLoggedInUser, loginAdmin, signToken } = require('../helpers/auth');
const { bookingPayload, createBooking, cancelBooking } = require('../helpers/bookings');

const DATE = '2030-04-10';

describe('Authentication (token checks)', () => {
  const protectedCalls = [
    ['POST /bookings', (headers) => api.post('/bookings', bookingPayload({ date: DATE }), { headers })],
    ['POST /bookings/:id/cancel', (headers) => api.post(`/bookings/${randomObjectId()}/cancel`, {}, { headers })],
  ];

  describe.each(protectedCalls)('%s', (_name, call) => {
    test('401 without a token', async () => {
      const res = await call({});
      expect(res.status).toBe(401);
      expect(res.data.error).toBe('Authentication required');
    });

    test('401 with a malformed token', async () => {
      const res = await call({ Authorization: 'Bearer not.a.jwt' });
      expect(res.status).toBe(401);
      expect(res.data.error).toBe('Invalid token');
    });

    test('401 with an expired token', async () => {
      const { userId } = await createLoggedInUser();
      const expired = signToken({ userId, role: 'customer', exp: Math.floor(Date.now() / 1000) - 60 });
      const res = await call({ Authorization: `Bearer ${expired}` });
      expect(res.status).toBe(401);
      expect(res.data.error).toBe('Invalid token');
    });

    test('401 with a token signed using the wrong secret', async () => {
      const { userId } = await createLoggedInUser();
      const forged = signToken({ userId, role: 'admin' }, 'some-other-secret');
      const res = await call({ Authorization: `Bearer ${forged}` });
      expect(res.status).toBe(401);
      expect(res.data.error).toBe('Invalid token');
    });

    test('401 when the token is valid but the user no longer exists', async () => {
      const ghost = signToken({ userId: randomObjectId(), role: 'customer' });
      const res = await call({ Authorization: `Bearer ${ghost}` });
      expect(res.status).toBe(401);
      expect(res.data.error).toBe('User not found');
    });
  });
});

describe('Authorization (who may cancel what)', () => {
  test('a customer cannot cancel another customer\'s booking (403), owner still can', async () => {
    const owner = await createLoggedInUser();
    const intruder = await createLoggedInUser();
    const booking = await createBooking(owner.token, bookingPayload({ date: DATE, time: '09:00' }));
    expect(booking.status).toBe(201);
    const id = booking.data.booking._id;

    const denied = await cancelBooking(intruder.token, id);
    expect(denied.status).toBe(403);
    expect(denied.data.error).toBe('Not authorized to cancel this booking');

    const allowed = await cancelBooking(owner.token, id);
    expect(allowed.status).toBe(200); // proves the 403 did not cancel it
  });

  test('an admin can cancel any customer\'s booking', async () => {
    const owner = await createLoggedInUser();
    const admin = await loginAdmin();
    const booking = await createBooking(owner.token, bookingPayload({ date: DATE, time: '11:00' }));
    expect(booking.status).toBe(201);

    const res = await cancelBooking(admin.token, booking.data.booking._id);
    expect(res.status).toBe(200);
    expect(res.data.message).toBe('Booking cancelled successfully');
  });

  test('available-slots is public (no token needed)', async () => {
    const res = await api.get(`/salons/${randomObjectId()}/available-slots`, { params: { date: DATE, serviceId: randomObjectId() } });
    expect(res.status).toBe(404); // reaches the controller, so no auth was required
  });
});
