import ComplianceRule from '../models/ComplianceRule.js';
import { evaluateApplicationCompliance } from '../engine/ruleEvaluator.js';

/**
 * Execute APH Rule Engine against a specific application dossier.
 */
export const runEvaluation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const evaluation = await evaluateApplicationCompliance(id);

    return res.status(200).json({
      success: true,
      message: 'APH compliance rules evaluated successfully.',
      data: evaluation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active AICTE APH handbook rules.
 */
export const getComplianceRules = async (req, res, next) => {
  try {
    const { category } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;

    const rules = await ComplianceRule.find(filter).sort({ category: 1, severity: 1 });

    return res.status(200).json({
      success: true,
      count: rules.length,
      data: rules,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Seed canonical AICTE Approval Process Handbook (APH 2026-2027) regulatory rules.
 */
export const seedDefaultRules = async (req, res, next) => {
  try {
    const defaultRules = [
      {
        ruleCode: 'APH_SFR_01',
        title: 'Student-to-Faculty Ratio (SFR) Compliance',
        category: 'ACADEMIC_RATIO',
        severity: 'CRITICAL',
        penaltyWeight: 25,
        parameters: { maxEngineeringSFR: 15, maxManagementSFR: 20 },
        description: 'Mandates minimum full-time faculty per total student enrollment.',
      },
      {
        ruleCode: 'APH_CADRE_01',
        title: 'Senior Faculty Cadre (Professor / Principal) Mandate',
        category: 'ACADEMIC_RATIO',
        severity: 'MAJOR',
        penaltyWeight: 15,
        parameters: { minProfessorsPerDept: 1 },
        description: 'Ensures qualified doctoral leadership in each sanctioned engineering department.',
      },
      {
        ruleCode: 'APH_INFRA_AREA_01',
        title: 'Instructional & Administrative Area per Student',
        category: 'INFRASTRUCTURE',
        severity: 'MAJOR',
        penaltyWeight: 20,
        parameters: { minAreaSqMetersPerStudent: 5.5 },
        description: 'Mandates adequate carpet area for classrooms, laboratories, and workshops.',
      },
      {
        ruleCode: 'APH_INFRA_LAND_01',
        title: 'Minimum Operational Campus Land Mandate',
        category: 'INFRASTRUCTURE',
        severity: 'CRITICAL',
        penaltyWeight: 25,
        parameters: { minLandAreaSqmUrban: 10000 },
        description: 'Validates clear, unencumbered institutional campus land holding.',
      },
      {
        ruleCode: 'APH_SAFETY_FIRE_01',
        title: 'Valid Fire Safety NOC from Competent Authority',
        category: 'SAFETY_MANDATE',
        severity: 'CRITICAL',
        penaltyWeight: 30,
        parameters: { requireActiveCertificate: true },
        description: 'Validates structural fire protection NOC for the current academic approval cycle.',
      },
      {
        ruleCode: 'APH_INTAKE_SANCTION_01',
        title: 'University Affiliation vs Requested Intake Reconciliation',
        category: 'INTAKE_SANCTION',
        severity: 'CRITICAL',
        penaltyWeight: 35,
        parameters: { maxVariancePercent: 0 },
        description: 'Catches unapproved seat intake inflation by reconciling with state university decrees.',
      },
      {
        ruleCode: 'APH_FACULTY_GHOST_01',
        title: 'Central Faculty Deduplication & Ghost Faculty Audit',
        category: 'FACULTY_DEDUPLICATION',
        severity: 'CRITICAL',
        penaltyWeight: 40,
        parameters: { allowConcurrentRegistrations: false },
        description: 'Audits national ID hashes across central registry to catch faculty teaching simultaneously at multiple colleges.',
      },
    ];

    for (const rule of defaultRules) {
      await ComplianceRule.findOneAndUpdate({ ruleCode: rule.ruleCode }, rule, {
        upsert: true,
        new: true,
      });
    }

    const seededRules = await ComplianceRule.find();
    return res.status(200).json({
      success: true,
      message: `Seeded ${seededRules.length} canonical AICTE APH handbook regulatory rules.`,
      data: seededRules,
    });
  } catch (error) {
    next(error);
  }
};
