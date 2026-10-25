import orchestrationPipeline from '../services/orchestrationPipeline.js';
import auditLogger from '../services/auditLogger.js';
import AuditTrail from '../models/AuditTrail.js';

/**
 * Trigger automated multi-service scrutiny pipeline on an application dossier.
 */
export const orchestrateScrutiny = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await orchestrationPipeline.runFullScrutiny(id, {
      userId: req.user?.id || 'SCRUTINY_OFFICER_01',
    });

    return res.status(200).json({
      success: true,
      message: 'End-to-end multi-service scrutiny completed successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve verified SHA-256 state-chained audit trail with cryptographic proof.
 */
export const getAuditHistory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const history = await AuditTrail.find({ applicationId: id }).sort({ timestamp: 1 });
    const verification = await auditLogger.verifyChainIntegrity(id);

    return res.status(200).json({
      success: true,
      count: history.length,
      cryptographicProof: verification,
      data: history,
    });
  } catch (error) {
    next(error);
  }
};
