const { api } = require('../helpers/apiClient');
const { createLoggedInUser } = require('../helpers/auth');
const { randomObjectId } = require('../helpers/dataFactory');
const { bookingPayload, createBooking, cancelBooking } = require('../helpers/bookings');

const DATE = '2030-03-10';

describe('POST /bookings/:bookingId/cancel', () => {
  let customer;
  beforeAll(async () => {
    customer = await createLoggedInUser();
  });

  test('cancels an existing booking', async () => {
    const booking = await createBooking(customer.token, bookingPayload({ date: DATE, time: '09:00' }));
    expect(booking.status).toBe(201);
    const res = await cancelBooking(customer.token, booking.data.booking._id);
    expect(res.status).toBe(200);
    expect(res.data.message).toBe('Booking cancelled successfully');
  });

  test('cancelling twice returns 400', async () => {
    const booking = await createBooking(customer.token, bookingPayload({ date: DATE, time: '11:00' }));
    const id = booking.data.booking._id;
    expect((await cancelBooking(customer.token, id)).status).toBe(200);
    const again = await cancelBooking(customer.token, id);
    expect(again.status).toBe(400);
    expect(again.data.error).toBe('Booking is already cancelled');
  });

  test('a cancelled booking frees the slot so it can be booked again', async () => {
    const payload = bookingPayload({ date: DATE, time: '13:00' });
    const first = await createBooking(customer.token, payload);
    expect((await createBooking(customer.token, payload)).status).toBe(400); // slot taken
    await cancelBooking(customer.token, first.data.booking._id);
    const rebook = await createBooking(customer.token, payload);
    expect(rebook.status).toBe(201);
  });

  test('404 for a booking that does not exist', async () => {
    const res = await cancelBooking(customer.token, randomObjectId());
    expect(res.status).toBe(404);
    expect(res.data.error).toBe('Booking not found');
  });

  test('401 without a token', async () => {
    const res = await api.post(`/bookings/${randomObjectId()}/cancel`, {});
    expect(res.status).toBe(401);
  });

  test('[BUG?] an invalid (non-ObjectId) booking id returns 400/404, not 500', async () => {
    const res = await cancelBooking(customer.token, 'not-an-id');
    expect([400, 404]).toContain(res.status);
  });
});
