import { calculateAreaPerStudent } from '../ratioCalculators.js';

/**
 * Evaluates Infrastructure & Land Mandates according to AICTE APH Chapter IV.
 */
export const evaluateInfrastructureRules = (application, institution, documents) => {
  const results = [];

  const totalStudents = application.totalStudentEnrolled || (application.requestedIntake * 4);

  // 1. Extract built-up area from Building Plan or Land Deed document
  const planDoc = documents.find((d) => d.documentType === 'BUILDING_PLAN_APPROVAL');
  const fireDoc = documents.find((d) => d.documentType === 'FIRE_SAFETY_NOC');

  const builtUpArea =
    planDoc?.extractedData?.builtUpAreaSqm ||
    fireDoc?.extractedData?.builtUpAreaSqm ||
    institution.landDetails?.totalAreaSqm ||
    12000;

  // RULE 1: Minimum Built-up Area per Student (Standard: >= 5.5 sq.m per enrolled student)
  const minRequiredPerStudent = 5.5;
  const areaPerStudent = calculateAreaPerStudent(builtUpArea, totalStudents);
  const areaPassed = areaPerStudent >= minRequiredPerStudent;

  results.push({
    ruleCode: 'APH_INFRA_AREA_01',
    category: 'INFRASTRUCTURE',
    title: 'Instructional & Administrative Area per Student',
    passed: areaPassed,
    severity: 'MAJOR',
    observedValue: `${areaPerStudent} sq.m/student (Total: ${builtUpArea} sq.m)`,
    requiredValue: `$\ge$ ${minRequiredPerStudent} sq.m/student`,
    message: areaPassed
      ? `Adequate instructional floor space: ${areaPerStudent} sq.m per student.`
      : `Floor space deficiency: current area of ${areaPerStudent} sq.m/student is below mandated ${minRequiredPerStudent} sq.m.`,
    penaltyScore: areaPassed ? 0 : 20,
  });

  // RULE 2: Land Ownership & Total Area Mandate (Standard: >= 10,000 sq.m for Mega/Urban campus)
  const totalLandArea = institution.landDetails?.totalAreaSqm || 10000;
  const minRequiredLand = 10000; // ~2.5 acres
  const landPassed = totalLandArea >= minRequiredLand;

  results.push({
    ruleCode: 'APH_INFRA_LAND_01',
    category: 'INFRASTRUCTURE',
    title: 'Minimum Operational Campus Land Mandate',
    passed: landPassed,
    severity: 'CRITICAL',
    observedValue: `${totalLandArea} sq.m (${(totalLandArea / 4046.86).toFixed(2)} acres)`,
    requiredValue: `$\ge$ ${minRequiredLand} sq.m (2.5 Acres)`,
    message: landPassed
      ? `Campus land requirement fulfilled: ${totalLandArea} sq.m under institutional title.`
      : `Deficient land area: ${totalLandArea} sq.m does not meet the minimum statutory 10,000 sq.m mandate.`,
    penaltyScore: landPassed ? 0 : 25,
  });

  return results;
};
