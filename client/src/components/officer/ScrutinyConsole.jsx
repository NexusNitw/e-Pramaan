import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileSearch,
  Filter,
  Search,
  ChevronRight,
  TrendingUp,
  Building2,
} from 'lucide-react';

export default function ScrutinyConsole({ applications, onSelectApplication }) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Top Banner & KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingested */}
        <div className="glass-card p-5 rounded-2xl border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Dossiers Ingested</span>
            <div className="p-2 rounded-lg bg-blue-950/60 text-blue-400 border border-blue-900">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-white mt-3 font-mono">{totalCount}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Active 2026-2027 Cycle</span>
        </div>

        {/* Green Compliant */}
        <div className="glass-card p-5 rounded-2xl border-emerald-950/60 bg-gradient-to-br from-emerald-950/20 to-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-300">Green (Compliant)</span>
            <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-800">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-400 mt-3 font-mono">{greenCount}</p>
          <span className="text-[11px] text-emerald-500/80 mt-1 block">Passed All APH & Forensic Checks</span>
        </div>

        {/* Yellow Deficiencies */}
        <div className="glass-card p-5 rounded-2xl border-amber-950/60 bg-gradient-to-br from-amber-950/20 to-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-300">Yellow (Deficiencies)</span>
            <div className="p-2 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-800">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-400 mt-3 font-mono">{yellowCount}</p>
          <span className="text-[11px] text-amber-500/80 mt-1 block">Rectifiable Norm Shortfalls / Expired NOC</span>
        </div>

        {/* Red Forgery */}
        <div className="glass-card p-5 rounded-2xl border-red-950/60 bg-gradient-to-br from-red-950/20 to-slate-900/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-red-300">Red (Suspected Forgery)</span>
            <div className="p-2 rounded-lg bg-red-950/80 text-red-400 border border-red-800">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-red-400 mt-3 font-mono">{redCount}</p>
          <span className="text-[11px] text-red-500/80 mt-1 block">Tampered Intake / Spliced Certificates</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Triage Status Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto">
          <span className="text-xs text-slate-400 flex items-center space-x-1 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Triage:</span>
          </span>
          {[
            { id: 'ALL', label: 'All Dossiers' },
            { id: 'GREEN_COMPLIANT', label: 'Green (Compliant)' },
            { id: 'YELLOW_DEFICIENCY', label: 'Yellow (Deficient)' },
            { id: 'RED_HIGH_RISK_FORGERY', label: 'Red (High Risk)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search college name or AICTE ID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Applications Scrutiny Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileSearch className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Scrutiny Triage Queue ({filteredApps.length} Applications)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Live Atlas Stream</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Application & College</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Triage Status</th>
                <th className="px-6 py-3.5">Composite Risk Index</th>
                <th className="px-6 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-sans">
              {filteredApps.map((app) => {
                const isGreen = app.triageStatus === 'GREEN_COMPLIANT';
                const isYellow = app.triageStatus === 'YELLOW_DEFICIENCY';
                const isRed = app.triageStatus === 'RED_HIGH_RISK_FORGERY';

                return (
                  <tr
                    key={app._id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectApplication(app)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                        {app.institution?.name || 'Institution Dossier'}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center space-x-2">
                        <span>{app.applicationNumber || 'N/A'}</span>
                        <span>•</span>
                        <span>ID: {app.institution?.aictePermanentId || 'N/A'}</span>
                        <span>•</span>
                        <span>{app.institution?.state || app.institution?.address?.state || 'India'}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-slate-300 font-medium">
                        {(app.category || 'REGULATORY_APPLICATION').replace(/_/g, ' ')}
                      </span>
                      <span className="block text-[11px] text-slate-400 font-mono">
                        Intake: {app.requestedIntake || 0} seats
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {isGreen && (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Compliant</span>
                        </span>
                      )}
                      {isYellow && (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-950/80 text-amber-400 border border-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                          <span>Deficiency</span>
                        </span>
                      )}
                      {isRed && (
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-950/80 text-red-400 border border-red-800 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                          <span>High Risk Forgery</span>
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isRed ? 'bg-red-500' : isYellow ? 'bg-amber-400' : 'bg-emerald-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, app.compositeRiskScore || 0))}%` }}
                          ></div>
                        </div>
                        <span className="font-mono font-bold text-slate-200">
                          {(app.compositeRiskScore ?? 0).toFixed(1)}/100
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectApplication(app);
                        }}
                        className="inline-flex items-center space-x-1.5 bg-blue-600/80 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm"
                      >
                        <span>Inspect Dossier</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
