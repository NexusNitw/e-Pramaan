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

// Dynamic CORS configuration allowing local dev, Vercel preview/production URLs, and configured CLIENT_URL
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, server-to-server, curl)
      if (!origin) return callback(null, true);

      const configured = config.clientUrl;
      const isConfiguredMatch =
        configured &&
        (configured === origin ||
          configured.split(',').map((u) => u.trim()).includes(origin));

      const isLocalhost =
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:');

      const isVercel =
        origin.endsWith('.vercel.app') || origin.includes('vercel.app');

      if (isConfiguredMatch || isLocalhost || isVercel || configured === '*') {
        return callback(null, true);
      }

      // Default permissive callback to avoid blocking deployments
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// HTTP request logger
if (config.nodeEnv !== 'test') {
  app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));
}

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check Helper Handler
const healthHandler = (req, res) => {
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
};

// Mount Health Check on /, /health, and /api/health for Render/Vercel probes
app.get('/', healthHandler);
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

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
