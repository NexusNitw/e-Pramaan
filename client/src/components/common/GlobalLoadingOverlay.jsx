import React from 'react';
import { useLoading } from '../../context/LoadingContext';
import {
  ShieldCheck,
  FileSearch,
  Cpu,
  Lock,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function GlobalLoadingOverlay() {
  const { isGlobalLoading, activeActionLabel, pipelineState, cancelPipeline } = useLoading();

  const getStepIcon = (index, currentStepIndex) => {
    if (index < currentStepIndex) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
    if (index === currentStepIndex) {
      return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
    }
    return <div className="w-2 h-2 rounded-full bg-slate-700" />;
  };

  return (
    <>
      {/* 1. Global Top Razor-thin Loading Bar */}
      {isGlobalLoading && (
        <div className="fixed top-0 left-0 right-0 z-[99999] h-1 bg-slate-900/40 overflow-hidden pointer-events-none">
          <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400 shadow-[0_0_12px_rgba(59,130,246,0.9)] animate-top-loading rounded-r-full" />
        </div>
      )}

      {/* Subtle floating badge when a specific action is executing */}
      {isGlobalLoading && activeActionLabel && !pipelineState.active && (
        <div className="fixed bottom-5 right-5 z-[99998] flex items-center space-x-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 px-4 py-2 rounded-full shadow-2xl text-xs text-slate-200 pointer-events-none animate-fade-in">
          <Loader2 className="w-3.5 h-3.5 text-blue-400 animate-spin" />
          <span className="font-medium tracking-wide">{activeActionLabel}</span>
        </div>
      )}

      {/* 2. Full-Screen Multi-Stage Regulatory Pipeline Modal */}
      {pipelineState.active && (
        <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700/70 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -right-24 w-56 h-56 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-56 h-56 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header Icon & Title */}
            <div className="text-center space-y-3">
              <div className="relative inline-flex items-center justify-center">
                {/* Rotating orbital glow ring */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-blue-500/20">
                  <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                    <ShieldCheck className="w-8 h-8 text-blue-400 animate-pulse" />
                  </div>
                </div>
                <div className="absolute -top-1 -right-1">
                  <span className="flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500" />
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center justify-center space-x-1.5">
                  <span>{pipelineState.title}</span>
                  <Sparkles className="w-4 h-4 text-amber-400" />
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  {pipelineState.subtitle}
                </p>
              </div>
            </div>

            {/* Overall Progress Bar */}
            <div className="mt-6 space-y-1.5">
              <div className="flex justify-between items-center text-[11px] font-mono text-slate-400">
                <span>Verification Progress</span>
                <span className="text-blue-400 font-bold">{pipelineState.progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                  style={{ width: `${pipelineState.progress}%` }}
                />
              </div>
            </div>

            {/* Pipeline Stage Cards */}
            <div className="mt-6 space-y-2.5">
              {pipelineState.steps.map((step, idx) => {
                const isCurrent = idx === pipelineState.currentStepIndex;
                const isCompleted = idx < pipelineState.currentStepIndex;

                return (
                  <div
                    key={step.id || idx}
                    className={`flex items-start space-x-3 p-3 rounded-xl border transition-all duration-300 ${
                      isCurrent
                        ? 'bg-blue-950/40 border-blue-600/60 shadow-sm shadow-blue-500/10'
                        : isCompleted
                        ? 'bg-slate-950/50 border-emerald-900/40 text-slate-300'
                        : 'bg-slate-950/20 border-slate-800/40 opacity-50'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-slate-900 border border-slate-800">
                      {getStepIcon(idx, pipelineState.currentStepIndex)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold ${
                            isCurrent
                              ? 'text-blue-300'
                              : isCompleted
                              ? 'text-emerald-300'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.title}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono text-blue-400 animate-pulse uppercase tracking-wider">
                            Analyzing...
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight truncate">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer with security disclaimer and close button */}
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>SHA-256 Encrypted Regulatory Ingestion</span>
              </div>
              <button
                onClick={cancelPipeline}
                className="text-[11px] text-slate-400 hover:text-slate-200 px-2 py-1 rounded transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
