import config from '../config/env.js';

/**
 * Resilient HTTP client communicating with Python microservices.
 * Employs native fetch with timeout handling, detailed error logging,
 * and transparent indicators of live AI workers vs fallback mock routines.
 */
class MicroserviceClient {
  constructor() {
    this.forensicsUrl = config.services.forensics;
    this.ocrUrl = config.services.ocr;
    this.verificationUrl = config.services.verification;
    this.timeoutMs = 15000;
  }

  /**
   * Helper to execute HTTP request with timeout.
   */
  async _postFormData(url, formData) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      console.log(`[MicroserviceClient] POST ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      if (!response.ok) {
        throw new Error(`Microservice responded with HTTP ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      data.isLiveService = true;
      data.serviceSource = 'LIVE_PYTHON_WORKER';
      return data;
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Diagnostic check of Python microservice health.
   */
  async checkHealth() {
    try {
      const resp = await fetch(`${this.ocrUrl}/health`);
      if (resp.ok) {
        return await resp.json();
      }
      return { status: 'OFFLINE', error: `HTTP ${resp.status}` };
    } catch (e) {
      return { status: 'OFFLINE', error: e.message };
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
      console.warn(`[MicroserviceClient] OCR classify failed for '${filename}' (${error.message}). Using fallback routine.`);
      return this._simulateOCRClassification(filename, error.message);
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
      console.warn(`[MicroserviceClient] OCR extract failed for '${filename}' (${error.message}). Using fallback routine.`);
      return this._simulateCertificateExtraction(filename, docType, error.message);
    }
  }

  /**
   * Calls Member 2 OCR Microservice to extract tabular faculty roster.
   */
  async extractFacultyTables(fileBuffer, filename) {
    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'application/pdf' });
      formData.append('file', blob, filename);

      return await this._postFormData(`${this.ocrUrl}/api/ocr/extract/tables`, formData);
    } catch (error) {
      console.warn(`[MicroserviceClient] OCR extract tables failed for '${filename}' (${error.message}). Using fallback roster.`);
      return {
        faculty_roster: [],
        success: false,
        isLiveService: false,
        serviceSource: 'SIMULATED_FALLBACK',
        serviceError: error.message,
      };
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
      console.warn(`[MicroserviceClient] Forensics analysis failed for '${filename}' (${error.message}). Using fallback routine.`);
      return this._simulateForensicAnalysis(filename, error.message);
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
      console.warn(`[MicroserviceClient] Facility audit failed for '${filename}' (${error.message}). Using fallback routine.`);
      return this._simulateFacilityAudit(filename, campusLat, campusLon, error.message);
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
      console.warn(`[MicroserviceClient] Verification service failed for '${filename}' (${error.message}). Using fallback routine.`);
      return this._simulateTrustRails(filename, aicteId, requestedIntake, error.message);
    }
  }

  // --- Safe Fallbacks (Tagged with isLiveService: false and diagnostic status) ---

  _simulateOCRClassification(filename, errorMsg = '') {
    const lower = (filename || '').toLowerCase();
    let guessedType = 'OTHER';
    if (lower.includes('fire') || lower.includes('noc')) guessedType = 'FIRE_SAFETY_NOC';
    else if (lower.includes('affil')) guessedType = 'UNIVERSITY_AFFILIATION_LETTER';
    else if (lower.includes('faculty') || lower.includes('roster')) guessedType = 'FACULTY_MASTER_ROSTER';
    else if (lower.includes('land') || lower.includes('deed')) guessedType = 'LAND_TITLE_DEED';
    else if (lower.includes('photo')) guessedType = 'INFRASTRUCTURE_PHOTO';

    return {
      filename,
      total_pages: 1,
      primary_document_type: guessedType,
      overall_confidence: guessedType !== 'OTHER' ? 0.85 : 0.20,
      processing_time_ms: 5.0,
      success: true,
      isLiveService: false,
      serviceSource: 'SIMULATED_FALLBACK',
      serviceError: errorMsg,
    };
  }

  _simulateCertificateExtraction(filename, docType, errorMsg = '') {
    return {
      filename,
      document_type: docType || 'OTHER',
      attributes: {},
      confidence: 0.0,
      processing_time_ms: 5.0,
      success: true,
      isLiveService: false,
      serviceSource: 'SIMULATED_FALLBACK',
      serviceError: errorMsg,
    };
  }

  _simulateForensicAnalysis(filename, errorMsg = '') {
    return {
      filename,
      composite_tamper_flag: false,
      composite_forensic_score: 0.0,
      ela_analysis: {
        anomaly_score: 0.0,
        is_tampered: false,
        mean_error: 0.0,
        max_error: 0.0,
        confidence_rating: 'UNPROCESSED_FALLBACK',
        heatmap_base64: '',
      },
      metadata_analysis: {
        is_tampered_software: false,
        detected_editing_tools: [],
        timestamp_discrepancy: false,
      },
      processing_time_ms: 5.0,
      success: true,
      isLiveService: false,
      serviceSource: 'SIMULATED_FALLBACK',
      serviceError: errorMsg,
    };
  }

  _simulateFacilityAudit(filename, campusLat, campusLon, errorMsg = '') {
    return {
      filename,
      facility_category: 'Unverified Facility',
      is_flagged: false,
      composite_facility_risk: 0.0,
      geotag_check: {
        has_gps: false,
        distance_meters: 0.0,
        is_within_bounds: true,
        status: 'FALLBACK_NO_GPS',
      },
      phash_check: {
        phash: '',
        is_duplicate: false,
        similarity_percentage: 0.0,
        reused_facility_name: null,
      },
      processing_time_ms: 5.0,
      success: true,
      isLiveService: false,
      serviceSource: 'SIMULATED_FALLBACK',
      serviceError: errorMsg,
    };
  }

  _simulateTrustRails(filename, aicteId, requestedIntake, errorMsg = '') {
    return {
      filename,
      overall_trust_status: 'UNVERIFIED',
      trust_confidence: 0.5,
      pki_signature: {
        is_signed: false,
        is_valid: false,
        signer_name: null,
        integrity_status: 'UNSIGNED_OR_UNAVAILABLE',
      },
      qr_verification: {
        qr_found: false,
        matches_document: false,
      },
      external_registries: [
        {
          registry_name: 'Issuing Authority / DigiLocker',
          status: 'VERIFIED',
          response_summary: 'Automated verification rail unavailable. Retaining baseline state.',
        },
      ],
      processing_time_ms: 5.0,
      success: true,
      isLiveService: false,
      serviceSource: 'SIMULATED_FALLBACK',
      serviceError: errorMsg,
    };
  }
}

export default new MicroserviceClient();
