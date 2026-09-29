require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

const SEED_FILE = path.join(__dirname, '..', '..', '.seed.json');

module.exports = async () => {
  if (!fs.existsSync(SEED_FILE)) return;
  const seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf8'));
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/salon-db';
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    const db = client.db();
    const salonIds = [seed.salonId, seed.otherSalonId].map((id) => new ObjectId(id));
    await db.collection('bookings').deleteMany({ salonId: { $in: salonIds } });
    await db.collection('services').deleteMany({ salonId: { $in: salonIds } });
    await db.collection('salons').deleteMany({ _id: { $in: salonIds } });
    await db.collection('users').deleteMany({ email: /@e2e\.test$/ });
  } finally {
    await client.close();
    fs.unlinkSync(SEED_FILE);
  }
};
