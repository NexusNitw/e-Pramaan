import mongoose from 'mongoose';
import crypto from 'crypto';

const AuditTrailSchema = new mongoose.Schema(
  {
    trailId: {
      type: String,
      required: true,
      unique: true,
      default: () => `AUD-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        'APPLICATION_SUBMITTED',
        'PRE_SCRUTINY_PASSED',
        'PRE_SCRUTINY_FAILED',
        'OCR_EXTRACTION_COMPLETED',
        'FORENSIC_TAMPER_FLAGGED',
        'PKI_SIGNATURE_VERIFIED',
        'APH_RULES_EVALUATED',
        'RISK_SCORE_COMPUTED',
        'OFFICER_OVERRIDE_APPLIED',
        'FINAL_APPROVAL_GRANTED',
        'APPLICATION_REJECTED',
      ],
      required: true,
    },
    performedBy: {
      userId: { type: String, default: 'SYSTEM_AUTOMATION' },
      role: { type: String, default: 'ORCHESTRATOR_DAEMON' },
      ipAddress: { type: String, default: '127.0.0.1' },
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    previousHash: {
      type: String,
      default: 'GENESIS_TRAIL_0000000000000000000000000000000000000000000000000000000000000000',
    },
    stateHashSha256: {
      type: String,
      required: true,
      index: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Utility to calculate SHA-256 hash chaining for immutable audit tracking.
 */
AuditTrailSchema.statics.computeHash = function (payload, prevHash) {
  const content = JSON.stringify({
    payload,
    prevHash,
  });
  return crypto.createHash('sha256').update(content).digest('hex');
};

const AuditTrail = mongoose.model('AuditTrail', AuditTrailSchema);
export default AuditTrail;
