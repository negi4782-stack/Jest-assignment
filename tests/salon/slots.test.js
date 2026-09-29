const { api } = require('../helpers/apiClient');
const { randomObjectId } = require('../helpers/dataFactory');
const { getSlots } = require('../helpers/bookings');
const { toMins } = require('../helpers/time');
const seed = require('../helpers/seedData');

const DATE = '2030-05-10';

describe('GET /salons/:salonId/available-slots', () => {
  test('returns slots with the expected shape', async () => {
    const res = await getSlots(DATE);
    expect(res.status).toBe(200);
    expect(res.data.date).toBe(DATE);
    expect(res.data.service).toBe('E2E Haircut');
    expect(res.data.duration).toBe(60);
    expect(res.data.availableSlots.length).toBeGreaterThan(0);
    for (const s of res.data.availableSlots) {
      expect(s.time).toMatch(/^\d{2}:\d{2}$/);
      expect(typeof s.stylistId).toBe('string');
      expect(typeof s.stylistName).toBe('string');
    }
  });

  test('slots start at opening time and every slot ends by closing time', async () => {
    const { availableSlots } = (await getSlots(DATE)).data;
    const times = availableSlots.map((s) => toMins(s.time));
    expect(Math.min(...times)).toBe(toMins('09:00'));
    expect(Math.max(...times) + 60).toBeLessThanOrEqual(toMins('18:00'));
  });

  test('slots are on a 30 minute grid', async () => {
    const { availableSlots } = (await getSlots(DATE)).data;
    for (const s of availableSlots) expect(toMins(s.time) % 30).toBe(0);
  });

  test('includes the seeded stylists', async () => {
    const { availableSlots } = (await getSlots(DATE)).data;
    for (const id of seed.stylistIds) {
      expect(availableSlots.some((s) => s.stylistId === id)).toBe(true);
    }
  });

  test('a shorter service produces more slots than a longer one', async () => {
    const long = (await getSlots(DATE, seed.service60Id)).data.availableSlots.length;
    const short = (await getSlots(DATE, seed.service30Id)).data.availableSlots.length;
    expect(short).toBeGreaterThan(long);
  });

  test('400 when date is missing', async () => {
    const res = await api.get(`/salons/${seed.salonId}/available-slots`, { params: { serviceId: seed.service60Id } });
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('date and serviceId are required');
  });

  test('400 when serviceId is missing', async () => {
    const res = await api.get(`/salons/${seed.salonId}/available-slots`, { params: { date: DATE } });
    expect(res.status).toBe(400);
    expect(res.data.error).toBe('date and serviceId are required');
  });

  test('404 for an unknown salon', async () => {
    const res = await getSlots(DATE, seed.service60Id, randomObjectId());
    expect(res.status).toBe(404);
    expect(res.data.error).toBe('Salon or Service not found');
  });

  test('404 for an unknown service', async () => {
    const res = await getSlots(DATE, randomObjectId());
    expect(res.status).toBe(404);
  });

  test('[BUG?] an invalid (non-ObjectId) salonId returns 400/404, not 500', async () => {
    const res = await getSlots(DATE, seed.service60Id, 'not-an-id');
    expect([400, 404]).toContain(res.status);
  });
});
