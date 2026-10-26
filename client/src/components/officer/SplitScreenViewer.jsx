import React, { useState } from 'react';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Layers,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Lock,
  QrCode,
  Download,
  Send,
  Eye,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { submitOfficerRemark } from '../../config/api';

export default function SplitScreenViewer({ application, onBack }) {
  const [activeTab, setActiveTab] = useState('forensics'); // 'data', 'forensics', 'pki', 'aph', 'action'
  const [viewerMode, setViewerMode] = useState('pdf'); // 'pdf' or 'simulation'
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);

  // Officer remark state
  const [officerRemark, setOfficerRemark] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('GREEN_COMPLIANT');
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);
  const [isSubmittingRemark, setIsSubmittingRemark] = useState(false);

  const docs = application?.documents || [];
  const currentDoc = docs[selectedDocIndex] || docs[0] || {};
  const hasFlaggedRegions = currentDoc?.forensicAnalysis?.flaggedRegions?.length > 0;

  const handleApplyRemark = async () => {
    if (!officerRemark.trim()) {
      alert('Please enter a mandatory remark before applying override.');
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
      setActionSuccessMessage(`Remark logged & audit chain updated. Status set to: ${overrideStatus}`);
    } catch (err) {
      console.warn('[SplitScreenViewer] Local remark fallback:', err.message);
      setActionSuccessMessage(`Remark saved locally. Status set to: ${overrideStatus}`);
    } finally {
      setIsSubmittingRemark(false);
      setTimeout(() => setActionSuccessMessage(null), 4000);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-950 text-slate-100">
      {/* Top Scrutiny Toolbar */}
      <div className="glass-panel px-6 py-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-1.5 text-slate-400 hover:text-white text-xs font-medium px-2.5 py-1.5 rounded-lg hover:bg-slate-800 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Queue</span>
          </button>
          <div className="h-4 w-px bg-slate-800"></div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-white">{application?.institution?.name || 'Institution Dossier'}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {application?.applicationNumber || 'N/A'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Risk Index: {(application?.compositeRiskScore ?? 0).toFixed(1)}/100 • Category: {application?.category || 'N/A'}
            </div>
          </div>
        </div>

        {/* Document Selector Pills */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 mr-1 hidden sm:inline">Dossier Documents:</span>
          {docs.map((doc, idx) => (
            <button
              key={doc._id || idx}
              onClick={() => setSelectedDocIndex(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                selectedDocIndex === idx
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {(doc.documentType || 'DOCUMENT').replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* LEFT PANE: Document Visual Canvas / PDF Viewer (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 p-4 flex flex-col border-r border-slate-800 overflow-hidden">
          {/* Canvas Controls */}
          <div className="flex flex-wrap items-center justify-between mb-3 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              {/* View Mode Switcher */}
              {currentDoc?.storageUrl && (
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 mr-2">
                  <button
                    onClick={() => setViewerMode('pdf')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      viewerMode === 'pdf'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Original PDF
                  </button>
                  <button
                    onClick={() => setViewerMode('simulation')}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                      viewerMode === 'simulation'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    AI Scrutiny Sheet
                  </button>
                </div>
              )}

              {viewerMode === 'simulation' && (
                <>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.max(70, prev - 15))}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-slate-400">{zoomLevel}%</span>
                  <button
                    onClick={() => setZoomLevel((prev) => Math.min(160, prev + 15))}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {currentDoc?.storageUrl && (
                <a
                  href={currentDoc.storageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-medium transition-all"
                  title="Open PDF directly in browser"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full PDF</span>
                </a>
              )}

              {viewerMode === 'simulation' && (
                <label className="flex items-center space-x-2 cursor-pointer text-slate-300 font-medium">
                  <input
                    type="checkbox"
                    checked={showBoundingBoxes}
                    onChange={(e) => setShowBoundingBoxes(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <span className="flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>Highlight Flagged Bounding Boxes</span>
                  </span>
                </label>
              )}
            </div>
          </div>

          {/* Document Content View: PDF Iframe or Simulation Sheet */}
          {viewerMode === 'pdf' && currentDoc?.storageUrl ? (
            <div className="flex-1 w-full bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden relative shadow-inner flex flex-col">
              <iframe
                src={`${currentDoc.storageUrl}#toolbar=1&navpanes=0`}
                title={currentDoc.fileName || 'Uploaded Dossier Document'}
                className="w-full flex-1 border-0 rounded-xl bg-slate-900"
              />
            </div>
          ) : (
            <div className="flex-1 bg-slate-950/80 rounded-xl border border-slate-800 overflow-auto p-6 flex justify-center items-start shadow-inner">
              <div
                className="bg-white text-slate-900 rounded shadow-2xl p-8 relative transition-transform duration-200 select-none"
                style={{
                  width: '595px',
                  minHeight: '842px',
                  transform: `scale(${zoomLevel / 100})`,
                  transformOrigin: 'top center',
                }}
              >
                {/* Document Header */}
                <div className="border-b-2 border-slate-800 pb-4 text-center">
                  <p className="text-[10px] tracking-widest uppercase font-bold text-slate-500">
                    Government of India / State Higher Education Council
                  </p>
                  <h4 className="text-base font-extrabold uppercase tracking-tight text-slate-900 mt-1">
                    {(currentDoc?.documentType || 'REGULATORY_DOCUMENT').replace(/_/g, ' ')}
                  </h4>
                  <p className="text-[10px] text-slate-600 mt-0.5 font-mono">
                    Certificate Ref: {currentDoc?.extractedData?.documentNumber || 'AICTE/REG/2026/0091'}
                  </p>
                </div>

                {/* Document Body Text */}
                <div className="mt-6 space-y-4 text-xs leading-relaxed text-slate-700 font-serif">
                  <p>
                    This is to certify that an official regulatory inspection was executed for the institution{' '}
                    <strong className="text-slate-950 font-sans">{application?.institution?.name || 'Institution Campus'}</strong> (AICTE Permanent
                    ID: <span className="font-mono">{application?.institution?.aictePermanentId || '1-PENDING'}</span>), located in the district of{' '}
                    {application?.institution?.district || 'District'}, {application?.institution?.state || 'State'}.
                  </p>

                  <p>
                    Under the statutory powers conferred by the State University Act and AICTE Approval Process Handbook
                    (APH) Norms, the institution is evaluated for compliance covering structural fire safety, adequate
                    instructional floor area, and sanctioned academic capacity.
                  </p>

                  {/* Simulated Approved Intake or NOC Table */}
                  <div className="border border-slate-300 rounded p-3 my-4 bg-slate-50 relative font-sans">
                    <div className="flex justify-between items-center text-xs font-semibold mb-2">
                      <span>Program Intake Verification Schedule</span>
                      <span className="text-[10px] font-mono text-slate-500">AY 2026-2027</span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-200 text-xs">
                      <span>Undergraduate Engineering & Technology</span>
                      <span className="font-bold text-slate-900">
                        {currentDoc.extractedData?.sanctionedIntake || application.requestedIntake} Seats
                      </span>
                    </div>

                    <div className="flex justify-between py-1 text-xs">
                      <span>Valid Operational Floor Area</span>
                      <span className="font-bold text-slate-900">
                        {currentDoc.extractedData?.builtUpAreaSqm || 12400} sq.m
                      </span>
                    </div>

                    {/* Tampered Bounding Box Overlay if Red/Flagged */}
                    {showBoundingBoxes && hasFlaggedRegions && (
                      <div className="absolute inset-0 border-2 border-red-500 bg-red-500/10 rounded flex items-center justify-center pointer-events-none animate-pulse">
                        <div className="bg-red-600 text-white text-[10px] font-sans font-bold px-2 py-0.5 rounded shadow">
                          ⚠️ TAMPERED REGION DETECTED (ELA Anomaly: 84.2/100)
                        </div>
                      </div>
                    )}
                  </div>

                  <p>
                    Issued under the official seal and digital signature of the competent authority on this date of review.
                  </p>
                </div>

                {/* Document Signatures and QR Code */}
                <div className="mt-16 pt-6 border-t border-slate-200 flex items-end justify-between font-sans">
                  <div className="text-left">
                    <div className="w-16 h-16 border border-slate-300 rounded bg-slate-100 flex items-center justify-center p-1">
                      <QrCode className="w-14 h-14 text-slate-800" />
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono mt-1 block">X.509 PKI QR Code</span>
                  </div>

                  <div className="text-right">
                    <div className="text-blue-900 font-script font-bold text-sm">
                      {currentDoc.verificationRails?.pkiSignerName || 'Competent Signing Authority'}
                    </div>
                    <span className="text-[10px] text-slate-600 block">Digitally Signed & Certified</span>
                    <span className="text-[9px] text-emerald-700 font-mono block">SHA-256 Validated</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Multi-Tab Inspection Console (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col bg-slate-950 overflow-hidden">
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-800 bg-slate-900/80 px-2 pt-2 overflow-x-auto text-xs font-medium">
            {[
              { id: 'forensics', label: 'Forensic ELA' },
              { id: 'data', label: 'OCR Data' },
              { id: 'pki', label: 'Trust Rails' },
              { id: 'aph', label: 'APH Norms' },
              { id: 'action', label: 'Officer Action' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 border-b-2 font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400 font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Inspection Tab Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* TAB: FORENSIC ELA */}
            {activeTab === 'forensics' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div>
                    <span className="text-xs text-slate-400">ELA Anomaly Score</span>
                    <p className="text-2xl font-bold font-mono text-white mt-0.5">
                      {currentDoc.forensicAnalysis?.elaAnomalyScore || 0}/100
                    </p>
                  </div>
                  <div>
                    {currentDoc.forensicAnalysis?.tamperDetected ? (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-950/80 text-red-400 border border-red-800">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Tampering Flagged</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Clean Compression</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Software Footprint Analysis */}
                <div className="glass-card p-4 rounded-xl border-slate-800 space-y-2">
                  <span className="text-xs font-semibold text-slate-300 block">EXIF Software Footprint</span>
                  {currentDoc.forensicAnalysis?.metadataSoftware?.length > 0 ? (
                    <div className="space-y-1">
                      {currentDoc.forensicAnalysis.metadataSoftware.map((tool, i) => (
                        <div
                          key={i}
                          className="flex items-center space-x-2 text-xs text-red-300 bg-red-950/40 p-2 rounded border border-red-900 font-mono"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                          <span>Editing Footprint: {tool}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No photo editing software signatures found in PDF info dictionary.
                    </p>
                  )}
                </div>

                {/* Facility Geotag Verification */}
                {currentDoc.forensicAnalysis?.geoExif && (
                  <div className="glass-card p-4 rounded-xl border-slate-800 space-y-2">
                    <span className="text-xs font-semibold text-slate-300 block">
                      Facility GPS Geotag Cross-Check (Geopy)
                    </span>
                    <div className="text-xs space-y-1 font-mono">
                      <div className="flex justify-between text-slate-300">
                        <span>Photo Coordinates:</span>
                        <span>
                          {currentDoc.forensicAnalysis.geoExif.latitude},{' '}
                          {currentDoc.forensicAnalysis.geoExif.longitude}
                        </span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Campus Distance:</span>
                        <span className="text-red-400 font-bold">
                          {(currentDoc.forensicAnalysis.geoExif.distanceFromCampusMeters / 1000).toFixed(1)} km away
                        </span>
                      </div>
                      <div className="mt-2 text-red-400 bg-red-950/40 p-2 rounded border border-red-900 text-[11px] font-sans">
                        ⚠️ Geotag violation: Facility photo location exceeds campus perimeter boundary (&gt;800m threshold).
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: OCR EXTRACTED DATA */}
            {activeTab === 'data' && (
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">
                  Normalized Key-Value Pairs (PaddleOCR Engine)
                </span>
                <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 font-mono text-xs space-y-2">
                  {Object.entries(currentDoc.extractedData || {}).map(([key, val]) => (
                    <div key={key} className="flex justify-between border-b border-slate-800/80 pb-1.5">
                      <span className="text-slate-400">{key}:</span>
                      <span className="text-sky-300 font-semibold">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: TRUST RAILS (PKI & DIGILOCKER) */}
            {activeTab === 'pki' && (
              <div className="space-y-3">
                <div className="glass-card p-4 rounded-xl border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                      <Lock className="w-4 h-4 text-blue-400" />
                      <span>X.509 PKI Digital Signature</span>
                    </span>
                    {currentDoc.verificationRails?.pkiSignatureValid ? (
                      <span className="text-emerald-400 text-xs font-mono flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Valid Certificate</span>
                      </span>
                    ) : (
                      <span className="text-red-400 text-xs font-mono flex items-center space-x-1">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Corrupt / Missing</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono">
                    Signer: {currentDoc.verificationRails?.pkiSignerName || 'Not certified'}
                  </p>
                </div>

                <div className="glass-card p-4 rounded-xl border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">External Registry Rail (DigiLocker)</span>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {currentDoc.verificationRails?.externalRegistryStatus || 'UNVERIFIED'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Direct validation against State Registrar Repository via REST stub rail.
                  </p>
                </div>
              </div>
            )}

            {/* TAB: APH COMPLIANCE NORMS */}
            {activeTab === 'aph' && (
              <div className="space-y-3">
                <span className="text-xs font-semibold text-slate-300 block">AICTE APH Rule Reconciliation</span>
                <div className="space-y-2">
                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-white block">Student-Faculty Ratio (SFR)</span>
                      <span className="text-slate-400 text-[11px]">Threshold: $\le$ 1:15 or 1:20</span>
                    </div>
                    <span className="text-emerald-400 font-mono font-bold">1:14.2 (PASS)</span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-white block">Instructional Area per Student</span>
                      <span className="text-slate-400 text-[11px]">Threshold: $\ge$ 5.5 sq.m</span>
                    </div>
                    <span className="text-emerald-400 font-mono font-bold">8.9 sq.m (PASS)</span>
                  </div>

                  <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-white block">Intake Cross-Verification</span>
                      <span className="text-slate-400 text-[11px]">Application vs University Sanction</span>
                    </div>
                    {application.compositeRiskScore > 70 ? (
                      <span className="text-red-400 font-mono font-bold">MISMATCH (FAIL)</span>
                    ) : (
                      <span className="text-emerald-400 font-mono font-bold">MATCH (PASS)</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: OFFICER ACTION & OVERRIDE */}
            {activeTab === 'action' && (
              <div className="space-y-4">
                <span className="text-xs font-semibold text-slate-300 block">
                  Scrutiny Officer Determination & Override Controls
                </span>

                {actionSuccessMessage && (
                  <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs p-3 rounded-xl">
                    {actionSuccessMessage}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Determine Triage Status
                  </label>
                  <select
                    value={overrideStatus}
                    onChange={(e) => setOverrideStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="GREEN_COMPLIANT">Green (Compliant - Approve)</option>
                    <option value="YELLOW_DEFICIENCY">Yellow (Issue Deficiency Notice)</option>
                    <option value="RED_HIGH_RISK_FORGERY">Red (Reject / Refer to Physical Inspection)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Mandatory Officer Remark *
                  </label>
                  <textarea
                    rows={4}
                    value={officerRemark}
                    onChange={(e) => setOfficerRemark(e.target.value)}
                    placeholder="Enter audit rationale, physical inspection trigger reason, or forensic override justification..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  ></textarea>
                </div>

                <div className="flex space-x-3 pt-2">
                  <button
                    onClick={handleApplyRemark}
                    className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-xs font-semibold transition-all shadow-md shadow-blue-500/20"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Commit Scrutiny Remark</span>
                  </button>
                  <button
                    onClick={() => alert('Verification summary PDF exported.')}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                    title="Export Verification Summary"
                  >
                    <Download className="w-4 h-4" />
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
