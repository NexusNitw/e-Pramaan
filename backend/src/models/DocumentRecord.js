import mongoose from 'mongoose';

const FacultyMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    designation: { type: String, default: 'Assistant Professor' },
    department: { type: String, required: true },
    dateOfJoining: { type: Date },
    nationalIdHash: { type: String, index: true }, // SHA-256 of Aadhaar/PAN to detect ghost faculty across colleges
    qualification: { type: String },
    isCrossCollegeFlagged: { type: Boolean, default: false },
    concurrentInstitutionNames: [{ type: String }],
  },
  { _id: false }
);

const DocumentRecordSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    institutionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Institution',
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: [
        'FIRE_SAFETY_NOC',
        'FIRE_NOC',
        'LAND_TITLE_DEED',
        'UNIVERSITY_AFFILIATION_LETTER',
        'AFFILIATION_LETTER',
        'BUILDING_PLAN_APPROVAL',
        'BUILDING_PLAN',
        'FACULTY_MASTER_ROSTER',
        'FACULTY_ROSTER',
        'INFRASTRUCTURE_PHOTO',
        'INFRA_PHOTO',
        'OTHER',
      ],
      default: 'OTHER',
      required: true,
      index: true,
    },
    fileName: { type: String, required: true },
    fileHashSha256: { type: String, required: true },
    storageUrl: { type: String, required: true },
    fileSizeBytes: { type: Number, default: 0 },
    pageCount: { type: Number, default: 1 },
    mimeType: { type: String, default: 'application/pdf' },

    // Ingestion QA & Blur Check
    preScrutiny: {
      isBlurry: { type: Boolean, default: false },
      laplacianVariance: { type: Number, default: 0 },
      deskewAngle: { type: Number, default: 0 },
      isLegible: { type: Boolean, default: true },
    },

    // Extracted Attributes (Member 2 OCR)
    extractedData: {
      documentNumber: { type: String, default: '' },
      issuingAuthority: { type: String, default: '' },
      issueDate: { type: Date },
      expiryDate: { type: Date },
      sanctionedIntake: { type: Number },
      builtUpAreaSqm: { type: Number },
      surveyNumbers: [{ type: String }],
      facultyList: [FacultyMemberSchema],
      rawKeyValues: { type: mongoose.Schema.Types.Mixed, default: {} },
      boundingBoxes: [{ type: mongoose.Schema.Types.Mixed }],
    },

    // Computer Vision & Forensics (Member 1)
    forensicAnalysis: {
      elaAnomalyScore: { type: Number, min: 0, max: 100, default: 0 },
      tamperDetected: { type: Boolean, default: false },
      metadataSoftware: [{ type: String }],
      exifDiscrepancy: { type: Boolean, default: false },
      pHash: { type: String, default: '' },
      isDuplicatePhoto: { type: Boolean, default: false },
      duplicateRefId: { type: mongoose.Schema.Types.ObjectId, ref: 'DocumentRecord' },
      geoExif: {
        latitude: { type: Number },
        longitude: { type: Number },
        distanceFromCampusMeters: { type: Number },
        isWithinCampusBounds: { type: Boolean },
      },
      flaggedRegions: [
        {
          x: Number,
          y: Number,
          width: Number,
          height: Number,
          label: String,
          confidence: Number,
        },
      ],
      heatmapImageUrl: { type: String, default: '' },
    },

    // Trust & Verification Rails (Member 5)
    verificationRails: {
      pkiSignatureValid: { type: Boolean, default: false },
      pkiSignerName: { type: String, default: '' },
      pkiSigningTime: { type: Date },
      pkiCertExpiry: { type: Date },
      qrPayloadDecoded: { type: String, default: '' },
      qrPayloadMatchesDocument: { type: Boolean, default: false },
      externalRegistryStatus: {
        type: String,
        enum: ['UNVERIFIED', 'VERIFIED', 'EXPIRED', 'MISMATCH', 'SOURCE_DOWN'],
        default: 'UNVERIFIED',
      },
      registryRemarks: { type: String, default: '' },
    },

    status: {
      type: String,
      enum: ['UPLOADED', 'PROCESSING', 'ANALYZED', 'REJECTED_ILLEGIBLE'],
      default: 'UPLOADED',
    },
  },
  {
    timestamps: true,
  }
);

const DocumentRecord = mongoose.model('DocumentRecord', DocumentRecordSchema);
export default DocumentRecord;
