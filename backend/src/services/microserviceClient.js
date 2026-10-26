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
   * Calls Member 2 OCR Microservice to extract tabular faculty roster.
   */
  async extractFacultyTables(fileBuffer, filename) {
    try {
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'application/pdf' });
      formData.append('file', blob, filename);

      return await this._postFormData(`${this.ocrUrl}/api/ocr/extract/tables`, formData);
    } catch (error) {
      console.warn(`[MicroserviceClient] OCR extract tables offline, using empty roster for '${filename}': ${error.message}`);
      return { faculty_roster: [], success: false };
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

  // --- Safe Fallbacks (When service endpoints are offline or processing fails) ---

  _simulateOCRClassification(filename) {
    return {
      filename,
      total_pages: 1,
      primary_document_type: 'OTHER',
      overall_confidence: 0.15,
      processing_time_ms: 10.0,
      success: false,
    };
  }

  _simulateCertificateExtraction(filename, docType) {
    return {
      filename,
      document_type: docType || 'OTHER',
      attributes: {},
      confidence: 0.0,
      processing_time_ms: 10.0,
      success: false,
    };
  }

  _simulateForensicAnalysis(filename) {
    return {
      filename,
      composite_tamper_flag: false,
      composite_forensic_score: 0.0,
      ela_analysis: {
        anomaly_score: 0.0,
        is_tampered: false,
        mean_error: 0.0,
        max_error: 0.0,
        confidence_rating: 'UNPROCESSED',
        heatmap_base64: '',
      },
      metadata_analysis: {
        is_tampered_software: false,
        detected_editing_tools: [],
        timestamp_discrepancy: false,
      },
      processing_time_ms: 10.0,
      success: false,
    };
  }

  _simulateFacilityAudit(filename, campusLat, campusLon) {
    return {
      filename,
      facility_category: 'Unverified Facility',
      is_flagged: false,
      composite_facility_risk: 0.0,
      geotag_check: {
        has_gps: false,
        distance_meters: 0.0,
        is_within_bounds: false,
        status: 'NO_GPS_DATA',
      },
      phash_check: {
        phash: '',
        is_duplicate: false,
        similarity_percentage: 0.0,
        reused_facility_name: null,
      },
      processing_time_ms: 10.0,
      success: false,
    };
  }

  _simulateTrustRails(filename, aicteId, requestedIntake) {
    return {
      filename,
      overall_trust_status: 'UNVERIFIED',
      trust_confidence: 0.0,
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
          status: 'MANUAL_REVIEW_REQUIRED',
          response_summary: 'Automated verification rail unavailable or document not registered with issuing authority.',
        },
      ],
      processing_time_ms: 10.0,
      success: false,
    };
  }
}

export default new MicroserviceClient();
