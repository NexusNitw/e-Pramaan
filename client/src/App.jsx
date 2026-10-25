import React, { useState } from 'react';
import Navbar from './components/layout/Navbar';
import UploadWizard from './components/applicant/UploadWizard';
import ScrutinyConsole from './components/officer/ScrutinyConsole';
import SplitScreenViewer from './components/officer/SplitScreenViewer';
import { mockApplications } from './mockData';

export default function App() {
  const [activePortal, setActivePortal] = useState('officer'); // 'applicant' | 'officer'
  const [applications, setApplications] = useState(mockApplications);
  const [selectedApplication, setSelectedApplication] = useState(null);

  const handleSelectApplication = (app) => {
    setSelectedApplication(app);
  };

  const handleBackToConsole = () => {
    setSelectedApplication(null);
  };

  const handleSubmissionComplete = (newTrackingId) => {
    // Switch to officer scrutiny portal and focus on newly created app or first in queue
    setActivePortal('officer');
    setSelectedApplication(applications[0]);
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
