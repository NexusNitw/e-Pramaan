/**
 * Mathematical calculators and utility functions for AICTE APH regulatory ratios.
 */

/**
 * Calculates Student-to-Faculty Ratio (SFR).
 * Standard: Total enrolled students divided by approved full-time faculty.
 */
export const calculateSFR = (totalStudents, facultyCount) => {
  if (!facultyCount || facultyCount <= 0) {
    return { ratio: Infinity, formatted: 'N/A (No Faculty)' };
  }
  const ratio = parseFloat((totalStudents / facultyCount).toFixed(2));
  return { ratio, formatted: `1:${ratio}` };
};

/**
 * Evaluates Cadre Ratio distribution (Target: 1 Professor : 2 Associate Professors : 6 Assistant Professors).
 */
export const calculateCadreDistribution = (facultyList = []) => {
  let professors = 0;
  let associateProfessors = 0;
  let assistantProfessors = 0;

  facultyList.forEach((f) => {
    const des = (f.designation || '').toLowerCase();
    if (des.includes('associate')) {
      associateProfessors++;
    } else if (des.includes('assistant')) {
      assistantProfessors++;
    } else if (des.includes('professor') || des.includes('principal') || des.includes('director')) {
      professors++;
    } else {
      assistantProfessors++;
    }
  });

  const total = professors + associateProfessors + assistantProfessors;
  return {
    professors,
    associateProfessors,
    assistantProfessors,
    total,
    hasProfessorOrHod: professors > 0,
  };
};

/**
 * Calculates instructional and administrative built-up area per enrolled student.
 * Standard: Total built-up area in m² divided by total student enrollment.
 */
export const calculateAreaPerStudent = (builtUpAreaSqm, totalStudents) => {
  if (!totalStudents || totalStudents <= 0) {
    return 0;
  }
  return parseFloat((builtUpAreaSqm / totalStudents).toFixed(2));
};

/**
 * Inspects certificate validity window relative to a cutoff inspection date.
 */
export const checkCertificateExpiry = (expiryDate, referenceDate = new Date()) => {
  if (!expiryDate) {
    return { isExpired: true, daysRemaining: -Infinity, message: 'Expiry date missing' };
  }
  const exp = new Date(expiryDate);
  const ref = new Date(referenceDate);
  const diffTime = exp.getTime() - ref.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    isExpired: diffDays < 0,
    daysRemaining: diffDays,
    expiryFormatted: exp.toISOString().split('T')[0],
  };
};

/**
 * Calculates seat intake discrepancy between applicant request and university affiliation sanction.
 */
export const calculateIntakeDiscrepancy = (requestedIntake, sanctionedAffiliationIntake) => {
  if (!sanctionedAffiliationIntake && sanctionedAffiliationIntake !== 0) {
    return { hasDiscrepancy: false, difference: 0, percentageVariance: 0 };
  }
  const diff = requestedIntake - sanctionedAffiliationIntake;
  const variance = sanctionedAffiliationIntake > 0
    ? parseFloat(((diff / sanctionedAffiliationIntake) * 100).toFixed(1))
    : 0;

  return {
    hasDiscrepancy: diff !== 0,
    isInflated: diff > 0,
    difference: diff,
    percentageVariance: variance,
  };
};
