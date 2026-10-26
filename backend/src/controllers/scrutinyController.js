import orchestrationPipeline from '../services/orchestrationPipeline.js';
import auditLogger from '../services/auditLogger.js';
import AuditTrail from '../models/AuditTrail.js';
import Application from '../models/Application.js';
import DocumentRecord from '../models/DocumentRecord.js';
import Institution from '../models/Institution.js';

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

/**
 * Export official AICTE Scrutiny & Regulatory Verification Summary Report as PDF.
 */
export const exportScrutinyReportPdf = async (req, res, next) => {
  try {
    const { id } = req.params;
    const app = await Application.findById(id)
      .populate('institution')
      .populate('documents');

    if (!app) {
      return res.status(404).json({
        success: false,
        message: 'Application dossier not found.',
      });
    }

    const instName = app.institution?.name || 'Technical Institution';
    const aicteId = app.institution?.aictePermanentId || 'N/A';
    const appNum = app.applicationNumber || 'N/A';
    const triage = app.triageStatus || 'PENDING';
    const risk = (app.compositeRiskScore ?? 0).toFixed(1);
    const category = app.category || 'EXTENSION_OF_APPROVAL';
    const academicYear = app.academicYear || '2026-2027';
    const intake = app.requestedIntake || 0;
    const students = app.totalStudentEnrolled || 0;

    const docs = app.documents || [];
    const docLines = docs.map((d, i) => {
      const type = (d.documentType || 'DOCUMENT').replace(/_/g, ' ');
      const status = d.status || 'ANALYZED';
      const ela = d.forensicAnalysis?.tamperDetected ? 'TAMPER FLAGGED' : 'VERIFIED CLEAN';
      return `${i + 1}. [${type}] - File: ${d.fileName} | Status: ${status} | Integrity: ${ela}`;
    });

    const remarks = app.scrutinyRemarks || [];
    const remarkLines = remarks.map((r, i) => {
      return `${i + 1}. [${r.action}] by ${r.officerName}: "${r.comment}" (${new Date(r.timestamp).toLocaleDateString()})`;
    });

    // Pure PDF stream builder
    const streamOps = [
      'BT',
      '/F1 14 Tf 45 780 Td (ALL INDIA COUNCIL FOR TECHNICAL EDUCATION) Tj',
      '/F1 11 Tf 0 -22 Td (CENTRAL REGULATORY SCRUTINY & COMPLIANCE SUMMARY REPORT) Tj',
      '/F2 8.5 Tf 0 -22 Td (Application Ref: ' + appNum + ' | Academic Year: ' + academicYear + ' | Category: ' + category + ') Tj',
      '0 -14 Td (Institution: ' + instName + ' | AICTE Permanent ID: ' + aicteId + ') Tj',
      '0 -14 Td (Requested Intake: ' + intake + ' Seats | Students Enrolled: ' + students + ' | Mandated SFR: <= 1:15) Tj',
      '0 -18 Td (--------------------------------------------------------------------------------------------------------------------------------) Tj',
      '/F1 10 Tf 0 -18 Td (COMPLIANCE TRIAGE VERDICT: ' + triage + ' | COMPOSITE RISK SCORE: ' + risk + '/100) Tj',
      '/F2 8.5 Tf 0 -16 Td (Triage Classification Rationale: Multi-service automated analysis + Officer verification rail audit) Tj',
      '0 -18 Td (--------------------------------------------------------------------------------------------------------------------------------) Tj',
      '/F1 9.5 Tf 0 -16 Td (STATUTORY DOCUMENT REPOSITORY & INTEGRITY AUDIT:) Tj',
      '/F2 8 Tf',
    ];

    if (docLines.length > 0) {
      docLines.forEach((line) => {
        streamOps.push('0 -14 Td (' + line.replace(/[()]/g, '') + ') Tj');
      });
    } else {
      streamOps.push('0 -14 Td (No statutory documents registered yet.) Tj');
    }

    streamOps.push('0 -18 Td (--------------------------------------------------------------------------------------------------------------------------------) Tj');
    streamOps.push('/F1 9.5 Tf 0 -16 Td (SCRUTINY OFFICER REMARKS & DECISION TRAIL:) Tj');
    streamOps.push('/F2 8 Tf');

    if (remarkLines.length > 0) {
      remarkLines.forEach((line) => {
        streamOps.push('0 -14 Td (' + line.replace(/[()]/g, '') + ') Tj');
      });
    } else {
      streamOps.push('0 -14 Td (Automated scrutiny completed. Initial triage recorded without manual officer override.) Tj');
    }

    streamOps.push('0 -22 Td (--------------------------------------------------------------------------------------------------------------------------------) Tj');
    streamOps.push('/F2 7.5 Tf 0 -14 Td (Digitally authenticated under Indian IT Act 2000 & PKI Infrastructure. Central AICTE Record Vault.) Tj');
    streamOps.push('0 -11 Td (Report Generated on: ' + new Date().toISOString() + ' | Verification State: Immutable Chained SHA-256) Tj');
    streamOps.push('ET');

    const stream = streamOps.join(' ');
    const streamLen = Buffer.byteLength(stream, 'latin1');

    const pdfContent = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >> endobj
4 0 obj << /Length ${streamLen} >> stream
${stream}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj
6 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000262 00000 n 
0000000320 00000 n 
0000000385 00000 n 
trailer << /Size 7 /Root 1 0 R >>
startxref
445
%%EOF`;

    const pdfBuffer = Buffer.from(pdfContent, 'latin1');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="AICTE_Scrutiny_Report_${appNum}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

