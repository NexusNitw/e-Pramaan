import { seedDefaultUsers } from '../controllers/authController.js';
import ComplianceRule from '../models/ComplianceRule.js';

export const seedDefaultComplianceRules = async () => {
  const defaultRules = [
    {
      ruleCode: 'APH_SFR_01',
      title: 'Student-to-Faculty Ratio (SFR) Compliance',
      category: 'ACADEMIC_RATIO',
      severity: 'CRITICAL',
      penaltyWeight: 25,
      parameters: { maxEngineeringSFR: 15, maxManagementSFR: 20 },
      description: 'Mandates minimum full-time faculty per total student enrollment (<= 1:15 for UG Engineering).',
    },
    {
      ruleCode: 'APH_CADRE_01',
      title: 'Senior Faculty Cadre (Professor / Principal) Mandate',
      category: 'ACADEMIC_RATIO',
      severity: 'MAJOR',
      penaltyWeight: 15,
      parameters: { minProfessorsPerDept: 1 },
      description: 'Ensures qualified doctoral leadership (minimum 1 Professor / HOD) in each sanctioned department.',
    },
    {
      ruleCode: 'APH_INFRA_AREA_01',
      title: 'Instructional & Administrative Area per Student',
      category: 'INFRASTRUCTURE',
      severity: 'MAJOR',
      penaltyWeight: 20,
      parameters: { minAreaSqMetersPerStudent: 5.5 },
      description: 'Mandates adequate carpet area (>= 5.5 sq.m per student) for classrooms, laboratories, and workshops.',
    },
    {
      ruleCode: 'APH_INFRA_LAND_01',
      title: 'Minimum Operational Campus Land Mandate',
      category: 'INFRASTRUCTURE',
      severity: 'CRITICAL',
      penaltyWeight: 25,
      parameters: { minLandAreaSqmUrban: 10000 },
      description: 'Validates clear, unencumbered institutional campus land holding (>= 10,000 sq.m / 2.5 acres).',
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
};

export const seedDatabaseIfEmpty = async () => {
  try {
    // 1. Ensure default demonstration user accounts exist
    await seedDefaultUsers();
    console.log('[Database Seeder] Default demonstration user accounts verified.');

    // 2. Ensure canonical AICTE APH Compliance Rules are seeded in MongoDB
    await seedDefaultComplianceRules();
    console.log('[Database Seeder] Canonical AICTE APH compliance rules populated in MongoDB Atlas.');
  } catch (err) {
    console.warn('[Database Seeder] Non-blocking seeding error:', err.message);
  }
};
