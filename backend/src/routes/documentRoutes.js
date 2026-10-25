import express from 'express';
import multer from 'multer';
import {
  uploadDocument,
  getDocumentsByApplication,
  getDocumentById,
} from '../controllers/documentController.js';

const router = express.Router();

// In-memory buffering: files stream directly from client to Cloudinary without persisting on server disk
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 Megabytes
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ];

    if (allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `Unsupported file type '${file.mimetype}'. Only PDF and image files (JPEG, PNG, WebP) are permitted for regulatory scrutiny.`
        )
      );
    }
  },
});

// Routes
router.post('/upload', upload.single('file'), uploadDocument);
router.get('/application/:applicationId', getDocumentsByApplication);
router.get('/:id', getDocumentById);

export default router;
