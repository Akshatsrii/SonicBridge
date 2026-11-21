import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnected = false;
let memoryStore = new Map(); // Fallback when MongoDB is not running locally

export async function connectDB() {
  if (isConnected) return true;

  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sonicbridge';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Quick timeout to fallback if no local Mongo
    });
    isConnected = true;
    console.log(`[MongoDB] Connected to host: ${conn.connection.host}`);
    return true;
  } catch (err) {
    console.warn(`[MongoDB Warning] Could not connect to MongoDB (${err.message}).`);
    console.warn(`[MongoDB] Operating in high-speed resilient in-memory mode for offline gaming zones.`);
    isConnected = false;
    return false;
  }
}

export function getMemoryStore() {
  return memoryStore;
}

export function isDbConnected() {
  return isConnected;
}
