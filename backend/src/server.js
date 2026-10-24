import app from './app.js';
import config from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';

const startServer = async () => {
  // Connect to MongoDB Atlas
  await connectDB();

  const server = app.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(` AICTE E-Pranam Orchestrator Gateway running on port ${config.port}`);
    console.log(` Environment: ${config.nodeEnv}`);
    console.log(` Health check: http://localhost:${config.port}/api/health`);
    console.log(`=======================================================`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await disconnectDB();
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
};

startServer().catch((err) => {
  console.error('Fatal server boot error:', err);
  process.exit(1);
});
