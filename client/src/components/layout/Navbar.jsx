import React from 'react';
import { ShieldCheck, FileText, LayoutDashboard, Cpu, CheckCircle2 } from 'lucide-react';

export default function Navbar({ activePortal, setActivePortal }) {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & AICTE identity */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-blue-400 via-sky-300 to-indigo-300 bg-clip-text text-transparent">
                  e-Pramaan
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-950/80 text-blue-300 border border-blue-800 font-mono">
                  v1.0 AICTE
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Regulatory Compliance, Intelligent OCR & Forensic Trust Rails
              </p>
            </div>
          </div>

          {/* Microservice Health Indicators */}
          <div className="hidden lg:flex items-center space-x-2 text-xs font-mono bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <span className="flex items-center space-x-1 text-slate-400">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>Rails:</span>
            </span>
            <span className="flex items-center space-x-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Gateway:5000</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400">OCR:8002</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400">Forensics:8001</span>
          </div>

          {/* Dual Portal Switcher Tabs */}
          <div className="flex items-center space-x-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActivePortal('applicant')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePortal === 'applicant'
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Applicant Portal</span>
            </button>

            <button
              onClick={() => setActivePortal('officer')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activePortal === 'officer'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Officer Console</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
