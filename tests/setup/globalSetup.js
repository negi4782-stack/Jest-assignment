require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const { MongoClient, ObjectId } = require('mongodb');

const SEED_FILE = path.join(__dirname, '..', '..', '.seed.json');

module.exports = async () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:3000/api';
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/salon-db';

  // 1. API must be running
  try {
    await axios.get(new URL(baseUrl).origin, { timeout: 5000 });
  } catch (e) {
    throw new Error(`API not reachable at ${baseUrl}. Start the app first (npm run dev).`);
  }

  // 2. Seed data straight into MongoDB (stylists/admin cannot be created via API)
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
  } catch (e) {
    throw new Error(`Cannot connect to MongoDB at ${uri}. Is it running?`);
  }
  const db = client.db();
  const now = new Date();
  const ts = { createdAt: now, updatedAt: now };
  const hash = await bcrypt.hash('AdminPass!23', 10);
  const stamp = Date.now();

  const salonId = new ObjectId();
  const otherSalonId = new ObjectId();
  const service60Id = new ObjectId();
  const service30Id = new ObjectId();
  const otherSalonServiceId = new ObjectId();
  const stylistIds = [new ObjectId(), new ObjectId()];
  const adminId = new ObjectId();

  await db.collection('salons').insertMany([
    { _id: salonId, name: 'E2E Test Salon', location: 'Test City', openTime: '09:00', closeTime: '18:00', ...ts },
    { _id: otherSalonId, name: 'E2E Other Salon', location: 'Test City', openTime: '09:00', closeTime: '18:00', ...ts },
  ]);
  await db.collection('services').insertMany([
    { _id: service60Id, name: 'E2E Haircut', duration: 60, price: 500, salonId, ...ts },
    { _id: service30Id, name: 'E2E Trim', duration: 30, price: 300, salonId, ...ts },
    { _id: otherSalonServiceId, name: 'E2E Other Service', duration: 60, price: 400, salonId: otherSalonId, ...ts },
  ]);
  await db.collection('users').insertMany([
    { _id: stylistIds[0], name: 'E2E Stylist One', email: `stylist1_${stamp}@e2e.test`, password: hash, role: 'stylist', ...ts },
    { _id: stylistIds[1], name: 'E2E Stylist Two', email: `stylist2_${stamp}@e2e.test`, password: hash, role: 'stylist', ...ts },
    { _id: adminId, name: 'E2E Admin', email: `admin_${stamp}@e2e.test`, password: hash, role: 'admin', ...ts },
  ]);
  await client.close();

  fs.writeFileSync(SEED_FILE, JSON.stringify({
    salonId: salonId.toString(),
    otherSalonId: otherSalonId.toString(),
    service60Id: service60Id.toString(),
    service30Id: service30Id.toString(),
    otherSalonServiceId: otherSalonServiceId.toString(),
    stylistIds: stylistIds.map(String),
    admin: { email: `admin_${stamp}@e2e.test`, password: 'AdminPass!23' },
  }, null, 2));
};
