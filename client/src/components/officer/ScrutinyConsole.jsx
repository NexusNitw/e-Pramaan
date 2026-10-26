import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileSearch,
  Filter,
  Search,
  ChevronRight,
  Building2,
  Loader2,
} from 'lucide-react';
import { useLoading } from '../../context/LoadingContext';

export default function ScrutinyConsole({ applications, onSelectApplication }) {
  const { triggerClickFeedback } = useLoading();
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [openingAppId, setOpeningAppId] = useState(null);

  // Calculate metrics
  const totalCount = applications.length;
  const greenCount = applications.filter((a) => a.triageStatus === 'GREEN_COMPLIANT').length;
  const yellowCount = applications.filter((a) => a.triageStatus === 'YELLOW_DEFICIENCY').length;
  const redCount = applications.filter((a) => a.triageStatus === 'RED_HIGH_RISK_FORGERY').length;

  const filteredApps = applications.filter((app) => {
    const matchesStatus = filterStatus === 'ALL' || app.triageStatus === filterStatus;
    const instName = app.institution?.name || (typeof app.institution === 'string' ? app.institution : '');
    const instId = app.institution?.aictePermanentId || '';
    const appNum = app.applicationNumber || '';

    const matchesSearch =
      instName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instId.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleSelect = (app) => {
    setOpeningAppId(app._id);
    triggerClickFeedback(`Opening Dossier: ${app.institution?.name || app.applicationNumber}`);
    setTimeout(() => {
      onSelectApplication(app);
    }, 200);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 space-y-6 font-sans">
      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingested */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 transition-all hover:border-slate-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Applications</span>
            <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white mt-2 font-mono">{totalCount}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Active 2026-2027 Cycle</span>
        </div>

        {/* Green Compliant */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 transition-all hover:border-emerald-800/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-400">Compliant (Green)</span>
            <div className="p-1.5 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-900">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2 font-mono">{greenCount}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">APH Norms Verified</span>
        </div>

        {/* Yellow Deficiency */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 transition-all hover:border-amber-800/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-400">Deficiencies (Yellow)</span>
            <div className="p-1.5 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-900">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-400 mt-2 font-mono">{yellowCount}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">SFR / Land / Cadre Gaps</span>
        </div>

        {/* Red Flagged */}
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 transition-all hover:border-red-800/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-400">High Risk / Flagged</span>
            <div className="p-1.5 rounded-lg bg-red-950/80 text-red-400 border border-red-900">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-400 mt-2 font-mono">{redCount}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Tampering / Spliced Intake</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        {/* Triage Status Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto">
          <span className="text-xs text-slate-400 flex items-center space-x-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </span>
          {[
            { id: 'ALL', label: 'All Applications' },
            { id: 'GREEN_COMPLIANT', label: 'Compliant' },
            { id: 'YELLOW_DEFICIENCY', label: 'Deficiencies' },
            { id: 'RED_HIGH_RISK_FORGERY', label: 'Flagged / Red' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                triggerClickFeedback(`Filter: ${tab.label}`);
                setFilterStatus(tab.id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap active:scale-95 ${
                filterStatus === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by college name, ref, or AICTE ID..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Applications Scrutiny Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center space-x-2">
            <FileSearch className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Scrutiny Queue ({filteredApps.length} Applications)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Cycle: 2026-2027</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="px-5 py-3">Institution & Ref</th>
                <th className="px-5 py-3">Application Category</th>
                <th className="px-5 py-3">Compliance Status</th>
                <th className="px-5 py-3">Risk Index</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-sans">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400 text-xs">
                    No applications match the specified filter or search query.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
                  const isGreen = app.triageStatus === 'GREEN_COMPLIANT';
                  const isYellow = app.triageStatus === 'YELLOW_DEFICIENCY';
                  const isRed = app.triageStatus === 'RED_HIGH_RISK_FORGERY';
                  const isOpening = openingAppId === app._id;

                  return (
                    <tr
                      key={app._id}
                      className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                      onClick={() => handleSelect(app)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white group-hover:text-blue-400 transition-colors flex items-center space-x-2">
                          <span>{app.institution?.name || 'Institution Dossier'}</span>
                          {isOpening && <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center space-x-2">
                          <span>{app.applicationNumber || 'N/A'}</span>
                          <span>•</span>
                          <span>ID: {app.institution?.aictePermanentId || 'N/A'}</span>
                          <span>•</span>
                          <span>{app.institution?.state || app.institution?.address?.state || 'India'}</span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="text-slate-300 font-medium">
                          {(app.category || 'REGULATORY_APPLICATION').replace(/_/g, ' ')}
                        </span>
                        <span className="block text-[11px] text-slate-400 font-mono">
                          Intake: {app.requestedIntake || 0} seats
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        {isGreen && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Compliant</span>
                          </span>
                        )}
                        {isYellow && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                            <span>Deficiency</span>
                          </span>
                        )}
                        {isRed && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-950/80 text-red-400 border border-red-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                            <span>Flagged / High Risk</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-20 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isRed ? 'bg-red-500' : isYellow ? 'bg-amber-400' : 'bg-emerald-400'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(0, app.compositeRiskScore || 0))}%` }}
                            ></div>
                          </div>
                          <span className="font-mono font-bold text-slate-200 text-xs">
                            {(app.compositeRiskScore ?? 0).toFixed(1)}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(app);
                          }}
                          disabled={isOpening}
                          className="inline-flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-75"
                        >
                          {isOpening ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                              <span>Opening...</span>
                            </>
                          ) : (
                            <>
                              <span>Inspect</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
