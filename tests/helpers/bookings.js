const { api, authHeader } = require('./apiClient');
const seed = require('./seedData');

// stylist: 0 | 1 (seeded stylists), service: '60' | '30'
const bookingPayload = ({ date, time = '09:00', stylist = 0, service = '60' }) => ({
  salonId: seed.salonId,
  stylistId: seed.stylistIds[stylist],
  serviceId: service === '30' ? seed.service30Id : seed.service60Id,
  slotTime: time,
  date,
});

const createBooking = (token, body) => api.post('/bookings', body, authHeader(token));
const cancelBooking = (token, id) => api.post(`/bookings/${id}/cancel`, {}, authHeader(token));
const getSlots = (date, serviceId = seed.service60Id, salonId = seed.salonId) =>
  api.get(`/salons/${salonId}/available-slots`, { params: { date, serviceId } });

module.exports = { bookingPayload, createBooking, cancelBooking, getSlots };
