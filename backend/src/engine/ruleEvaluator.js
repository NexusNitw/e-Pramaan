import Application from '../models/Application.js';
import Institution from '../models/Institution.js';
import DocumentRecord from '../models/DocumentRecord.js';
import { evaluateAcademicRules } from './rules/academicRules.js';
import { evaluateInfrastructureRules } from './rules/infrastructureRules.js';
import { evaluateSafetyRules } from './rules/safetyRules.js';
import { evaluateIntakeAndFacultyRules } from './rules/intakeRules.js';

/**
 * Deterministic APH Handbook Rule Engine evaluating multi-document compliance.
 */
export const evaluateApplicationCompliance = async (applicationId) => {
  const application = await Application.findById(applicationId)
    .populate('institution')
    .populate('documents');

  if (!application) {
    throw new Error(`Application '${applicationId}' not found for compliance evaluation.`);
  }

  const institution = application.institution;
  const documents = application.documents || [];

  // Run all regulatory rule categories
  const academicResults = evaluateAcademicRules(application, institution, documents);
  const infraResults = evaluateInfrastructureRules(application, institution, documents);
  const safetyResults = evaluateSafetyRules(application, institution, documents);
  const intakeResults = evaluateIntakeAndFacultyRules(application, institution, documents);

  const allResults = [
    ...academicResults,
    ...infraResults,
    ...safetyResults,
    ...intakeResults,
  ];

  // Calculate cumulative penalty
  const totalPenalty = allResults.reduce((acc, curr) => acc + (curr.penaltyScore || 0), 0);
  const compositeScore = Math.min(100, totalPenalty);

  // Determine Triage Category
  const hasCriticalFailure = allResults.some(
    (r) => !r.passed && r.severity === 'CRITICAL' && (r.ruleCode === 'APH_INTAKE_SANCTION_01' || r.ruleCode === 'APH_FACULTY_GHOST_01')
  );
  const hasDeficiency = allResults.some((r) => !r.passed);

  let triage = 'GREEN_COMPLIANT';
  if (hasCriticalFailure || compositeScore >= 70) {
    triage = 'RED_HIGH_RISK_FORGERY';
  } else if (hasDeficiency || compositeScore > 0) {
    triage = 'YELLOW_DEFICIENCY';
  }

  // Update application with evaluated results
  application.ruleExecutionResults = allResults;
  application.compositeRiskScore = compositeScore;
  application.triageStatus = triage;
  application.processedAt = new Date();
  await application.save();

  return {
    applicationId: application._id,
    applicationNumber: application.applicationNumber,
    institutionName: institution.name,
    triageStatus: triage,
    compositeRiskScore: compositeScore,
    rulesEvaluatedCount: allResults.length,
    passedRulesCount: allResults.filter((r) => r.passed).length,
    failedRulesCount: allResults.filter((r) => !r.passed).length,
    ruleResults: allResults,
  };
};
