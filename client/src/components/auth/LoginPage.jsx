import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Lock,
  Mail,
  UserCheck,
  ArrowRight,
  AlertCircle,
  FileText,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { loginUser, registerUser } from '../../config/api';
import { useLoading } from '../../context/LoadingContext';

export default function LoginPage({ onLoginSuccess }) {
  const { triggerClickFeedback } = useLoading();

  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState('OFFICER'); // 'OFFICER' or 'APPLICANT'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [aictePermanentId, setAictePermanentId] = useState('');

  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(null); // 'OFFICER' | 'APPLICANT' | 'FORM'
  const [error, setError] = useState(null);

  // Quick Demo Login Handler
  const handleQuickLogin = async (demoRole) => {
    setError(null);
    setLoading(true);
    setLoadingAction(demoRole);
    triggerClickFeedback(`Authenticating as ${demoRole === 'OFFICER' ? 'Scrutiny Officer' : 'College Applicant'}...`);

    const demoEmail = demoRole === 'OFFICER' ? 'officer@aicte.gov.in' : 'applicant@college.edu.in';
    const demoPassword = 'Password@123';

    try {
      const res = await loginUser(demoEmail, demoPassword);
      if (res && res.token && res.user) {
        localStorage.setItem('epramaan_token', res.token);
        localStorage.setItem('epramaan_user', JSON.stringify(res.user));
        onLoginSuccess(res.user);
      }
    } catch (err) {
      // If user wasn't in DB yet, try to register the demo user directly or fallback locally
      try {
        const fallbackRes = await registerUser({
          name: demoRole === 'OFFICER' ? 'Dr. Vikram Malhotra' : 'Apex Institute Director',
          email: demoEmail,
          password: demoPassword,
          role: demoRole,
          officerDesignation: demoRole === 'OFFICER' ? 'Senior Scrutiny Officer' : '',
          institutionName: demoRole === 'APPLICANT' ? 'Apex Institute of Technology & Sciences' : '',
          aictePermanentId: demoRole === 'APPLICANT' ? '1-3349182390' : '',
        });
        if (fallbackRes && fallbackRes.token) {
          localStorage.setItem('epramaan_token', fallbackRes.token);
          localStorage.setItem('epramaan_user', JSON.stringify(fallbackRes.user));
          onLoginSuccess(fallbackRes.user);
          return;
        }
      } catch (regErr) {
        // Fallback for purely offline frontend demo
        const mockUser = {
          name: demoRole === 'OFFICER' ? 'Dr. Vikram Malhotra (Senior Officer)' : 'Apex Institute of Technology',
          email: demoEmail,
          role: demoRole,
          institutionName: demoRole === 'APPLICANT' ? 'Apex Institute of Technology & Sciences' : '',
          aictePermanentId: demoRole === 'APPLICANT' ? '1-3349182390' : '',
          officerDesignation: demoRole === 'OFFICER' ? 'Senior Scrutiny Officer' : '',
        };
        localStorage.setItem('epramaan_token', 'mock_jwt_token_2026');
        localStorage.setItem('epramaan_user', JSON.stringify(mockUser));
        onLoginSuccess(mockUser);
      }
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setLoadingAction('FORM');
    triggerClickFeedback(isRegister ? 'Creating Regulatory Account...' : 'Authenticating Credentials...');

    try {
      if (isRegister) {
        const payload = {
          name,
          email,
          password,
          role,
          institutionName: role === 'APPLICANT' ? institutionName : '',
          aictePermanentId: role === 'APPLICANT' ? aictePermanentId : '',
          officerDesignation: role === 'OFFICER' ? 'Scrutiny Officer' : '',
        };
        const res = await registerUser(payload);
        if (res && res.token && res.user) {
          localStorage.setItem('epramaan_token', res.token);
          localStorage.setItem('epramaan_user', JSON.stringify(res.user));
          onLoginSuccess(res.user);
        }
      } else {
        const res = await loginUser(email, password);
        if (res && res.token && res.user) {
          localStorage.setItem('epramaan_token', res.token);
          localStorage.setItem('epramaan_user', JSON.stringify(res.user));
          onLoginSuccess(res.user);
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Emblem / Portal Header */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/20 mb-4">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-blue-400">
            <ShieldCheck className="w-8 h-8" />
          </div>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center space-x-1.5">
          <span>e-Pramaan Portal</span>
        </h1>
        <p className="mt-1 text-xs text-slate-400 font-medium">
          All India Council for Technical Education (AICTE)
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          National Regulatory Document Scrutiny & Compliance Verification System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 sm:p-8 relative overflow-hidden">
          {/* Subtle top indicator if authenticating */}
          {loading && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 animate-top-loading" />
          )}

          {/* Quick Demo Access Bar */}
          <div className="mb-6">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2.5">
              Select Role for Instant Demonstration:
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleQuickLogin('OFFICER')}
                disabled={loading}
                className="flex flex-col items-start p-3.5 rounded-xl border border-blue-900/60 bg-blue-950/30 hover:bg-blue-950/60 hover:border-blue-700 active:scale-95 transition-all text-left group disabled:opacity-60"
              >
                <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold mb-1">
                  {loadingAction === 'OFFICER' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  <span>Scrutiny Officer</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">
                  Review queue, verify APH norms & audit
                </p>
                <span className="text-[10px] text-blue-300 font-mono mt-1 group-hover:translate-x-0.5 transition-transform inline-flex items-center">
                  {loadingAction === 'OFFICER' ? 'Connecting session...' : 'Sign in as Officer →'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('APPLICANT')}
                disabled={loading}
                className="flex flex-col items-start p-3.5 rounded-xl border border-indigo-900/60 bg-indigo-950/30 hover:bg-indigo-950/60 hover:border-indigo-700 active:scale-95 transition-all text-left group disabled:opacity-60"
              >
                <div className="flex items-center space-x-2 text-indigo-400 text-xs font-semibold mb-1">
                  {loadingAction === 'APPLICANT' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  <span>College Applicant</span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">
                  Upload dossiers & track approval status
                </p>
                <span className="text-[10px] text-indigo-300 font-mono mt-1 group-hover:translate-x-0.5 transition-transform inline-flex items-center">
                  {loadingAction === 'APPLICANT' ? 'Connecting session...' : 'Sign in as College →'}
                </span>
              </button>
            </div>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-slate-900 px-3 text-slate-400 font-medium">
                Or sign in with credentials
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-950/50 border border-red-900 text-red-300 text-xs flex items-center space-x-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Full Name / Representative Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Rameshwar Sharma"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        triggerClickFeedback();
                        setRole('OFFICER');
                      }}
                      className={`p-2 rounded-lg text-xs font-medium border transition-all ${
                        role === 'OFFICER'
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Scrutiny Officer
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerClickFeedback();
                        setRole('APPLICANT');
                      }}
                      className={`p-2 rounded-lg text-xs font-medium border transition-all ${
                        role === 'APPLICANT'
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Institution Applicant
                    </button>
                  </div>
                </div>

                {role === 'APPLICANT' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Institution Name
                      </label>
                      <input
                        type="text"
                        required
                        value={institutionName}
                        onChange={(e) => setInstitutionName(e.target.value)}
                        placeholder="e.g. Apex Institute of Technology"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        AICTE Permanent ID
                      </label>
                      <input
                        type="text"
                        required
                        value={aictePermanentId}
                        onChange={(e) => setAictePermanentId(e.target.value)}
                        placeholder="1-3349182390"
                        className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 font-mono transition-colors"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Official Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="officer@aicte.gov.in"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors font-mono"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Security Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loadingAction === 'FORM' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Authenticating Credentials...</span>
                </>
              ) : (
                <>
                  <span>{isRegister ? 'Register Account' : 'Sign In to Portal'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle between Login and Register */}
          <div className="mt-5 text-center text-xs text-slate-400">
            {isRegister ? (
              <span>
                Already have an authorized account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    triggerClickFeedback();
                    setIsRegister(false);
                  }}
                  className="text-blue-400 hover:underline font-medium ml-1"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Registering a new institution or officer?{' '}
                <button
                  type="button"
                  onClick={() => {
                    triggerClickFeedback();
                    setIsRegister(true);
                  }}
                  className="text-blue-400 hover:underline font-medium ml-1"
                >
                  Create Account
                </button>
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-400 font-sans">
          Protected by Indian Information Technology Act 2000 & PKI Trust Infrastructure.
        </div>
      </div>
    </div>
  );
}
