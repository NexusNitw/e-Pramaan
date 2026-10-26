import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
  // Global top-bar loading indicator
  const [activeRequests, setActiveRequests] = useState(0);
  const [activeActionLabel, setActiveActionLabel] = useState(null);

  // Full-screen dedicated pipeline modal (used during document submission & AI scrutiny)
  const [pipelineState, setPipelineState] = useState({
    active: false,
    title: '',
    subtitle: '',
    currentStepIndex: 0,
    steps: [],
    progress: 0,
  });

  const timerRef = useRef(null);

  // Helper to trigger a fast visual click/action feedback
  const triggerClickFeedback = useCallback((label = null) => {
    setActiveRequests((prev) => prev + 1);
    if (label) setActiveActionLabel(label);

    setTimeout(() => {
      setActiveRequests((prev) => Math.max(0, prev - 1));
      setActiveActionLabel((current) => (current === label ? null : current));
    }, 450);
  }, []);

  // Global start/stop for async actions
  const startLoading = useCallback((label = null) => {
    setActiveRequests((prev) => prev + 1);
    if (label) setActiveActionLabel(label);
  }, []);

  const stopLoading = useCallback(() => {
    setActiveRequests((prev) => Math.max(0, prev - 1));
    setActiveActionLabel(null);
  }, []);

  // Wrap any async function with automatic loading tracking
  const withLoading = useCallback(async (asyncFn, label = null) => {
    startLoading(label);
    try {
      return await asyncFn();
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  // Start Multi-Stage Document Submission Pipeline
  const startPipeline = useCallback((customSteps = null, title = null, subtitle = null) => {
    const defaultSteps = [
      { id: 'upload', title: 'Statutory Document Ingestion', desc: 'Validating PDF certificates & encrypting payload' },
      { id: 'forensics', title: 'Computer Vision & Forensics', desc: 'Running Error Level Analysis (ELA) & pHash image deduplication' },
      { id: 'ocr', title: 'OCR & Intelligent Extraction', desc: 'Extracting sanctioned intake tables, dates & faculty rosters' },
      { id: 'trust', title: 'PKI & Trust Rails Verification', desc: 'Validating RSA digital signature, QR payload & DigiLocker mocks' },
      { id: 'rules', title: 'AICTE APH Rules Engine', desc: 'Evaluating SFR, Cadre, Land, and Safety compliance ratios' },
    ];

    const steps = customSteps || defaultSteps;

    setPipelineState({
      active: true,
      title: title || 'Statutory Dossier Ingestion & AI Scrutiny',
      subtitle: subtitle || 'Executing end-to-end multi-service regulatory scrutiny pipeline...',
      currentStepIndex: 0,
      steps,
      progress: 10,
    });
  }, []);

  // Update pipeline progress step
  const setPipelineStep = useCallback((stepIndex, progressOverride = null) => {
    setPipelineState((prev) => {
      const total = prev.steps.length || 5;
      const calculatedProgress = progressOverride !== null
        ? progressOverride
        : Math.min(100, Math.round(((stepIndex + 1) / total) * 100));

      return {
        ...prev,
        currentStepIndex: stepIndex,
        progress: calculatedProgress,
      };
    });
  }, []);

  // End pipeline
  const finishPipeline = useCallback(() => {
    setPipelineState((prev) => ({
      ...prev,
      currentStepIndex: prev.steps.length,
      progress: 100,
    }));

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setPipelineState((prev) => ({ ...prev, active: false }));
    }, 800);
  }, []);

  const cancelPipeline = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPipelineState((prev) => ({ ...prev, active: false }));
  }, []);

  // Global click ripple handler: Spawns glowing wave at pointer coordinates for every click
  useEffect(() => {
    const handlePointerDown = (e) => {
      // Create ripple element
      const ripple = document.createElement('div');
      ripple.className = 'click-ripple';
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      document.body.appendChild(ripple);

      // Check if clicked element or parent is interactive
      const target = e.target;
      const isInteractive = target.closest('button, a, input, select, textarea, [role="button"], label, .interactive-item');
      if (isInteractive) {
        triggerClickFeedback();
      }

      setTimeout(() => {
        if (ripple && ripple.parentNode) {
          ripple.parentNode.removeChild(ripple);
        }
      }, 700);
    };

    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [triggerClickFeedback]);

  const value = {
    isGlobalLoading: activeRequests > 0,
    activeActionLabel,
    startLoading,
    stopLoading,
    withLoading,
    triggerClickFeedback,
    pipelineState,
    startPipeline,
    setPipelineStep,
    finishPipeline,
    cancelPipeline,
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
