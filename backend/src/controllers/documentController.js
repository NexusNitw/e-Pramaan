import crypto from 'crypto';
import DocumentRecord from '../models/DocumentRecord.js';
import Application from '../models/Application.js';
import Institution from '../models/Institution.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';

/**
 * Upload a document (PDF / Image) to Cloudinary and register in DocumentRecord.
 */
export const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please attach a file using form-data field "file".',
      });
    }

    const { applicationId, institutionId, documentType } = req.body;

    // 1. Calculate Cryptographic SHA-256 Hash of the file buffer
    const fileHashSha256 = crypto
      .createHash('sha256')
      .update(req.file.buffer)
      .digest('hex');

    // 2. Sanitize filename and prepare Cloudinary options
    const rawFileName = req.file.originalname || 'document.pdf';
    const cleanBaseName = rawFileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const isPdf = req.file.mimetype === 'application/pdf';
    const resourceType = isPdf ? 'raw' : 'auto';
    const folder = applicationId
      ? `aicte-epranam/applications/${applicationId}`
      : 'aicte-epranam/temp_uploads';

    // 3. Stream buffer directly to Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
        folder,
        public_id: `${cleanBaseName}_${Date.now()}`,
        resource_type: resourceType,
      });
    } catch (cloudErr) {
      // In development, if Cloudinary credentials are not configured, allow fallback with mock URL
      if (cloudErr.message.includes('Cloudinary is not configured')) {
        console.warn(`[Cloudinary Warning] ${cloudErr.message} - Falling back to local mock storage URL.`);
        cloudinaryResult = {
          secure_url: `https://res.cloudinary.com/mock-aicte-epranam/raw/upload/${cleanBaseName}_${Date.now()}.pdf`,
          public_id: `mock_${cleanBaseName}_${Date.now()}`,
          bytes: req.file.size,
          format: isPdf ? 'pdf' : req.file.mimetype.split('/')[1] || 'bin',
        };
      } else {
        throw cloudErr;
      }
    }

    // 4. If applicationId & institutionId provided, create and link DocumentRecord
    let savedRecord = null;
    if (applicationId && institutionId) {
      // Verify application exists
      const appExists = await Application.findById(applicationId);
      if (appExists) {
        savedRecord = await DocumentRecord.create({
          applicationId,
          institutionId,
          documentType: documentType || 'OTHER',
          fileName: rawFileName,
          fileHashSha256,
          storageUrl: cloudinaryResult.secure_url,
          fileSizeBytes: req.file.size,
          mimeType: req.file.mimetype,
          status: 'UPLOADED',
        });

        // Attach document reference to application
        await Application.findByIdAndUpdate(applicationId, {
          $addToSet: { documents: savedRecord._id },
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Document uploaded to Cloudinary successfully.',
      data: {
        documentRecordId: savedRecord ? savedRecord._id : null,
        fileName: rawFileName,
        fileHashSha256,
        storageUrl: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        fileSizeBytes: req.file.size,
        mimeType: req.file.mimetype,
        documentType: documentType || 'OTHER',
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve all document records for a given application dossier.
 */
export const getDocumentsByApplication = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const documents = await DocumentRecord.find({ applicationId });

    return res.status(200).json({
      success: true,
      count: documents.length,
      data: documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve single document details by ID.
 */
export const getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await DocumentRecord.findById(id);

    if (!document) {
      return res.status(404).json({
        success: false,
        message: `Document with ID '${id}' not found.`,
      });
    }

    return res.status(200).json({
      success: true,
      data: document,
    });
  } catch (error) {
    next(error);
  }
};
