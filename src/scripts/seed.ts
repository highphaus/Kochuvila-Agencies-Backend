import { seedDatabase } from '../services/data-store';
import { connectToDatabase } from '../config/db';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function runSeed() {
  console.log('🌱 Starting database seed for Kochuvila Agencies...');
  await connectToDatabase();
  const result = await seedDatabase();
  console.log('✅ Result:', result.message);
  console.log('📊 Counts:', result.counts);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exit(0);
}

runSeed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
