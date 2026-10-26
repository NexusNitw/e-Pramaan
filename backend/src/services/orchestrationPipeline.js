import fs from 'fs';
import Application from '../models/Application.js';
import Institution from '../models/Institution.js';
import DocumentRecord from '../models/DocumentRecord.js';
import microserviceClient from './microserviceClient.js';
import riskScorer from './riskScorer.js';
import auditLogger from './auditLogger.js';
import { evaluateApplicationCompliance } from '../engine/ruleEvaluator.js';

class OrchestrationPipeline {
  /**
   * Executes complete end-to-end multi-service analysis pipeline across all attached dossier documents.
   */
  async runFullScrutiny(applicationId, requestContext = {}) {
    const application = await Application.findById(applicationId)
      .populate('institution')
      .populate('documents');

    if (!application) {
      throw new Error(`Application '${applicationId}' not found for scrutiny orchestration.`);
    }

    const institution = application.institution;
    const documents = application.documents || [];

    // 1. Audit Ingestion
    await auditLogger.recordEvent(
      application._id,
      'PRE_SCRUTINY_PASSED',
      { userId: requestContext.userId || 'SYSTEM_DAEMON', role: 'ORCHESTRATOR' },
      { documentCount: documents.length, institutionName: institution.name }
    );

    let maxForensicData = { elaAnomalyScore: 0, tamperDetected: false, metadataSoftware: [] };
    let primaryTrustData = {
      isSigned: false,
      pkiSignatureValid: false,
      pkiSignatureCorrupted: false,
      qrFound: false,
      qrPayloadMatchesDocument: true,
      externalRegistryStatus: 'VERIFIED',
    };
    let allLiveServices = true;

    // 2. Process each attached DocumentRecord via Python microservices
    for (const doc of documents) {
      let fileBuffer = null;

      // First check if stored on local disk
      if (doc.localFilePath && fs.existsSync(doc.localFilePath)) {
        try {
          fileBuffer = await fs.promises.readFile(doc.localFilePath);
        } catch (fsErr) {
          console.warn(`[OrchestrationPipeline] Could not read local file ${doc.localFilePath}: ${fsErr.message}`);
        }
      }

      // Then fallback to remote storageUrl if needed
      if (!fileBuffer && doc.storageUrl && doc.storageUrl.startsWith('http')) {
        try {
          const fileResp = await fetch(doc.storageUrl);
          if (fileResp.ok) {
            const arrayBuf = await fileResp.arrayBuffer();
            fileBuffer = Buffer.from(arrayBuf);
          }
        } catch (fetchErr) {
          console.warn(`[OrchestrationPipeline] Could not fetch document buffer from ${doc.storageUrl}: ${fetchErr.message}`);
        }
      }

      if (!fileBuffer) {
        fileBuffer = Buffer.from(`%PDF-1.4 Empty Payload for ${doc.fileName}`);
      }

      const filename = doc.fileName || 'document.pdf';

      // (a) Member 2 OCR Classification & Extraction
      const ocrClass = await microserviceClient.classifyDocument(fileBuffer, filename);
      if (ocrClass.isLiveService === false) allLiveServices = false;

      // Only reassign documentType if OCR classification identified a specific statutory type with reasonable confidence
      if (ocrClass.primary_document_type && ocrClass.primary_document_type !== 'OTHER') {
        doc.documentType = ocrClass.primary_document_type;
      } else if (!doc.documentType || doc.documentType === 'OTHER') {
        const lowerName = filename.toLowerCase();
        if (
          lowerName.endsWith('.jpg') ||
          lowerName.endsWith('.jpeg') ||
          lowerName.endsWith('.png') ||
          lowerName.includes('photo') ||
          lowerName.includes('facility') ||
          lowerName.includes('lab')
        ) {
          doc.documentType = 'INFRASTRUCTURE_PHOTO';
        } else {
          doc.documentType = 'OTHER';
        }
      }

      if (doc.documentType !== 'OTHER') {
        const ocrExtracted = await microserviceClient.extractCertificateData(fileBuffer, filename, doc.documentType);
        if (ocrExtracted.isLiveService === false) allLiveServices = false;
        const attrs = ocrExtracted.attributes || {};

        let facultyMembers = [];
        if (doc.documentType === 'FACULTY_MASTER_ROSTER' || doc.documentType === 'FACULTY_ROSTER') {
          const tableRes = await microserviceClient.extractFacultyTables(fileBuffer, filename);
          if (tableRes.isLiveService === false) allLiveServices = false;
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

        doc.extractedData = {
          ...doc.extractedData,
          documentNumber: attrs.document_number || doc.extractedData?.documentNumber || '',
          issuingAuthority: attrs.issuing_authority || doc.extractedData?.issuingAuthority || '',
          issueDate: attrs.issue_date ? new Date(attrs.issue_date) : doc.extractedData?.issueDate,
          expiryDate: attrs.expiry_date ? new Date(attrs.expiry_date) : doc.extractedData?.expiryDate,
          sanctionedIntake: attrs.sanctioned_intake ?? doc.extractedData?.sanctionedIntake,
          builtUpAreaSqm: attrs.builtUpAreaSqm ?? attrs.built_up_area_sqm ?? doc.extractedData?.builtUpAreaSqm,
          surveyNumbers: attrs.survey_numbers || doc.extractedData?.surveyNumbers || [],
          facultyList: validFaculty.length > 0 ? validFaculty : (doc.extractedData?.facultyList || []),
          rawKeyValues: attrs.raw_key_values || {},
        };
      } else {
        doc.extractedData = {
          documentNumber: '',
          issuingAuthority: '',
          builtUpAreaSqm: null,
          sanctionedIntake: null,
          surveyNumbers: [],
          facultyList: [],
        };
        await auditLogger.recordEvent(
          application._id,
          'COMPLIANCE_DEFICIENCY_DETECTED',
          { userId: 'AICTE_CLASSIFIER', role: 'OCR_SERVICE' },
          { fileName: doc.fileName, reason: 'Uploaded file does not match any prescribed AICTE statutory regulatory category.' }
        );
      }

      // (b) Member 1 Forensics: ELA & Metadata
      const forensicRes = await microserviceClient.analyzeForensics(fileBuffer, filename);
      if (forensicRes.isLiveService === false) allLiveServices = false;

      doc.forensicAnalysis.elaAnomalyScore = forensicRes.ela_analysis?.anomaly_score || 0;
      doc.forensicAnalysis.tamperDetected = forensicRes.composite_tamper_flag || false;
      doc.forensicAnalysis.metadataSoftware = forensicRes.metadata_analysis?.detected_editing_tools || [];
      doc.forensicAnalysis.exifDiscrepancy = forensicRes.metadata_analysis?.timestamp_discrepancy || false;
      if (forensicRes.ela_analysis?.heatmap_base64) {
        doc.forensicAnalysis.heatmapImageUrl = forensicRes.ela_analysis.heatmap_base64;
      }

      if (forensicRes.composite_tamper_flag) {
        await auditLogger.recordEvent(
          application._id,
          'FORENSIC_TAMPER_FLAGGED',
          { userId: 'MEMBER_1_FORENSICS_WORKER', role: 'CV_MICROSERVICE' },
          { fileName: doc.fileName, anomalyScore: forensicRes.ela_analysis?.anomaly_score, software: forensicRes.metadata_analysis?.detected_editing_tools }
        );
      }

      // (c) Member 1 Forensics: Facility Geotag & pHash if photograph
      if (doc.documentType === 'INFRASTRUCTURE_PHOTO' || filename.toLowerCase().includes('photo')) {
        const facilityAudit = await microserviceClient.auditFacilityPhoto(
          fileBuffer,
          filename,
          institution.geoCoordinates?.latitude || 18.5204,
          institution.geoCoordinates?.longitude || 73.8567
        );
        if (facilityAudit.isLiveService === false) allLiveServices = false;

        doc.forensicAnalysis.pHash = facilityAudit.phash_check?.phash || '';
        doc.forensicAnalysis.isDuplicatePhoto = facilityAudit.phash_check?.is_duplicate || false;
        doc.forensicAnalysis.geoExif = {
          latitude: facilityAudit.geotag_check?.photo_coordinates?.latitude,
          longitude: facilityAudit.geotag_check?.photo_coordinates?.longitude,
          distanceFromCampusMeters: facilityAudit.geotag_check?.distance_meters,
          isWithinCampusBounds: facilityAudit.geotag_check?.is_within_bounds,
        };
      }

      // (d) Member 5 PKI & Trust Rails
      const trustRes = await microserviceClient.verifyTrustRails(
        fileBuffer,
        filename,
        institution.aictePermanentId,
        application.requestedIntake
      );
      if (trustRes.isLiveService === false) allLiveServices = false;

      doc.verificationRails.pkiSignatureValid = Boolean(trustRes.pki_signature?.is_valid);
      doc.verificationRails.pkiSignerName = trustRes.pki_signature?.signer_name || null;
      doc.verificationRails.qrPayloadMatchesDocument = Boolean(trustRes.qr_verification?.matches_document);
      doc.verificationRails.externalRegistryStatus = trustRes.external_registries?.[0]?.status || (doc.documentType === 'OTHER' ? 'UNRECOGNIZED_DOCUMENT' : 'VERIFIED');
      doc.status = 'ANALYZED';

      await doc.save();

      // Track peak anomaly metrics across all application documents for risk aggregator
      if ((doc.forensicAnalysis.elaAnomalyScore || 0) > (maxForensicData.elaAnomalyScore || 0)) {
        maxForensicData.elaAnomalyScore = doc.forensicAnalysis.elaAnomalyScore;
      }
      if (doc.forensicAnalysis.tamperDetected) {
        maxForensicData.tamperDetected = true;
      }
      if (doc.forensicAnalysis.metadataSoftware && doc.forensicAnalysis.metadataSoftware.length > 0) {
        maxForensicData.metadataSoftware = [
          ...new Set([...(maxForensicData.metadataSoftware || []), ...doc.forensicAnalysis.metadataSoftware]),
        ];
      }
      if (doc.forensicAnalysis.isDuplicatePhoto) {
        maxForensicData.isDuplicatePhoto = true;
      }
      if (doc.forensicAnalysis.geoExif) {
        if (!maxForensicData.geoExif || doc.forensicAnalysis.geoExif.isWithinCampusBounds === false) {
          maxForensicData.geoExif = doc.forensicAnalysis.geoExif;
        }
      }

      const docTrustSummary = {
        isSigned: Boolean(trustRes.pki_signature?.is_signed),
        pkiSignatureValid: Boolean(trustRes.pki_signature?.is_valid),
        pkiSignatureCorrupted: Boolean(trustRes.pki_signature?.is_signed && !trustRes.pki_signature?.is_valid),
        qrFound: Boolean(trustRes.qr_verification?.qr_found),
        qrPayloadMatchesDocument: Boolean(trustRes.qr_verification?.matches_document),
        externalRegistryStatus: trustRes.external_registries?.find((r) => r.status === 'MISMATCH')?.status ||
          trustRes.external_registries?.find((r) => r.status === 'EXPIRED')?.status ||
          trustRes.external_registries?.[0]?.status ||
          'VERIFIED',
      };

      if (docTrustSummary.pkiSignatureCorrupted || docTrustSummary.qrPayloadMatchesDocument === false || docTrustSummary.externalRegistryStatus === 'MISMATCH') {
        primaryTrustData = docTrustSummary;
      } else if (!primaryTrustData.isSigned) {
        primaryTrustData = docTrustSummary;
      }
    }

    // 3. Member 3 Rule Engine: APH Handbook Evaluation
    const complianceEvaluation = await evaluateApplicationCompliance(application._id);

    await auditLogger.recordEvent(
      application._id,
      'APH_RULES_EVALUATED',
      { userId: 'MEMBER_3_RULE_ENGINE', role: 'APH_COMPLIANCE_ENGINE' },
      { rulesCount: complianceEvaluation.rulesEvaluatedCount, failedCount: complianceEvaluation.failedRulesCount }
    );

    // 4. Member 3 Risk Aggregator: Calculate Composite 0-100 Risk Score
    const riskAssessment = riskScorer.calculateCompositeRisk(
      maxForensicData,
      complianceEvaluation.ruleResults,
      primaryTrustData
    );

    application.compositeRiskScore = riskAssessment.compositeRiskScore;
    application.triageStatus = riskAssessment.triageStatus;
    application.status = 'SCRUTINY_COMPLETED';
    application.processedAt = new Date();
    await application.save();

    // 5. Final Audit Hash Commit
    await auditLogger.recordEvent(
      application._id,
      'RISK_SCORE_COMPUTED',
      { userId: 'SYSTEM_ORCHESTRATOR', role: 'RISK_SCORER' },
      {
        compositeRiskScore: riskAssessment.compositeRiskScore,
        triageStatus: riskAssessment.triageStatus,
        criticalFlags: riskAssessment.criticalFlags,
        isLiveAIWorkers: allLiveServices,
      }
    );

    return {
      applicationId: application._id,
      applicationNumber: application.applicationNumber,
      institution: institution.name,
      triageStatus: application.triageStatus,
      compositeRiskScore: application.compositeRiskScore,
      riskBreakdown: riskAssessment.breakdown,
      criticalFlags: riskAssessment.criticalFlags,
      ruleResults: complianceEvaluation.ruleResults,
      processedDocumentsCount: documents.length,
      isLiveAIWorkers: allLiveServices,
      pipelineStatusBanner: allLiveServices
        ? 'Verified via Live Python AI Workers (RapidOCR, ELA Forensics, X.509 PKI)'
        : 'Executed via Fallback Emulation Barrier',
    };
  }
}

export default new OrchestrationPipeline();
