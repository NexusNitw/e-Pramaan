/**
 * Composite Risk Index Aggregator.
 * Combines forensic anomalies, APH handbook rule deficits, and PKI trust rail status.
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
    const isOffCampus = forensicData.geoExif && !forensicData.geoExif.isWithinCampusBounds;

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
      criticalFlags.push('Campus photo GPS coordinates exceed registered geofence boundary');
    }

    // 2. Evaluate APH Handbook Regulatory Deficits (Weight: 40%)
    const failedRules = complianceResults.filter((r) => !r.passed);
    const rulePenalties = failedRules.reduce((sum, r) => sum + (r.penaltyScore || 0), 0);
    complianceScore = Math.min(100, rulePenalties);

    // Hard triggers from APH Rules:
    const intakeFailed = failedRules.some((r) => r.ruleCode === 'APH_INTAKE_SANCTION_01');
    const ghostFacultyFailed = failedRules.some((r) => r.ruleCode === 'APH_FACULTY_GHOST_01');

    if (intakeFailed) {
      criticalFlags.push('Intake figure mismatch: Application intake contradicts University Affiliation letter');
    }
    if (ghostFacultyFailed) {
      criticalFlags.push('Ghost faculty collision: Professor active on payroll at another registered institution');
    }

    // 3. Evaluate PKI & Trust Rails (Weight: 20%)
    if (trustRailData.pkiSignatureValid === false) {
      trustScore += 40;
      criticalFlags.push('PDF digital X.509 signature corrupted or missing');
    }
    if (trustRailData.qrPayloadMatchesDocument === false) {
      trustScore += 35;
      criticalFlags.push('Signed QR code payload contradicts document text values');
    }
    if (trustRailData.externalRegistryStatus === 'MISMATCH') {
      trustScore += 30;
      criticalFlags.push('External authority registry reported master record mismatch (DigiLocker)');
    } else if (trustRailData.externalRegistryStatus === 'EXPIRED') {
      trustScore += 20;
    }

    // 4. Compute Weighted Aggregate
    let compositeIndex = (forensicScore * 0.40) + (complianceScore * 0.40) + (trustScore * 0.20);

    // Hard ceiling trigger: If critical tampering exists, floor at 75-90
    if (criticalFlags.length > 0 && (intakeFailed || hasTamperSoftware || isDuplicate || ghostFacultyFailed)) {
      compositeIndex = Math.max(compositeIndex, 82.5);
    }

    compositeIndex = parseFloat(Math.min(100, Math.max(0, compositeIndex)).toFixed(1));

    // 5. Determine Triage Status
    let triageStatus = 'GREEN_COMPLIANT';
    if (compositeIndex >= 65 || criticalFlags.length > 0 && (intakeFailed || hasTamperSoftware || isDuplicate || ghostFacultyFailed)) {
      triageStatus = 'RED_HIGH_RISK_FORGERY';
    } else if (compositeIndex >= 25 || failedRules.length > 0) {
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
