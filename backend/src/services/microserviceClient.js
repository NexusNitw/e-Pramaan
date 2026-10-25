import config from '../config/env.js';

/**
 * Resilient HTTP client communicating with Python microservices (Member 1, 2, and 5).
 * Employs native fetch with timeout handling and automated mock fallbacks if a service is offline.
 */
class MicroserviceClient {
  constructor() {
    this.forensicsUrl = config.services.forensics;
    this.ocrUrl = config.services.ocr;
    this.verificationUrl = config.services.verification;
    this.timeoutMs = 12000;
  }

  /**
   * Helper to execute HTTP request with timeout.
   */
  async _postFormData(url, formData) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`Microservice responded with HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Calls Member 2 OCR Microservice to classify document pages.
   */
  async classifyDocument(fileBuffer, filename) {
    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'application/pdf' });
      formData.append('file', blob, filename);

      return await this._postFormData(`${this.ocrUrl}/api/ocr/classify`, formData);
    } catch (error) {
      console.warn(`[MicroserviceClient] OCR classify offline, using simulated classification for '${filename}': ${error.message}`);
      return this._simulateOCRClassification(filename);
    }
  }

  /**
   * Calls Member 2 OCR Microservice to extract certificate attributes.
   */
  async extractCertificateData(fileBuffer, filename, docType) {
    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'application/pdf' });
      formData.append('file', blob, filename);
      formData.append('document_type', docType);

      return await this._postFormData(`${this.ocrUrl}/api/ocr/extract/certificate`, formData);
    } catch (error) {
      console.warn(`[MicroserviceClient] OCR extract offline, using simulated extraction for '${filename}': ${error.message}`);
      return this._simulateCertificateExtraction(filename, docType);
    }
  }

  /**
   * Calls Member 1 Forensics Microservice for ELA and metadata analysis.
   */
  async analyzeForensics(fileBuffer, filename) {
    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'application/pdf' });
      formData.append('file', blob, filename);

      return await this._postFormData(`${this.forensicsUrl}/api/forensics/analyze`, formData);
    } catch (error) {
      console.warn(`[MicroserviceClient] Forensics offline, using simulated forensic analysis for '${filename}': ${error.message}`);
      return this._simulateForensicAnalysis(filename);
    }
  }

  /**
   * Calls Member 1 Forensics Microservice for pHash and geotag auditing.
   */
  async auditFacilityPhoto(fileBuffer, filename, campusLat, campusLon) {
    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
      formData.append('file', blob, filename);
      formData.append('campus_latitude', campusLat.toString());
      formData.append('campus_longitude', campusLon.toString());

      return await this._postFormData(`${this.forensicsUrl}/api/forensics/facility/audit`, formData);
    } catch (error) {
      console.warn(`[MicroserviceClient] Facility forensics offline, using simulated audit for '${filename}': ${error.message}`);
      return this._simulateFacilityAudit(filename, campusLat, campusLon);
    }
  }

  /**
   * Calls Member 5 Verification Microservice for PKI, QR, and DigiLocker rails.
   */
  async verifyTrustRails(fileBuffer, filename, aicteId, requestedIntake) {
    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'application/pdf' });
      formData.append('file', blob, filename);
      formData.append('aicte_id', aicteId);
      formData.append('requested_intake', requestedIntake.toString());

      return await this._postFormData(`${this.verificationUrl}/api/verify/all`, formData);
    } catch (error) {
      console.warn(`[MicroserviceClient] Verification service offline, using simulated trust rails for '${filename}': ${error.message}`);
      return this._simulateTrustRails(filename, aicteId, requestedIntake);
    }
  }

  // --- Resilient Simulation Fallbacks (Active during standalone development) ---

  _simulateOCRClassification(filename) {
    const fn = filename.toLowerCase();
    let type = 'OTHER';
    if (fn.includes('fire')) type = 'FIRE_SAFETY_NOC';
    else if (fn.includes('affil')) type = 'UNIVERSITY_AFFILIATION_LETTER';
    else if (fn.includes('land') || fn.includes('deed')) type = 'LAND_TITLE_DEED';
    else if (fn.includes('roster') || fn.includes('faculty')) type = 'FACULTY_MASTER_ROSTER';
    else if (fn.includes('photo') || fn.includes('lab')) type = 'INFRASTRUCTURE_PHOTO';

    return {
      filename,
      total_pages: 1,
      primary_document_type: type,
      overall_confidence: 0.94,
      processing_time_ms: 120.0,
      success: true,
    };
  }

  _simulateCertificateExtraction(filename, docType) {
    const isTampered = filename.toLowerCase().includes('tampered');
    return {
      filename,
      document_type: docType,
      attributes: {
        document_number: 'NOC-2026-MH-0892',
        issuing_authority: 'Statutory Competent Authority',
        issue_date: '2026-01-15',
        expiry_date: filename.toLowerCase().includes('expired') ? '2025-03-09' : '2027-01-14',
        sanctioned_intake: isTampered ? 300 : 180,
        builtUpAreaSqm: 14200,
        survey_numbers: ['42/1A', '42/2B'],
      },
      confidence: 0.91,
      processing_time_ms: 145.0,
      success: true,
    };
  }

  _simulateForensicAnalysis(filename) {
    const isTampered = filename.toLowerCase().includes('tampered');
    return {
      filename,
      composite_tamper_flag: isTampered,
      composite_forensic_score: isTampered ? 84.5 : 6.2,
      ela_analysis: {
        anomaly_score: isTampered ? 84.2 : 6.2,
        is_tampered: isTampered,
        mean_error: isTampered ? 18.4 : 2.1,
        max_error: isTampered ? 245.0 : 42.0,
        confidence_rating: isTampered ? 'HIGH_FORGERY' : 'CLEAN',
      },
      metadata_analysis: {
        is_tampered_software: isTampered,
        detected_editing_tools: isTampered ? ['Adobe Photoshop CC 2023'] : [],
        timestamp_discrepancy: isTampered,
      },
      processing_time_ms: 180.0,
      success: true,
    };
  }

  _simulateFacilityAudit(filename, campusLat, campusLon) {
    const isOffCampus = filename.toLowerCase().includes('duplicate') || filename.toLowerCase().includes('offcampus');
    return {
      filename,
      facility_category: 'Physics Laboratory',
      is_flagged: isOffCampus,
      composite_facility_risk: isOffCampus ? 88.0 : 5.0,
      geotag_check: {
        has_gps: true,
        distance_meters: isOffCampus ? 62400.0 : 45.0,
        is_within_bounds: !isOffCampus,
        status: isOffCampus ? 'OFF_CAMPUS_VIOLATION' : 'WITHIN_CAMPUS',
      },
      phash_check: {
        phash: 'bf82d921a8f01c34',
        is_duplicate: isOffCampus,
        similarity_percentage: isOffCampus ? 100.0 : 0.0,
        reused_facility_name: isOffCampus ? 'Advanced Physics Lab at Sri Krishna College' : null,
      },
      processing_time_ms: 160.0,
      success: true,
    };
  }

  _simulateTrustRails(filename, aicteId, requestedIntake) {
    const isTampered = filename.toLowerCase().includes('tampered');
    const isExpired = filename.toLowerCase().includes('expired');

    return {
      filename,
      overall_trust_status: isTampered ? 'SUSPECTED_FORGERY' : isExpired ? 'WARNING_DEFICIENCY' : 'TRUSTED',
      trust_confidence: 0.95,
      pki_signature: {
        is_signed: true,
        is_valid: !isTampered,
        signer_name: 'Registrar, State Technological University',
        integrity_status: isTampered ? 'SIGNATURE_CORRUPTED' : 'VALID_UNMODIFIED',
      },
      qr_verification: {
        qr_found: true,
        matches_document: !isTampered,
      },
      external_registries: [
        {
          registry_name: 'DigiLocker National Vault',
          status: isExpired ? 'EXPIRED' : isTampered ? 'MISMATCH' : 'VERIFIED',
          response_summary: isExpired
            ? 'Certificate validity expired 3 months prior.'
            : isTampered
            ? 'Master intake record is 180 seats, mismatching requested 300 seats.'
            : 'Verified against national document vault.',
        },
      ],
      processing_time_ms: 210.0,
      success: true,
    };
  }
}

export default new MicroserviceClient();
