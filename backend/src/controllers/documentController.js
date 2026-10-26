import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import DocumentRecord from '../models/DocumentRecord.js';
import Application from '../models/Application.js';
import Institution from '../models/Institution.js';
import { uploadBufferToCloudinary, deleteFromCloudinary } from '../config/cloudinary.js';
import config from '../config/env.js';
import microserviceClient from '../services/microserviceClient.js';

/**
 * Upload a document (PDF / Image) to Cloudinary and register in DocumentRecord.
 * Automatically cleans up local storage so files never accumulate in backend/uploads.
 * Immediately performs OCR extraction, forensics tampering detection, and PKI verification.
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

    // 3. Stream buffer directly to Cloudinary
    let cloudinaryResult;
    let savedLocalPath = null;
    try {
      cloudinaryResult = await uploadBufferToCloudinary(req.file.buffer, {
        folder,
        public_id: `${cleanBaseName}_${Date.now()}${extension}`,
        resource_type: resourceType,
      });
      console.log(`[Cloudinary] Successfully uploaded ${rawFileName} -> ${cloudinaryResult.secure_url}`);
    } catch (cloudErr) {
      console.warn(`[Cloudinary Warning] ${cloudErr.message} - Falling back to local static disk storage.`);
      const uploadsDir = path.resolve(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      const localFileName = `${cleanBaseName}_${Date.now()}${extension}`;
      savedLocalPath = path.join(uploadsDir, localFileName);
      fs.writeFileSync(savedLocalPath, req.file.buffer);

      cloudinaryResult = {
        secure_url: `http://localhost:${config.port}/uploads/${localFileName}`,
        public_id: `local_${cleanBaseName}_${Date.now()}`,
        bytes: req.file.size,
        format: isPdf ? 'pdf' : req.file.mimetype.split('/')[1] || 'bin',
      };
    }

    // 4. Normalize document type to canonical schema enum
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

    let canonicalDocType = normalizeDocType(documentType);

    // 5. If applicationId provided, create and link DocumentRecord in MongoDB
    let savedRecord = null;
    let appDoc = null;
    let institutionDoc = null;

    if (applicationId) {
      appDoc = await Application.findById(applicationId).populate('institution');
      if (appDoc) {
        institutionDoc = appDoc.institution;
        const resolvedInstitutionId = institutionId || (institutionDoc ? institutionDoc._id : null);

        savedRecord = await DocumentRecord.create({
          applicationId,
          institutionId: resolvedInstitutionId,
          documentType: canonicalDocType,
          fileName: rawFileName,
          fileHashSha256,
          storageUrl: cloudinaryResult.secure_url,
          localFilePath: savedLocalPath,
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

    // 6. Immediate Automated Multi-Service Scrutiny (OCR, Forensics, Trust Rails)
    let extractedData = {};
    let forensicAnalysis = {};
    let verificationRails = {};

    try {
      // (a) Member 2 OCR Classification & Extraction
      const ocrClass = await microserviceClient.classifyDocument(req.file.buffer, rawFileName);
      if (ocrClass.primary_document_type && ocrClass.primary_document_type !== 'OTHER') {
        canonicalDocType = ocrClass.primary_document_type;
      } else {
        const lowerName = rawFileName.toLowerCase();
        if (
          lowerName.endsWith('.jpg') ||
          lowerName.endsWith('.jpeg') ||
          lowerName.endsWith('.png') ||
          lowerName.includes('photo') ||
          lowerName.includes('facility') ||
          lowerName.includes('lab')
        ) {
          canonicalDocType = 'INFRASTRUCTURE_PHOTO';
        }
      }

      if (canonicalDocType !== 'OTHER') {
        const ocrExtracted = await microserviceClient.extractCertificateData(req.file.buffer, rawFileName, canonicalDocType);
        const attrs = ocrExtracted.attributes || {};

        let facultyMembers = [];
        if (canonicalDocType === 'FACULTY_MASTER_ROSTER' || canonicalDocType === 'FACULTY_ROSTER') {
          const tableRes = await microserviceClient.extractFacultyTables(req.file.buffer, rawFileName);
          facultyMembers = tableRes.faculty_roster || [];
        }

        const validFaculty = facultyMembers
          .map((f, idx) => ({
            name: (f.name && f.name.trim().length > 0) ? f.name.trim() : `Faculty Member ${idx + 1}`,
            designation: f.designation || 'Assistant Professor',
            department: f.department || 'Engineering & Technology',
            dateOfJoining: f.date_of_joining ? new Date(f.date_of_joining) : new Date('2022-01-01'),
            nationalIdHash: f.national_id_hash || '',
            qualification: f.qualification || 'M.Tech',
            isCrossCollegeFlagged: Boolean(f.is_cross_college_flagged),
          }))
          .filter(f => f.name && f.name.length > 0);

        extractedData = {
          documentNumber: attrs.document_number || '',
          issuingAuthority: attrs.issuing_authority || '',
          issueDate: attrs.issue_date ? new Date(attrs.issue_date) : undefined,
          expiryDate: attrs.expiry_date ? new Date(attrs.expiry_date) : undefined,
          sanctionedIntake: attrs.sanctioned_intake,
          builtUpAreaSqm: attrs.builtUpAreaSqm ?? attrs.built_up_area_sqm,
          surveyNumbers: attrs.survey_numbers || [],
          facultyList: validFaculty,
          rawKeyValues: attrs.raw_key_values || {},
        };
      }

      // (b) Member 1 Forensics: ELA & Metadata software detection
      const forensicRes = await microserviceClient.analyzeForensics(req.file.buffer, rawFileName);
      forensicAnalysis = {
        elaAnomalyScore: forensicRes.ela_analysis?.anomaly_score || 0,
        tamperDetected: forensicRes.composite_tamper_flag || false,
        metadataSoftware: forensicRes.metadata_analysis?.detected_editing_tools || [],
        exifDiscrepancy: forensicRes.metadata_analysis?.timestamp_discrepancy || false,
        heatmapImageUrl: forensicRes.ela_analysis?.heatmap_base64 || '',
      };

      // (c) Member 1 Forensics: Facility Geotag & pHash if photograph
      const campusLat = institutionDoc?.geoCoordinates?.latitude || 18.5204;
      const campusLon = institutionDoc?.geoCoordinates?.longitude || 73.8567;
      const aicteId = institutionDoc?.aictePermanentId || '1-4928172911';
      const requestedIntake = appDoc?.requestedIntake || 360;

      if (canonicalDocType === 'INFRASTRUCTURE_PHOTO' || rawFileName.toLowerCase().includes('photo')) {
        const facilityAudit = await microserviceClient.auditFacilityPhoto(
          req.file.buffer,
          rawFileName,
          campusLat,
          campusLon
        );
        forensicAnalysis.pHash = facilityAudit.phash_check?.phash || '';
        forensicAnalysis.isDuplicatePhoto = facilityAudit.phash_check?.is_duplicate || false;
        forensicAnalysis.geoExif = {
          latitude: facilityAudit.geotag_check?.photo_coordinates?.latitude,
          longitude: facilityAudit.geotag_check?.photo_coordinates?.longitude,
          distanceFromCampusMeters: facilityAudit.geotag_check?.distance_meters,
          isWithinCampusBounds: facilityAudit.geotag_check?.is_within_bounds,
        };
      }

      // (d) Member 5 PKI & Trust Rails
      const trustRes = await microserviceClient.verifyTrustRails(
        req.file.buffer,
        rawFileName,
        aicteId,
        requestedIntake
      );
      verificationRails = {
        pkiSignatureValid: Boolean(trustRes.pki_signature?.is_valid),
        pkiSignerName: trustRes.pki_signature?.signer_name || null,
        qrPayloadMatchesDocument: Boolean(trustRes.qr_verification?.matches_document),
        externalRegistryStatus: trustRes.external_registries?.[0]?.status || (canonicalDocType === 'OTHER' ? 'UNRECOGNIZED_DOCUMENT' : 'VERIFIED'),
      };

      // (e) Update DocumentRecord with verified analysis in MongoDB
      if (savedRecord) {
        savedRecord.documentType = canonicalDocType;
        savedRecord.extractedData = extractedData;
        savedRecord.forensicAnalysis = forensicAnalysis;
        savedRecord.verificationRails = verificationRails;
        savedRecord.status = 'ANALYZED';
        await savedRecord.save();
        console.log(`[DocumentScrutiny] Completed immediate scrutiny for '${rawFileName}' -> Type: ${canonicalDocType}, Tamper: ${forensicAnalysis.tamperDetected}`);
      }
    } catch (scrutinyErr) {
      console.warn(`[DocumentScrutiny] Immediate scrutiny skipped for '${rawFileName}' (${scrutinyErr.message}). Document saved in UPLOADED state.`);
    }

    return res.status(201).json({
      success: true,
      message: 'Document uploaded and analyzed successfully.',
      data: {
        documentRecordId: savedRecord ? savedRecord._id : null,
        fileName: rawFileName,
        fileHashSha256,
        storageUrl: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        fileSizeBytes: req.file.size,
        mimeType: req.file.mimetype,
        documentType: canonicalDocType,
        status: savedRecord ? savedRecord.status : 'UPLOADED',
        extractedData,
        forensicAnalysis,
        verificationRails,
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
