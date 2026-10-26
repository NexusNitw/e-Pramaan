import React from 'react';
import {
  ShieldCheck,
  Building2,
  UserCheck,
  LogOut,
  SlidersHorizontal,
} from 'lucide-react';

export default function Navbar({ currentUser, activePortal, setActivePortal, onLogout }) {
  const isOfficer = currentUser?.role === 'OFFICER';
  const isAdmin = currentUser?.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & AICTE identity */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base tracking-tight text-white">
                  e-Pramaan
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                  AICTE Regulatory Portal
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                National Document Scrutiny & Compliance Verification
              </p>
            </div>
          </div>

          {/* User Profile & Navigation */}
          <div className="flex items-center space-x-4">
            {/* Admin Portal Switcher (Only visible to Admin) */}
            {isAdmin && (
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActivePortal('officer')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    activePortal === 'officer'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Officer Console
                </button>
                <button
                  onClick={() => setActivePortal('applicant')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                    activePortal === 'applicant'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Applicant Portal
                </button>
              </div>
            )}

            {/* User Profile Badge */}
            {currentUser && (
              <div className="flex items-center space-x-3 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center text-blue-400">
                  {isOfficer ? (
                    <UserCheck className="w-4 h-4" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-semibold text-slate-200 leading-tight">
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono flex items-center space-x-1">
                    <span className="uppercase text-blue-400 font-medium">
                      {currentUser.role === 'OFFICER' ? 'Scrutiny Officer' : 'Institution'}
                    </span>
                    {currentUser.aictePermanentId && (
                      <span>• ID: {currentUser.aictePermanentId}</span>
                    )}
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={onLogout}
                  title="Sign out of e-Pramaan"
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors ml-1"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
