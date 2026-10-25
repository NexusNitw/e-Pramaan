import crypto from 'crypto';
import AuditTrail from '../models/AuditTrail.js';

class AuditLogger {
  /**
   * Commits an unalterable, SHA-256 cryptographically chained audit log entry.
   */
  async recordEvent(applicationId, action, performedBy = {}, details = {}) {
    try {
      // 1. Fetch previous audit entry in this application's chain
      const latestAudit = await AuditTrail.findOne({ applicationId }).sort({ timestamp: -1 });
      const previousHash = latestAudit
        ? latestAudit.stateHashSha256
        : 'GENESIS_TRAIL_0000000000000000000000000000000000000000000000000000000000000000';

      const timestamp = new Date();

      // 2. Compute cryptographic SHA-256 state hash
      const payloadString = JSON.stringify({
        applicationId: applicationId.toString(),
        action,
        performedBy,
        details,
        timestamp: timestamp.toISOString(),
      });

      const stateHashSha256 = crypto
        .createHash('sha256')
        .update(payloadString + previousHash)
        .digest('hex');

      // 3. Persist immutable record in Atlas
      const auditRecord = await AuditTrail.create({
        applicationId,
        action,
        performedBy: {
          userId: performedBy.userId || 'SYSTEM_ORCHESTRATOR',
          role: performedBy.role || 'GATEWAY_DAEMON',
          ipAddress: performedBy.ipAddress || '127.0.0.1',
        },
        details,
        previousHash,
        stateHashSha256,
        timestamp,
      });

      return auditRecord;
    } catch (error) {
      console.error(`[AuditLogger] Failed to write audit event: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifies the entire cryptographic SHA-256 hash chain for an application dossier.
   * Proves zero tampering or retrospective record manipulation.
   */
  async verifyChainIntegrity(applicationId) {
    const chain = await AuditTrail.find({ applicationId }).sort({ timestamp: 1 });

    if (!chain || chain.length === 0) {
      return { isValid: true, count: 0, message: 'Genesis chain (empty)' };
    }

    let expectedPrevHash = 'GENESIS_TRAIL_0000000000000000000000000000000000000000000000000000000000000000';

    for (let i = 0; i < chain.length; i++) {
      const record = chain[i];

      // Check pointer link
      if (record.previousHash !== expectedPrevHash) {
        return {
          isValid: false,
          brokenAtTrailId: record.trailId,
          brokenIndex: i,
          message: `Hash link broken at step ${i + 1}. Expected: ${expectedPrevHash}, Found: ${record.previousHash}`,
        };
      }

      // Recompute SHA-256
      const payloadString = JSON.stringify({
        applicationId: record.applicationId.toString(),
        action: record.action,
        performedBy: {
          userId: record.performedBy.userId,
          role: record.performedBy.role,
          ipAddress: record.performedBy.ipAddress,
        },
        details: record.details,
        timestamp: record.timestamp.toISOString(),
      });

      const recomputedHash = crypto
        .createHash('sha256')
        .update(payloadString + record.previousHash)
        .digest('hex');

      if (recomputedHash !== record.stateHashSha256) {
        return {
          isValid: false,
          brokenAtTrailId: record.trailId,
          brokenIndex: i,
          message: `Record content tampering detected at trail ID: ${record.trailId}`,
        };
      }

      expectedPrevHash = record.stateHashSha256;
    }

    return {
      isValid: true,
      chainLength: chain.length,
      latestHash: expectedPrevHash,
      message: 'Cryptographic SHA-256 state chain is 100% verified and tamper-evident.',
    };
  }
}

export default new AuditLogger();
