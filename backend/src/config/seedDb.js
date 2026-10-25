import Institution from '../models/Institution.js';
import Application from '../models/Application.js';
import DocumentRecord from '../models/DocumentRecord.js';
import AuditTrail from '../models/AuditTrail.js';

export const seedDatabaseIfEmpty = async () => {
  try {
    const appCount = await Application.countDocuments();
    if (appCount > 0) {
      return; // Already populated
    }

    console.log('[Database Seeder] Initializing canonical AICTE regulatory benchmark dossiers...');

    // 1. Clean Institute
    const instClean = await Institution.create({
      aictePermanentId: '1-4928172911',
      name: 'National Institute of Advanced Engineering & Technology',
      category: 'ENGINEERING_TECH',
      address: { street: 'Sinhagad Road', district: 'Pune', state: 'Maharashtra', postalCode: '411041' },
      geoCoordinates: { latitude: 18.5204, longitude: 73.8567, geofenceRadiusMeters: 800 },
      landDetails: { totalAreaSqm: 35000, surveyNumbers: ['88/1', '88/2'], ownershipStatus: 'OWNED' },
      sanctionedPrograms: [{ programName: 'B.Tech Computer Engineering', approvedIntake: 240, academicYear: '2026-2027' }],
      contactPerson: { name: 'Dr. Anand Joshi', email: 'director@niaet.ac.in', phone: '+91-9822019283' },
    });

    const appClean = await Application.create({
      applicationNumber: 'AICTE-2026-EOA-1082',
      institution: instClean._id,
      category: 'EXTENSION_OF_APPROVAL',
      requestedIntake: 420,
      totalStudentEnrolled: 1580,
      academicYear: '2026-2027',
      triageStatus: 'GREEN_COMPLIANT',
      compositeRiskScore: 4.5,
      status: 'SCRUTINY_COMPLETED',
    });

    const docClean = await DocumentRecord.create({
      applicationId: appClean._id,
      institutionId: instClean._id,
      documentType: 'FIRE_SAFETY_NOC',
      fileName: 'Fire_NOC_Renewal_2026.pdf',
      fileHashSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      storageUrl: 'https://res.cloudinary.com/aicte-epranam/raw/upload/Fire_NOC_Renewal_2026.pdf',
      fileSizeBytes: 245000,
      status: 'ANALYZED',
      extractedData: {
        documentNumber: 'MH-FIRE-2026-0921',
        issuingAuthority: 'State Fire & Rescue Services Department',
        issueDate: new Date('2026-01-15'),
        expiryDate: new Date('2027-01-14'),
        builtUpAreaSqm: 14200,
      },
      forensicAnalysis: {
        elaAnomalyScore: 6.2,
        tamperDetected: false,
        metadataSoftware: ['Canon Scanner Utility'],
        exifDiscrepancy: false,
      },
      verificationRails: {
        pkiSignatureValid: true,
        pkiSignerName: 'Chief Fire Officer, Pune Division',
        qrPayloadMatchesDocument: true,
        externalRegistryStatus: 'VERIFIED',
      },
    });

    await Application.findByIdAndUpdate(appClean._id, { $push: { documents: docClean._id } });

    // 2. Tampered Intake (High Risk)
    const instTampered = await Institution.create({
      aictePermanentId: '1-8492018471',
      name: 'Kalinga Institute of Information Technology',
      category: 'ENGINEERING_TECH',
      address: { street: 'Bhubaneswar Tech Park', district: 'Khordha', state: 'Odisha', postalCode: '751024' },
      geoCoordinates: { latitude: 20.3533, longitude: 85.8195, geofenceRadiusMeters: 800 },
      landDetails: { totalAreaSqm: 28000, surveyNumbers: ['410/A'], ownershipStatus: 'OWNED' },
      sanctionedPrograms: [{ programName: 'B.Tech IT', approvedIntake: 180, academicYear: '2026-2027' }],
      contactPerson: { name: 'Prof. Subhash Chandra', email: 'dean@kiit-info.edu', phone: '+91-9437012345' },
    });

    const appTampered = await Application.create({
      applicationNumber: 'AICTE-2026-INC-3190',
      institution: instTampered._id,
      category: 'INCREASE_IN_INTAKE',
      requestedIntake: 600,
      totalStudentEnrolled: 2100,
      academicYear: '2026-2027',
      triageStatus: 'RED_HIGH_RISK_FORGERY',
      compositeRiskScore: 88.5,
      status: 'SCRUTINY_COMPLETED',
    });

    const docTampered = await DocumentRecord.create({
      applicationId: appTampered._id,
      institutionId: instTampered._id,
      documentType: 'UNIVERSITY_AFFILIATION_LETTER',
      fileName: 'Affiliation_Sanction_2026.pdf',
      fileHashSha256: 'a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
      storageUrl: 'https://res.cloudinary.com/aicte-epranam/raw/upload/Affiliation_Sanction_2026.pdf',
      fileSizeBytes: 312000,
      status: 'ANALYZED',
      extractedData: {
        documentNumber: 'BPUT-AFFIL-2026-081',
        issuingAuthority: 'Biju Patnaik University of Technology',
        sanctionedIntake: 600,
      },
      forensicAnalysis: {
        elaAnomalyScore: 92.4,
        tamperDetected: true,
        metadataSoftware: ['Adobe Photoshop CC 2024'],
        exifDiscrepancy: true,
      },
      verificationRails: {
        pkiSignatureValid: false,
        qrPayloadMatchesDocument: false,
        externalRegistryStatus: 'MISMATCH',
        registryRemarks: 'Registry records state approved intake is 240, submitted claim is 600.',
      },
    });

    await Application.findByIdAndUpdate(appTampered._id, { $push: { documents: docTampered._id } });

    console.log('[Database Seeder] Successfully seeded initial canonical AICTE benchmark dossiers into MongoDB Atlas.');
  } catch (err) {
    console.warn('[Database Seeder] Non-blocking seeding error:', err.message);
  }
};
