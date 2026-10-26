import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/layout/Navbar';
import LoginPage from './components/auth/LoginPage';
import UploadWizard from './components/applicant/UploadWizard';
import ScrutinyConsole from './components/officer/ScrutinyConsole';
import SplitScreenViewer from './components/officer/SplitScreenViewer';
import GlobalLoadingOverlay from './components/common/GlobalLoadingOverlay';
import { LoadingProvider, useLoading } from './context/LoadingContext';
import { fetchApplications } from './config/api';
import { mockApplications } from './mockData';

function AppContent() {
  const { startLoading, stopLoading, triggerClickFeedback } = useLoading();

  // Initialize authenticated user from localStorage if present
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('epramaan_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [activePortal, setActivePortal] = useState(() => {
    if (!currentUser) return 'officer';
    return currentUser.role === 'APPLICANT' ? 'applicant' : 'officer';
  });

  const [applications, setApplications] = useState(() => mockApplications || []);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const loadApplications = useCallback(async (isInitial = false) => {
    startLoading(isInitial ? 'Connecting to Regulatory Gateway...' : 'Refreshing Applications...');
    try {
      const response = await fetchApplications();
      if (response && response.data && response.data.length > 0) {
        setApplications(response.data);
        setIsLiveConnected(true);
      }
    } catch (err) {
      console.info('[AICTE App] Backend offline or using fallback:', err.message);
      setIsLiveConnected(false);
      setApplications((prev) => (prev && prev.length > 0 ? prev : mockApplications));
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);


  useEffect(() => {
    if (currentUser) {
      loadApplications(true);
    }
  }, [currentUser, loadApplications]);

  const handleLoginSuccess = (user) => {
    triggerClickFeedback('Session Initialized');
    setCurrentUser(user);
    const targetPortal = user.role === 'APPLICANT' ? 'applicant' : 'officer';
    setActivePortal(targetPortal);
    setSelectedApplication(null);
  };

  const handleLogout = () => {
    triggerClickFeedback('Signing out...');
    localStorage.removeItem('epramaan_token');
    localStorage.removeItem('epramaan_user');
    setCurrentUser(null);
    setSelectedApplication(null);
  };

  const handleSelectApplication = (app) => {
    triggerClickFeedback('Opening Dossier...');
    setSelectedApplication(app);
  };

  const handleBackToConsole = () => {
    triggerClickFeedback('Returning to Scrutiny Queue...');
    setSelectedApplication(null);
  };

  const handleSubmissionComplete = async (newTrackingId, createdApp) => {
    await loadApplications();
    if (currentUser?.role === 'OFFICER' || currentUser?.role === 'ADMIN') {
      setActivePortal('officer');
      if (createdApp) {
        setSelectedApplication(createdApp);
      } else {
        setSelectedApplication(applications[0]);
      }
    }
  };

  // If user is not authenticated, show regulatory login page
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Determine authorized portal view based on role
  const isOfficerOrAdmin = currentUser.role === 'OFFICER' || currentUser.role === 'ADMIN';
  const isApplicant = currentUser.role === 'APPLICANT';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      <Navbar
        currentUser={currentUser}
        activePortal={activePortal}
        setActivePortal={(portal) => {
          if (portal === 'officer' && !isOfficerOrAdmin) return;
          triggerClickFeedback(`Switching to ${portal === 'officer' ? 'Officer Console' : 'Applicant Portal'}`);
          setActivePortal(portal);
          setSelectedApplication(null);
        }}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {/* Applicant View */}
        {(activePortal === 'applicant' || isApplicant) && activePortal !== 'officer' && (
          <UploadWizard onSubmissionComplete={handleSubmissionComplete} currentUser={currentUser} />
        )}

        {/* Officer Scrutiny Console & Inspector */}
        {isOfficerOrAdmin && activePortal === 'officer' && (
          <>
            {selectedApplication ? (
              <SplitScreenViewer
                application={selectedApplication}
                onBack={handleBackToConsole}
              />
            ) : (
              <ScrutinyConsole
                applications={applications}
                onSelectApplication={handleSelectApplication}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <LoadingProvider>
      <GlobalLoadingOverlay />
      <AppContent />
    </LoadingProvider>
  );
}
