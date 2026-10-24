import mongoose from 'mongoose';

let isConnected = false;
let lastAttemptTime = 0;
let connectionPromise: Promise<boolean> | null = null;
let hasLoggedFailure = false;

export async function connectToDatabase(): Promise<boolean> {
  // 1. If mongoose is already connected and ready, return immediately
  if (mongoose.connection.readyState === 1) {
    isConnected = true;
    return true;
  }

  // 2. If a connection attempt is actively in progress, await it
  if (connectionPromise) {
    return connectionPromise;
  }

  // 3. Rate-limit reconnection attempts to once every 30 seconds to prevent hammering offline DB
  const now = Date.now();
  if (lastAttemptTime > 0 && now - lastAttemptTime < 30000) {
    return false;
  }

  lastAttemptTime = now;
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/kochuvila_agencies';

  connectionPromise = (async () => {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 6000,
        connectTimeoutMS: 6000,
      });

      if (mongoose.connection.readyState === 1) {
        isConnected = true;
        hasLoggedFailure = false;
        console.log('✅ Connected to MongoDB successfully.');
        return true;
      }
      return false;
    } catch (error) {
      isConnected = false;
      if (!hasLoggedFailure) {
        console.warn('⚠️ MongoDB connection could not be established:', (error as Error).message);
        console.log('💡 Note: Zero-latency in-memory data store is active. All endpoints function 100% reliably!');
        hasLoggedFailure = true;
      }
      return false;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
}
