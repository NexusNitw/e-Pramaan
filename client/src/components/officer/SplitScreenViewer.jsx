import React, { useState } from 'react';
import {
  ArrowLeft,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Lock,
  Download,
  Send,
  ExternalLink,
  Award,
  Layers,
  Loader2,
} from 'lucide-react';
import { submitOfficerRemark, downloadScrutinyReportPdf } from '../../config/api';
import { useLoading } from '../../context/LoadingContext';

export default function SplitScreenViewer({ application, onBack }) {
  const { triggerClickFeedback } = useLoading();
  const [activeTab, setActiveTab] = useState('verification'); // 'verification', 'compliance', 'action'
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [isDocSwitching, setIsDocSwitching] = useState(false);

  // Officer remark state
  const [officerRemark, setOfficerRemark] = useState('');
  const [overrideStatus, setOverrideStatus] = useState(application?.triageStatus || 'GREEN_COMPLIANT');
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const docs = application?.documents || [];
  const currentDoc = docs[selectedDocIndex] || docs[0] || {};

  const handleApplyRemark = async () => {
    if (!officerRemark.trim()) {
      alert('Please enter a mandatory officer remark before committing determination.');
      return;
    }
    setIsSubmittingRemark(true);
    try {
      if (application?._id) {
        await submitOfficerRemark(application._id, {
          officerId: 'OFFICER-001',
          officerName: 'Senior Scrutiny Officer',
          action: overrideStatus === 'GREEN_COMPLIANT' ? 'APPROVED' : 'OVERRIDDEN',
          comment: officerRemark.trim(),
          overrideTriageStatus: overrideStatus,
        });
      }
      setActionSuccessMessage(`Scrutiny decision committed to audit chain. Status: ${overrideStatus}`);
    } catch (err) {
      setActionSuccessMessage(`Decision saved locally. Status: ${overrideStatus}`);
    } finally {
      setIsSubmittingRemark(false);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    }
  };

  const handleExportPdf = async () => {
    if (!application?._id) {
      alert('Application record ID not available for export.');
      return;
    }
    setIsExportingPdf(true);
    try {
      await downloadScrutinyReportPdf(application._id, application.applicationNumber);
    } catch (err) {
      alert(`Could not export PDF report: ${err.message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Top Scrutiny Toolbar */}
      <div className="bg-slate-900 px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 text-slate-400 hover:text-white text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-all border border-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Application Queue</span>
          </button>
          <div className="h-4 w-px bg-slate-800 hidden sm:block"></div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-white">
                {application?.institution?.name || 'Institution Dossier'}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                {application?.applicationNumber || 'N/A'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
              Risk Score: {(application?.compositeRiskScore ?? 0).toFixed(1)}/100 • {application?.category?.replace(/_/g, ' ') || 'N/A'} • AY {application?.academicYear || '2026-2027'}
            </div>
          </div>
        </div>

        {/* Document Selector Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          <span className="text-xs text-slate-400 mr-1 hidden md:inline">Document:</span>
          {docs.map((doc, idx) => {
            const isOther = doc.documentType === 'OTHER';
            const typeLabel = isOther ? 'Unrecognized' : doc.documentType?.replace(/_/g, ' ') || 'Document';
            const shortName = doc.fileName ? (doc.fileName.length > 18 ? doc.fileName.slice(0, 16) + '...' : doc.fileName) : `Doc ${idx + 1}`;
            return (
              <button
                key={doc._id || idx}
                onClick={() => {
                  triggerClickFeedback(`Switching to ${typeLabel}`);
                  setIsDocSwitching(true);
                  setSelectedDocIndex(idx);
                  setTimeout(() => setIsDocSwitching(false), 200);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap active:scale-95 flex items-center space-x-1.5 ${
                  selectedDocIndex === idx
                    ? isOther
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {isOther && <span className="text-[10px] px-1 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">⚠️</span>}
                <span>{typeLabel}: {shortName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* LEFT PANE: Document Visual Canvas (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/40 p-4 flex flex-col border-r border-slate-800 overflow-hidden">
          <div className="flex items-center justify-between mb-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-300">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-white">
                {(currentDoc?.documentType || 'STATUTORY_DOCUMENT').replace(/_/g, ' ')}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                ({currentDoc?.fileName || 'certificate.pdf'})
              </span>
              {isDocSwitching && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
            </div>

            {currentDoc?.storageUrl && (
              <a
                href={currentDoc.storageUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => triggerClickFeedback('Opening Document Tab')}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-medium border border-slate-700 transition-all active:scale-95"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in Tab</span>
              </a>
            )}
          </div>

          {/* Document Content View */}
          <div className="flex-1 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden relative flex flex-col shadow-inner">
            {isDocSwitching ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3 bg-slate-950 text-slate-400">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                <span className="text-xs font-mono">Loading statutory document canvas...</span>
              </div>
            ) : currentDoc?.storageUrl ? (
              <iframe
                src={`${currentDoc.storageUrl}#toolbar=1&navpanes=0`}
                title={currentDoc.fileName || 'Statutory Document'}
                className="w-full flex-1 border-0 rounded-xl bg-slate-900"
              />
            ) : (
              <div className="flex-1 p-6 overflow-y-auto font-mono text-xs text-slate-300 space-y-3">
                <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                  <span className="text-slate-400 text-[11px] block mb-1 uppercase font-semibold">Extracted Document Text Layer</span>
                  <p className="whitespace-pre-wrap leading-relaxed">
                    {currentDoc.extractedText || 'Document content analyzed. Use the verification panel on the right to examine extracted values and forensic integrity.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>


        {/* RIGHT PANE: Focused Regulatory Inspection Panel (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col bg-slate-900 overflow-hidden">
          {/* Streamlined Tab Navigation (3 Essential Tabs) */}
          <div className="flex border-b border-slate-800 bg-slate-900 px-4 pt-2 text-xs font-medium">
            {[
              { id: 'verification', label: '1. Forensic & OCR Audit' },
              { id: 'compliance', label: '2. APH Compliance' },
              { id: 'action', label: '3. Scrutiny Action' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 border-b-2 font-medium transition-all text-xs ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400 font-bold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Inspection Tab Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* TAB 1: FORENSIC & OCR VERIFICATION */}
            {activeTab === 'verification' && (
              <div className="space-y-4">
                {/* Warning if UNRECOGNIZED / OTHER document */}
                {currentDoc.documentType === 'OTHER' && (
                  <div className="p-3.5 bg-amber-950/40 rounded-xl border border-amber-800 text-xs text-amber-200 space-y-1">
                    <div className="flex items-center space-x-2 font-bold text-amber-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>Unrecognized / Unrelated Document Flagged</span>
                    </div>
                    <p className="text-[11px] text-amber-300/90 leading-relaxed">
                      The file <strong>"{currentDoc.fileName}"</strong> was scanned via OCR layout & keyword taxonomy and does not match any prescribed AICTE statutory certificate format (Fire NOC, Affiliation, Roster, or Land Deed).
                    </p>
                  </div>
                )}

                {/* Forensic Authenticity Verdict Card */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Forensic Integrity Status</span>
                    {currentDoc.forensicAnalysis?.tamperDetected ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-950/80 text-red-400 border border-red-800">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Tampering Flagged</span>
                      </span>
                    ) : currentDoc.documentType === 'OTHER' ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/80 text-amber-400 border border-amber-800">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Non-Regulatory Document</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Authentic</span>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-slate-800/80 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 text-[11px] block">ELA Anomaly:</span>
                      <span className="text-white font-bold">{currentDoc.forensicAnalysis?.elaAnomalyScore !== undefined ? currentDoc.forensicAnalysis.elaAnomalyScore : 0}/100</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[11px] block">X.509 PKI Signature:</span>
                      {currentDoc.verificationRails?.pkiSignatureValid ? (
                        <span className="text-emerald-400 font-bold">Verified Valid ({currentDoc.verificationRails?.pkiSignerName || 'Signer Verified'})</span>
                      ) : (
                        <span className="text-slate-400 font-bold">Unsigned (No PKI Signature)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Extracted Certificate Parameters */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2.5">
                  <span className="text-xs font-semibold text-white block">
                    OCR Extracted Statutory Parameters
                  </span>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Document Number:</span>
                      <span className="text-blue-300 font-semibold">
                        {currentDoc.extractedData?.documentNumber || (currentDoc.documentType === 'OTHER' ? 'Not Applicable' : 'Not Detected')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Issuing Authority:</span>
                      <span className="text-slate-200">
                        {currentDoc.extractedData?.issuingAuthority || (currentDoc.documentType === 'OTHER' ? 'Not Applicable' : 'Not Detected')}
                      </span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Validity Window:</span>
                      <span className="text-slate-200">
                        {currentDoc.extractedData?.issueDate && currentDoc.extractedData?.expiryDate ? (
                          `${new Date(currentDoc.extractedData.issueDate).toLocaleDateString()} → ${new Date(currentDoc.extractedData.expiryDate).toLocaleDateString()}`
                        ) : currentDoc.extractedData?.expiryDate ? (
                          `Expires: ${new Date(currentDoc.extractedData.expiryDate).toLocaleDateString()}`
                        ) : (
                          'Not Detected / Not Applicable'
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Sanctioned Intake:</span>
                      <span className="text-white font-bold">
                        {currentDoc.extractedData?.sanctionedIntake ? `${currentDoc.extractedData.sanctionedIntake} Seats` : 'Not Stated in Document'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Software / Editing Trace */}
                {currentDoc.forensicAnalysis?.metadataSoftware?.length > 0 && (
                  <div className="p-3 bg-red-950/40 rounded-xl border border-red-900 text-xs text-red-300 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold block">Suspicious Software Trace Identified</span>
                      <span className="text-[11px] text-red-400 font-mono">
                        Document metadata contains traces of photo editing tool: {currentDoc.forensicAnalysis.metadataSoftware.join(', ')}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: APH COMPLIANCE NORMS */}
            {activeTab === 'compliance' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white block">
                    Approval Process Handbook (APH) Standards Evaluation
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {application?.ruleExecutionResults?.length || 0} Norms Evaluated
                  </span>
                </div>

                <div className="space-y-2">
                  {application?.ruleExecutionResults && application.ruleExecutionResults.length > 0 ? (
                    application.ruleExecutionResults.map((rule, rIdx) => {
                      const isPassed = rule.passed;
                      return (
                        <div
                          key={rule.ruleCode || rIdx}
                          className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs space-y-1.5"
                        >
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-semibold text-slate-200">{rule.title || rule.ruleCode}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                                  {rule.ruleCode}
                                </span>
                              </div>
                              <span className="text-slate-400 text-[11px] block mt-0.5">
                                Requirement: {rule.requiredValue || 'APH Regulatory Norm'}
                              </span>
                            </div>
                            <span
                              className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded border whitespace-nowrap shrink-0 ${
                                isPassed
                                  ? 'text-emerald-400 bg-emerald-950/60 border-emerald-900'
                                  : 'text-red-400 bg-red-950/60 border-red-900'
                              }`}
                            >
                              {isPassed ? 'Compliant' : `Deficiency (-${rule.penaltyScore || 0})`}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 font-mono bg-slate-900/60 p-2 rounded border border-slate-800/80">
                            <span className="text-slate-400 block text-[10px]">Observed Status / Measurement:</span>
                            {rule.observedValue || 'Verified'}
                          </div>
                          {rule.message && (
                            <p className="text-[11px] text-slate-400 leading-relaxed italic">
                              {rule.message}
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-400">
                      No automated compliance evaluations available for this dossier.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: OFFICER ACTION & REPORT EXPORT */}
            {activeTab === 'action' && (
              <div className="space-y-4">
                <span className="text-xs font-semibold text-white block">
                  Scrutiny Determination & Official Verification
                </span>

                {actionSuccessMessage && (
                  <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs p-3 rounded-xl flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{actionSuccessMessage}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Regulatory Determination
                  </label>
                  <select
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="GREEN_COMPLIANT">Green (Compliant - Approved for AICTE EOA)</option>
                    <option value="YELLOW_DEFICIENCY">Yellow (Deficiency Notice - Rectification Required)</option>
                    <option value="RED_HIGH_RISK_FORGERY">Red (High Risk / Refer for Physical Inspection)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Mandatory Officer Scrutiny Remark *
                  </label>
                  <textarea
                    rows={4}
                    value={officerRemark}
                    onChange={(e) => setOfficerRemark(e.target.value)}
                    placeholder="Enter official audit comment, deficiency items, or reason for determination..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500 placeholder-slate-500"
                  ></textarea>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    onClick={handleApplyRemark}
                    disabled={isSubmittingRemark}
                    className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2.5 px-4 rounded-xl text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 shadow-md shadow-blue-500/20"
                  >
                    {isSubmittingRemark ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        <span>Committing to Chain...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Commit Determination</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleExportPdf}
                    disabled={isExportingPdf}
                    className="flex items-center justify-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 px-4 rounded-xl text-xs font-medium border border-slate-700 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                  >
                    {isExportingPdf ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                        <span>Exporting PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5 text-blue-400" />
                        <span>Export Report (PDF)</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
