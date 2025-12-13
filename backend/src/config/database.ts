import { PrismaClient } from '@prisma/client';
import { MongoClient } from 'mongodb';

export const prisma = new PrismaClient();

let mongoClient: MongoClient | null = null;

export async function initializeMongo() {
  const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
  try {
    mongoClient = new MongoClient(mongoUrl);
    await mongoClient.connect();
    console.log('  ✅ MongoDB:   Connected');
  } catch (e) {
    console.warn('  ⚠️  MongoDB:   Unavailable (optional, will retry)');
  }
}

export function getMongo() {
  return mongoClient;
}
