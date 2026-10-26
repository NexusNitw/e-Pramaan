import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/layout/Navbar';
import LoginPage from './components/auth/LoginPage';
import UploadWizard from './components/applicant/UploadWizard';
import ScrutinyConsole from './components/officer/ScrutinyConsole';
import SplitScreenViewer from './components/officer/SplitScreenViewer';
import { fetchApplications } from './config/api';

export default function App() {
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

  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const loadApplications = useCallback(async () => {
    try {
      const response = await fetchApplications();
      if (response && response.data) {
        setApplications(response.data);
        setIsLiveConnected(true);
      }
    } catch (err) {
      console.info('[AICTE App] Backend offline or using seeded fallback:', err.message);
      setIsLiveConnected(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadApplications();
    }
  }, [currentUser, loadApplications]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    const targetPortal = user.role === 'APPLICANT' ? 'applicant' : 'officer';
    setActivePortal(targetPortal);
    setSelectedApplication(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('epramaan_token');
    localStorage.removeItem('epramaan_user');
    setCurrentUser(null);
    setSelectedApplication(null);
  };

  const handleSelectApplication = (app) => {
    setSelectedApplication(app);
  };

  const handleBackToConsole = () => {
    setSelectedApplication(null);
  };

  const handleSubmissionComplete = async (newTrackingId, createdApp) => {
    await loadApplications();
    // For applicant, we can keep them in the upload wizard or show submission confirmation
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        currentUser={currentUser}
        activePortal={activePortal}
        setActivePortal={(portal) => {
          // Prevent applicants from switching to officer console
          if (portal === 'officer' && !isOfficerOrAdmin) return;
          setActivePortal(portal);
          setSelectedApplication(null);
        }}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {/* Applicant View */}
        {(activePortal === 'applicant' || isApplicant) && activePortal !== 'officer' && (
          <UploadWizard onSubmissionComplete={handleSubmissionComplete} />
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
