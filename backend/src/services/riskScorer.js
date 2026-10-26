/**
 * Composite Risk Index Aggregator.
 * Combines forensic anomalies (40%), APH handbook rule deficits (40%), and PKI trust rail status (20%).
 * Strictly implements the AICTE e-Pramaan Regulatory Specification and hard ceiling triggers.
 */
class RiskScorer {
  /**
   * Computes composite Risk Index (0 - 100) and determines triage categorization.
   */
  calculateCompositeRisk(forensicData = {}, complianceResults = [], trustRailData = {}) {
    let forensicScore = 0;
    let complianceScore = 0;
    let trustScore = 0;
    const criticalFlags = [];

    // 1. Evaluate Forensic Sub-Score (Weight: 40%)
    const elaScore = forensicData.elaAnomalyScore || 0;
    const hasTamperSoftware = forensicData.tamperDetected || (forensicData.metadataSoftware && forensicData.metadataSoftware.length > 0);
    const isDuplicate = forensicData.isDuplicatePhoto || false;
    const isOffCampus = forensicData.geoExif && forensicData.geoExif.isWithinCampusBounds === false;

    forensicScore = elaScore;
    if (hasTamperSoftware) {
      forensicScore = Math.max(forensicScore, 75);
      criticalFlags.push('Editing suite software footprint detected (Photoshop / GIMP)');
    }
    if (isDuplicate) {
      forensicScore = Math.max(forensicScore, 80);
      criticalFlags.push('Infrastructure photograph duplicate detected across colleges (pHash match)');
    }
    if (isOffCampus) {
      forensicScore = Math.max(forensicScore, 75);
      criticalFlags.push('Campus photo GPS coordinates exceed registered geofence boundary (> 800m)');
    }

    // 2. Evaluate APH Handbook Regulatory Deficits (Weight: 40%)
    const failedRules = complianceResults.filter((r) => !r.passed);
    const rulePenalties = failedRules.reduce((sum, r) => sum + (r.penaltyScore || 0), 0);
    complianceScore = Math.min(100, rulePenalties);

    // Hard triggers from APH Rules:
    const intakeFailed = failedRules.some((r) => r.ruleCode === 'APH_INTAKE_SANCTION_01');
    const ghostFacultyFailed = failedRules.some((r) => r.ruleCode === 'APH_FACULTY_GHOST_01');
    const fireNocExpired = failedRules.some((r) => r.ruleCode === 'APH_SAFETY_FIRE_01');

    if (intakeFailed) {
      criticalFlags.push('Intake figure mismatch: Application intake contradicts University Affiliation letter');
    }
    if (ghostFacultyFailed) {
      criticalFlags.push('Ghost faculty collision: Professor active on payroll at another registered institution');
    }
    if (fireNocExpired) {
      criticalFlags.push('Fire Safety NOC expired prior to academic cycle inspection date');
    }

    // 3. Evaluate PKI & Trust Rails (Weight: 20%)
    const isSignatureCorrupted = Boolean(
      trustRailData.pkiSignatureCorrupted ||
      (trustRailData.isSigned && !trustRailData.pkiSignatureValid)
    );
    if (isSignatureCorrupted) {
      trustScore += 60;
      criticalFlags.push('PDF digital X.509 signature corrupted or tampered post-signing');
    }

    const qrContradiction = Boolean(
      trustRailData.qrFound && trustRailData.qrPayloadMatchesDocument === false
    );
    if (qrContradiction) {
      trustScore += 45;
      criticalFlags.push('Signed QR code payload contradicts document text values');
    }

    if (trustRailData.externalRegistryStatus === 'MISMATCH') {
      trustScore += 40;
      criticalFlags.push('External authority registry reported master record mismatch (DigiLocker / University)');
    } else if (trustRailData.externalRegistryStatus === 'EXPIRED') {
      trustScore += 25;
    }

    // 4. Compute Weighted Aggregate
    let compositeIndex = (forensicScore * 0.40) + (complianceScore * 0.40) + (trustScore * 0.20);

    // Hard ceiling trigger: If critical tampering exists (Photoshop, intake forgery, duplicate photo, ghost faculty, corrupted signature)
    const hasCriticalForgery = (
      intakeFailed ||
      hasTamperSoftware ||
      isDuplicate ||
      ghostFacultyFailed ||
      isSignatureCorrupted ||
      qrContradiction
    );

    if (hasCriticalForgery) {
      compositeIndex = Math.max(compositeIndex, 82.5);
    } else if (failedRules.length === 0 && !hasTamperSoftware && !intakeFailed && !isOffCampus) {
      // Clean compliant application with 0 rule violations
      compositeIndex = Math.min(compositeIndex, 8.5);
    }

    compositeIndex = parseFloat(Math.min(100, Math.max(0, compositeIndex)).toFixed(1));

    // 5. Determine Triage Status
    let triageStatus = 'GREEN_COMPLIANT';
    if (compositeIndex >= 65 || hasCriticalForgery || isOffCampus) {
      triageStatus = 'RED_HIGH_RISK_FORGERY';
    } else if (compositeIndex >= 25 || failedRules.length > 0 || trustRailData.externalRegistryStatus === 'EXPIRED') {
      triageStatus = 'YELLOW_DEFICIENCY';
    }

    return {
      compositeRiskScore: compositeIndex,
      triageStatus,
      criticalFlags,
      breakdown: {
        forensicScore: parseFloat(forensicScore.toFixed(1)),
        compliancePenalty: parseFloat(complianceScore.toFixed(1)),
        trustRailPenalty: parseFloat(trustScore.toFixed(1)),
      },
    };
  }
}

export default new RiskScorer();
