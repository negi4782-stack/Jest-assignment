const { registerUser, login } = require('../helpers/auth');
const { bookingPayload, createBooking, cancelBooking, getSlots } = require('../helpers/bookings');
const seed = require('../helpers/seedData');

const DATE = '2030-01-10';
const TIME = '10:00';
const findSlot = (slots, time = TIME) =>
  slots.find((s) => s.stylistId === seed.stylistIds[0] && s.time === time);

describe('E2E: Register → Login → Available slots → Book → Cancel', () => {
  const state = {};

  test('1. register a new customer', async () => {
    const { user, res } = await registerUser();
    state.user = user;
    expect(res.status).toBe(201);
    expect(res.data.message).toBe('User registered successfully');
  });

  test('2. login and receive a token', async () => {
    const res = await login(state.user.email, state.user.password);
    expect(res.status).toBe(200);
    expect(res.data.token).toBeDefined();
    state.token = res.data.token;
    state.userId = res.data.userId;
  });

  test('3. the slot is available before booking', async () => {
    const res = await getSlots(DATE);
    expect(res.status).toBe(200);
    expect(findSlot(res.data.availableSlots)).toBeDefined();
  });

  test('4. book the slot', async () => {
    const res = await createBooking(state.token, bookingPayload({ date: DATE, time: TIME, stylist: 0 }));
    expect(res.status).toBe(201);
    expect(res.data.booking.status).toBe('booked');
    expect(res.data.booking.customerId).toBe(state.userId);
    expect(res.data.booking.startTime).toBe(TIME);
    expect(res.data.booking.endTime).toBe('11:00');
    state.bookingId = res.data.booking._id;
  });

  test('5. the booked slot (and the overlapping 10:30 slot) disappear for that stylist', async () => {
    const res = await getSlots(DATE);
    expect(findSlot(res.data.availableSlots, '10:00')).toBeUndefined();
    expect(findSlot(res.data.availableSlots, '10:30')).toBeUndefined();
    expect(findSlot(res.data.availableSlots, '11:00')).toBeDefined(); // back-to-back is fine
  });

  test('6. cancel the booking', async () => {
    const res = await cancelBooking(state.token, state.bookingId);
    expect(res.status).toBe(200);
    expect(res.data.message).toBe('Booking cancelled successfully');
  });

  test('7. cancelling again is rejected', async () => {
    const res = await cancelBooking(state.token, state.bookingId);
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('Booking is already cancelled');
  });

  test('8. the slot is available again after cancellation', async () => {
    const res = await getSlots(DATE);
    expect(findSlot(res.data.availableSlots)).toBeDefined();
  });
});
