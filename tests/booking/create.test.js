const { createLoggedInUser } = require('../helpers/auth');
const { randomObjectId } = require('../helpers/dataFactory');
const { bookingPayload, createBooking } = require('../helpers/bookings');
const { api } = require('../helpers/apiClient');
const seed = require('../helpers/seedData');

const DATE = '2030-02-10';
const BUG_DATE = '2030-02-11';

describe('POST /bookings', () => {
  let customer;
  beforeAll(async () => {
    customer = await createLoggedInUser();
  });

  test('creates a booking and calculates the end time from service duration', async () => {
    const res = await createBooking(customer.token, bookingPayload({ date: DATE, time: '09:00', stylist: 0 }));
    expect(res.status).toBe(201);
    expect(res.data.message).toBe('Booking created successfully');
    expect(res.data.booking).toMatchObject({
      salonId: seed.salonId,
      stylistId: seed.stylistIds[0],
      serviceId: seed.service60Id,
      customerId: customer.userId,
      date: DATE,
      startTime: '09:00',
      endTime: '10:00',
      status: 'booked',
    });
  });

  test('customerId comes from the token, a fake customerId in the body is ignored', async () => {
    const res = await createBooking(customer.token, {
      ...bookingPayload({ date: DATE, time: '16:00', stylist: 0 }),
      customerId: randomObjectId(),
    });
    expect(res.status).toBe(201);
    expect(res.data.booking.customerId).toBe(customer.userId);
  });

  test('rejects an exact double booking of the same stylist and slot', async () => {
    const other = await createLoggedInUser();
    const first = await createBooking(customer.token, bookingPayload({ date: DATE, time: '09:00', stylist: 1 }));
    expect(first.status).toBe(201);
    const second = await createBooking(other.token, bookingPayload({ date: DATE, time: '09:00', stylist: 1 }));
    expect(second.status).toBe(400);
    expect(second.data.error).toBe('Time slot is no longer available');
  });

  test('rejects an overlapping booking (starts inside an existing one)', async () => {
    const first = await createBooking(customer.token, bookingPayload({ date: DATE, time: '13:00', stylist: 1 }));
    expect(first.status).toBe(201);
    const overlap = await createBooking(customer.token, bookingPayload({ date: DATE, time: '13:30', stylist: 1 }));
    expect(overlap.status).toBe(400);
    expect(overlap.data.error).toBe('Time slot is no longer available');
  });

  test('allows a back-to-back booking (starts exactly when the previous one ends)', async () => {
    const res = await createBooking(customer.token, bookingPayload({ date: DATE, time: '14:00', stylist: 1 }));
    expect(res.status).toBe(201);
    const next = await createBooking(customer.token, bookingPayload({ date: DATE, time: '15:00', stylist: 1 }));
    expect(next.status).toBe(201);
  });

  test('allows the same time slot with a different stylist', async () => {
    const a = await createBooking(customer.token, bookingPayload({ date: DATE, time: '11:00', stylist: 0 }));
    const b = await createBooking(customer.token, bookingPayload({ date: DATE, time: '11:00', stylist: 1 }));
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
  });

  test('400 when date is missing', async () => {
    const body = bookingPayload({ date: DATE });
    delete body.date;
    const res = await createBooking(customer.token, body);
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('date is required');
  });

  test('404 for an unknown service', async () => {
    const res = await createBooking(customer.token, {
      ...bookingPayload({ date: DATE, time: '10:30' }),
      serviceId: randomObjectId(),
    });
    expect(res.status).toBe(404);
    expect(res.data.error).toBe('Service not found');
  });

  test('401 without a token', async () => {
    const res = await api.post('/bookings', bookingPayload({ date: DATE }));
    expect(res.status).toBe(401);
  });

  // Business rules the controller does not enforce, so these are expected to fail and are worth flagging
  test('[BUG?] rejects a missing slotTime with 400', async () => {
    const body = bookingPayload({ date: BUG_DATE });
    delete body.slotTime;
    const res = await createBooking(customer.token, body);
    expect(res.status).toBe(400);
  });

  test('[BUG?] rejects an invalid slotTime format', async () => {
    const res = await createBooking(customer.token, bookingPayload({ date: BUG_DATE, time: 'abc' }));
    expect(res.status).toBe(400);
  });

  test('[BUG?] rejects a booking outside salon opening hours', async () => {
    const res = await createBooking(customer.token, bookingPayload({ date: BUG_DATE, time: '23:00' }));
    expect(res.status).toBe(400);
  });

  test('[BUG?] rejects a booking in the past', async () => {
    const res = await createBooking(customer.token, bookingPayload({ date: '2000-01-01', time: '09:00' }));
    expect(res.status).toBe(400);
  });

  test('[BUG?] rejects a service that belongs to a different salon', async () => {
    const res = await createBooking(customer.token, {
      ...bookingPayload({ date: BUG_DATE, time: '10:00' }),
      serviceId: seed.otherSalonServiceId,
    });
    expect([400, 404]).toContain(res.status);
  });
});
