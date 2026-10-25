import { calculateSFR, calculateCadreDistribution } from '../ratioCalculators.js';

/**
 * Evaluates Academic Cadre & Student-to-Faculty Ratios according to AICTE APH Chapter II.
 */
export const evaluateAcademicRules = (application, institution, documents) => {
  const results = [];

  // 1. Locate Faculty Master Sheet / Roster document
  const facultyDoc = documents.find((d) => d.documentType === 'FACULTY_MASTER_ROSTER');
  const facultyList = facultyDoc?.extractedData?.facultyList || [];
  const facultyCount = facultyList.length;

  const totalStudents = application.totalStudentEnrolled || (application.requestedIntake * 4); // Estimate 4 years if enrolled not passed
  const category = institution.category || 'ENGINEERING_TECH';

  // Standard APH threshold: Engineering/Tech = 1:15, Pharmacy = 1:15, Management = 1:20
  const maxAllowedRatio = category === 'MANAGEMENT' ? 20 : 15;

  // RULE 1: Student-Faculty Ratio Check
  const { ratio, formatted } = calculateSFR(totalStudents, facultyCount);
  const sfrPassed = ratio <= maxAllowedRatio && ratio > 0;

  results.push({
    ruleCode: 'APH_SFR_01',
    category: 'ACADEMIC_RATIO',
    title: 'Student-to-Faculty Ratio (SFR) Compliance',
    passed: sfrPassed,
    severity: 'CRITICAL',
    observedValue: formatted,
    requiredValue: `$\le$ 1:${maxAllowedRatio}`,
    message: sfrPassed
      ? `Maintains compliant ratio of ${formatted} (threshold $\le$ 1:${maxAllowedRatio}).`
      : `SFR deficit: current ratio is ${formatted}, exceeding mandated threshold of 1:${maxAllowedRatio}.`,
    penaltyScore: sfrPassed ? 0 : 25,
  });

  // RULE 2: Cadre Distribution Leadership Check
  const cadre = calculateCadreDistribution(facultyList);
  const cadrePassed = cadre.hasProfessorOrHod;

  results.push({
    ruleCode: 'APH_CADRE_01',
    category: 'ACADEMIC_RATIO',
    title: 'Senior Faculty Cadre (Professor / Principal) Mandate',
    passed: cadrePassed,
    severity: 'MAJOR',
    observedValue: `${cadre.professors} Professors / HODs out of ${cadre.total} faculty`,
    requiredValue: '$\ge$ 1 Professor / HOD per department',
    message: cadrePassed
      ? `Cadre requirement satisfied with ${cadre.professors} Professors/HODs on roster.`
      : 'Roster lacks senior Professor or Principal level faculty.',
    penaltyScore: cadrePassed ? 0 : 15,
  });

  return results;
};
