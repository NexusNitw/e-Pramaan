import mongoose from 'mongoose';
import config from './env.js';

/**
 * Connect to MongoDB Atlas cluster with auto-reconnect handling.
 */
export const connectDB = async () => {
  const options = {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  };

  try {
    const conn = await mongoose.connect(config.mongoUri, options);
    console.log(`[MongoDB Atlas] Connected successfully to host: ${conn.connection.host} / database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`[MongoDB Atlas] Initial connection error: ${error.message}`);
    // Do not crash the server in dev mode if MongoDB is temporarily unreachable
    if (config.nodeEnv === 'production') {
      process.exit(1);
    }
  }

  mongoose.connection.on('error', (err) => {
    console.error(`[MongoDB Atlas] Runtime connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB Atlas] Disconnected from database. Attempting reconnect...');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB Atlas] Reconnected successfully.');
  });
};

/**
 * Gracefully close database connection on process termination.
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('[MongoDB Atlas] Connection closed cleanly.');
  } catch (err) {
    console.error(`[MongoDB Atlas] Error during disconnect: ${err.message}`);
  }
};
