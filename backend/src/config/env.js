import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/aicte_epranam',
  jwtSecret: process.env.JWT_SECRET || 'epranam_default_dev_secret',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  services: {
    forensics: process.env.FORENSICS_SERVICE_URL || process.env.PYTHON_SERVICES_URL || 'http://localhost:8000',
    ocr: process.env.OCR_SERVICE_URL || process.env.PYTHON_SERVICES_URL || 'http://localhost:8000',
    verification: process.env.VERIFICATION_SERVICE_URL || process.env.PYTHON_SERVICES_URL || 'http://localhost:8000',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
};

export default config;
