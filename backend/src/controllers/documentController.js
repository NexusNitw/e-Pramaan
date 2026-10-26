import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import DocumentRecord from '../models/DocumentRecord.js';
import Application from '../models/Application.js';
import Institution from '../models/Institution.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import config from '../config/env.js';

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

    // 2. Sanitize filename and preserve extension for inline browser previewing
    const rawFileName = req.file.originalname || 'document.pdf';
    const isPdf = req.file.mimetype === 'application/pdf' || rawFileName.toLowerCase().endsWith('.pdf');
    const extension = isPdf ? '.pdf' : (path.extname(rawFileName) || '');
    const cleanBaseName = rawFileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_');
    const resourceType = isPdf ? 'raw' : 'auto';
    const folder = applicationId
      ? `aicte-epranam/applications/${applicationId}`
      : 'aicte-epranam/temp_uploads';

    // 3. Persist local copy on server disk so microservices can always inspect real raw bytes
    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    const localFileName = `${cleanBaseName}_${Date.now()}${extension}`;
    const localFilePath = path.join(uploadsDir, localFileName);
    fs.writeFileSync(localFilePath, req.file.buffer);

    // 4. Stream buffer to Cloudinary
    let cloudinaryResult;
    try {
      cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
        folder,
        public_id: `${cleanBaseName}_${Date.now()}${extension}`,
        resource_type: resourceType,
      });
    } catch (cloudErr) {
      console.warn(`[Cloudinary Warning] ${cloudErr.message} - Using local static upload URL.`);
      cloudinaryResult = {
        secure_url: `http://localhost:${config.port}/uploads/${localFileName}`,
        public_id: `local_${cleanBaseName}_${Date.now()}`,
        bytes: req.file.size,
        format: isPdf ? 'pdf' : req.file.mimetype.split('/')[1] || 'bin',
      };
    }

    // 5. Normalize document type to canonical schema enum
    const normalizeDocType = (type) => {
      if (!type) return 'OTHER';
      const clean = String(type).trim().toUpperCase();
      const map = {
        FIRE_NOC: 'FIRE_SAFETY_NOC',
        FIRE_SAFETY_NOC: 'FIRE_SAFETY_NOC',
        BUILDING_PLAN: 'BUILDING_PLAN_APPROVAL',
        BUILDING_PLAN_APPROVAL: 'BUILDING_PLAN_APPROVAL',
        AFFILIATION_LETTER: 'UNIVERSITY_AFFILIATION_LETTER',
        UNIVERSITY_AFFILIATION_LETTER: 'UNIVERSITY_AFFILIATION_LETTER',
        FACULTY_ROSTER: 'FACULTY_MASTER_ROSTER',
        FACULTY_MASTER_ROSTER: 'FACULTY_MASTER_ROSTER',
        INFRA_PHOTO: 'INFRASTRUCTURE_PHOTO',
        INFRASTRUCTURE_PHOTO: 'INFRASTRUCTURE_PHOTO',
        LAND_DEED: 'LAND_TITLE_DEED',
        LAND_TITLE_DEED: 'LAND_TITLE_DEED',
      };
      return map[clean] || 'OTHER';
    };

    const canonicalDocType = normalizeDocType(documentType);

    // 6. If applicationId provided, create and link DocumentRecord in MongoDB
    let savedRecord = null;
    if (applicationId) {
      const appExists = await Application.findById(applicationId);
      if (appExists) {
        const resolvedInstitutionId = institutionId || appExists.institution;

        savedRecord = await DocumentRecord.create({
          applicationId,
          institutionId: resolvedInstitutionId,
          documentType: canonicalDocType,
          fileName: rawFileName,
          fileHashSha256,
          storageUrl: cloudinaryResult.secure_url,
          localFilePath,
          fileSizeBytes: req.file.size,
          mimeType: req.file.mimetype,
          status: 'UPLOADED',
        });

        // Attach document reference to application
        await Application.findByIdAndUpdate(applicationId, {
          $addToSet: { documents: savedRecord._id },
        });

        console.log(`[MongoDB] Successfully linked document ${savedRecord._id} (${canonicalDocType}) to application ${applicationId}`);
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
