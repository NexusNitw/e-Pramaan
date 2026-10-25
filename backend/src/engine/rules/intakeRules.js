import { calculateIntakeDiscrepancy } from '../ratioCalculators.js';

/**
 * Cross-checks multi-document figures: Application vs Affiliation Letter and Ghost Faculty Collision.
 */
export const evaluateIntakeAndFacultyRules = (application, institution, documents) => {
  const results = [];

  // RULE 1: Intake Reconciliation (Application vs University Affiliation)
  const affilDoc = documents.find((d) => d.documentType === 'UNIVERSITY_AFFILIATION_LETTER');
  const universityIntake = affilDoc?.extractedData?.sanctionedIntake;
  const requestedIntake = application.requestedIntake;

  if (universityIntake !== undefined && universityIntake !== null) {
    const { hasDiscrepancy, isInflated, difference, percentageVariance } = calculateIntakeDiscrepancy(
      requestedIntake,
      universityIntake
    );

    const passed = !hasDiscrepancy;

    results.push({
      ruleCode: 'APH_INTAKE_SANCTION_01',
      category: 'INTAKE_SANCTION',
      title: 'University Affiliation vs Requested Intake Reconciliation',
      passed,
      severity: 'CRITICAL',
      observedValue: `Requested: ${requestedIntake} seats vs Affiliation: ${universityIntake} seats (Diff: ${difference})`,
      requiredValue: 'Requested intake must match University sanctioned ceiling exactly',
      message: passed
        ? `Intake figures reconciled: requested ${requestedIntake} seats match University sanction.`
        : `Discrepancy detected: applicant requested ${requestedIntake} seats, but University affiliation letter sanctions only ${universityIntake} seats (${percentageVariance}% ${isInflated ? 'inflation' : 'variance'}).`,
      penaltyScore: passed ? 0 : 35,
    });
  } else {
    results.push({
      ruleCode: 'APH_INTAKE_SANCTION_01',
      category: 'INTAKE_SANCTION',
      title: 'University Affiliation vs Requested Intake Reconciliation',
      passed: true,
      severity: 'CRITICAL',
      observedValue: `${requestedIntake} seats requested`,
      requiredValue: 'University affiliation letter for cross-check',
      message: 'University affiliation letter not present for intake cross-verification.',
      penaltyScore: 10,
    });
  }

  // RULE 2: Ghost Faculty Cross-College Collision Check
  const facultyDoc = documents.find((d) => d.documentType === 'FACULTY_MASTER_ROSTER');
  const facultyList = facultyDoc?.extractedData?.facultyList || [];

  const crossFlagged = facultyList.filter((f) => f.isCrossCollegeFlagged);
  const ghostCount = crossFlagged.length;
  const ghostPassed = ghostCount === 0;

  results.push({
    ruleCode: 'APH_FACULTY_GHOST_01',
    category: 'FACULTY_DEDUPLICATION',
    title: 'Central Faculty Deduplication & Ghost Faculty Audit',
    passed: ghostPassed,
    severity: 'CRITICAL',
    observedValue: ghostPassed
      ? '0 Collisions in Central Database'
      : `${ghostCount} Ghost Faculty flagged across multiple colleges`,
    requiredValue: '0 Concurrent faculty appointments',
    message: ghostPassed
      ? 'All faculty members are uniquely registered to this institution.'
      : `Cross-institutional collision: ${ghostCount} faculty members are concurrently recorded on active payroll at other colleges (${crossFlagged.map((f) => f.name).join(', ')}).`,
    penaltyScore: ghostPassed ? 0 : 40,
  });

  return results;
};
