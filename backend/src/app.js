import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import config from './config/env.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

import institutionRoutes from './routes/institutionRoutes.js';
import applicationRoutes from './routes/applicationRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import ruleRoutes from './routes/ruleRoutes.js';
import scrutinyRoutes from './routes/scrutinyRoutes.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: config.clientUrl || '*',
    credentials: true,
  })
);

// HTTP request logger
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
}

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Service Health & Diagnostic Check
app.get('/api/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED';
  res.status(200).json({
    status: 'ONLINE',
    service: 'AICTE E-Pranam Orchestration Gateway',
    version: '1.0.0',
    environment: config.nodeEnv,
    database: {
      status: dbStatus,
      host: mongoose.connection.host || 'unknown',
    },
    timestamp: new Date().toISOString(),
  });
});

// Mount Core API Routes
app.use('/api/institutions', institutionRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/scrutiny', scrutinyRoutes);

// Catch-all 404 and global error handling
app.use(notFound);
app.use(errorHandler);

export default app;
