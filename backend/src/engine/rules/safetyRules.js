import { checkCertificateExpiry } from '../ratioCalculators.js';

/**
 * Evaluates Safety, Environmental & Statutory NOC Mandates.
 */
export const evaluateSafetyRules = (application, institution, documents) => {
  const results = [];

  // RULE 1: Fire Safety NOC Validity
  const fireDoc = documents.find((d) => d.documentType === 'FIRE_SAFETY_NOC');

  if (!fireDoc) {
    results.push({
      ruleCode: 'APH_SAFETY_FIRE_01',
      category: 'SAFETY_MANDATE',
      title: 'Valid Fire Safety NOC from Competent Authority',
      passed: false,
      severity: 'CRITICAL',
      observedValue: 'MISSING',
      requiredValue: 'Active Fire NOC certificate for AY 2026-2027',
      message: 'Mandatory Fire Safety NOC document was not attached in the submitted dossier.',
      penaltyScore: 30,
    });
  } else {
    const expiryDate = fireDoc.extractedData?.expiryDate;
    const { isExpired, daysRemaining, expiryFormatted } = checkCertificateExpiry(expiryDate);

    results.push({
      ruleCode: 'APH_SAFETY_FIRE_01',
      category: 'SAFETY_MANDATE',
      title: 'Valid Fire Safety NOC from Competent Authority',
      passed: !isExpired,
      severity: 'CRITICAL',
      observedValue: isExpired
        ? `EXPIRED on ${expiryFormatted} (${Math.abs(daysRemaining)} days ago)`
        : `VALID until ${expiryFormatted} (${daysRemaining} days remaining)`,
      requiredValue: 'Active Fire NOC certificate for AY 2026-2027',
      message: !isExpired
        ? `Fire NOC is active and valid until ${expiryFormatted}.`
        : `Fire Safety NOC expired ${Math.abs(daysRemaining)} days ago on ${expiryFormatted}. Renewal required.`,
      penaltyScore: !isExpired ? 0 : 30,
    });
  }

  // RULE 2: Building Plan / Land Title Sanction Check
  const planDoc = documents.find((d) => d.documentType === 'BUILDING_PLAN_APPROVAL');
  const landDoc = documents.find((d) => d.documentType === 'LAND_TITLE_DEED');
  const planPassed = Boolean(planDoc || landDoc);

  results.push({
    ruleCode: 'APH_SAFETY_BUILDING_01',
    category: 'SAFETY_MANDATE',
    title: 'Competent Authority Building Plan / Land Title Sanction',
    passed: planPassed,
    severity: 'MAJOR',
    observedValue: planPassed ? 'PRESENT & ATTACHED' : 'MISSING',
    requiredValue: 'Approved architectural drawings or registered Land Title Deed',
    message: planPassed
      ? 'Statutory building plan or registered land title deed submitted.'
      : 'Building plan approval and land title deed are missing from application dossier.',
    penaltyScore: planPassed ? 0 : 15,
  });

  return results;
};
