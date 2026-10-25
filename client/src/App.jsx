import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/layout/Navbar';
import UploadWizard from './components/applicant/UploadWizard';
import ScrutinyConsole from './components/officer/ScrutinyConsole';
import SplitScreenViewer from './components/officer/SplitScreenViewer';
import { mockApplications } from './mockData';
import { fetchApplications } from './config/api';

export default function App() {
  const [activePortal, setActivePortal] = useState('officer'); // 'applicant' | 'officer'
  const [applications, setApplications] = useState(mockApplications);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  const loadApplications = useCallback(async () => {
    try {
      const response = await fetchApplications();
      if (response && response.data && response.data.length > 0) {
        setApplications(response.data);
        setIsLiveConnected(true);
      }
    } catch (err) {
      console.info('[AICTE App] Backend offline or using seeded fallback:', err.message);
      setIsLiveConnected(false);
    }
  }, []);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const handleSelectApplication = (app) => {
    setSelectedApplication(app);
  };

  const handleBackToConsole = () => {
    setSelectedApplication(null);
  };

  const handleSubmissionComplete = async (newTrackingId, createdApp) => {
    await loadApplications();
    setActivePortal('officer');
    if (createdApp) {
      setSelectedApplication(createdApp);
    } else {
      setSelectedApplication(applications[0]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activePortal={activePortal}
        setActivePortal={(portal) => {
          setActivePortal(portal);
          setSelectedApplication(null); // Reset detail view when switching portals
        }}
      />

      <main className="flex-1">
        {activePortal === 'applicant' && (
          <UploadWizard onSubmissionComplete={handleSubmissionComplete} />
        )}

        {activePortal === 'officer' && (
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
