import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useAppVersion, type AppVersion } from './contexts/AppVersionContext';
import { useGenerationQuota } from './contexts/GenerationQuotaContext';

import MainSidebar from '../components/MainSidebar';
import HomePage from '../pages/HomePage';
import DashboardPage from '../pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from '../components/Toaster';
import { ToastProvider, useToast } from '../hooks/useToast';

const VERSION_LABELS: Record<AppVersion, string> = {
  complete: 'Completely Working Version',
  oss: 'Free Open Source Version',
};

function AppContent() {
  const { isAuthenticated, logout } = useAuth();
  const { version, setVersion } = useAppVersion();
  const { toast } = useToast();
  const { remaining } = useGenerationQuota();

  React.useEffect(() => {
    console.info('[MuseWave] App mounted, rendering UI.');
  }, []);

  const handleVersionChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextVersion = event.target.value as AppVersion;
    if (nextVersion === version) return;
    setVersion(nextVersion);
    toast(`Switched to ${VERSION_LABELS[nextVersion]}`);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex">
      {isAuthenticated && <MainSidebar />}
      <main className="flex-1 flex flex-col">
        {isAuthenticated && (
          <div className="bg-muted/40 text-xs flex flex-wrap gap-3 justify-between items-center px-6 py-2">
              <div className="text-muted-foreground flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                <span className="flex items-center gap-2">
                  <strong className="text-primary">Active Mode:</strong>
                  <span className="text-foreground font-semibold">
                    {VERSION_LABELS[version]}
                  </span>
                </span>
                {version === 'complete' && (
                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    <span>Song slots left: {remaining.song ?? '∞'}</span>
                    <span>Audio slots left: {remaining.audio ?? '∞'}</span>
                    <span>Video slots left: {remaining.video ?? '∞'}</span>
                  </div>
                )}
              </div>
            <div className="flex items-center gap-3">
              <label htmlFor="app-version-select" className="sr-only">
                Switch application version
              </label>
              <select
                id="app-version-select"
                  value={version}
                  onChange={handleVersionChange}
                  className="text-xs bg-background/40 border border-border text-foreground rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="complete">Completely Working Version</option>
                  <option value="oss">Free Open Source Version</option>
                </select>
              <button
                onClick={logout}
                className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        )}
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/n8n-workflow"
            element={
              <ProtectedRoute>
                <PlaceholderPage
                  title="n8n Workflow"
                  message="Display n8n workflow JSON here."
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/replication-prompt"
            element={
              <ProtectedRoute>
                <PlaceholderPage
                  title="Replication Prompt"
                  message="This page would display the replication prompt."
                />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
      <Toaster />
    </ToastProvider>
  );
}

type PlaceholderPageProps = {
  title: string;
  message: string;
};

const PlaceholderPage = ({ title, message }: PlaceholderPageProps) => {
  return (
    <div className="flex-1 flex flex-col p-4 md:p-8">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default App;
