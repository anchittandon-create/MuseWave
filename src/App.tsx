import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

import MainSidebar from '../components/MainSidebar';
import HomePage from '../pages/HomePage';
import DashboardPage from '../pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Toaster } from '../components/Toaster';
import { ToastProvider } from '../hooks/useToast';

function AppContent() {
  const { isAuthenticated, logout } = useAuth();

  React.useEffect(() => {
    console.info('[MuseWave] App mounted, rendering UI.');
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen w-full bg-background text-foreground flex">
        {isAuthenticated && <MainSidebar />}
        <main className="flex-1 flex flex-col">
          {isAuthenticated && (
            <div className="bg-muted/40 text-muted-foreground px-6 py-2 text-xs flex justify-between items-center">
              <span>
                <strong className="text-primary mr-2">MuseWave Debug:</strong>
                UI shell mounted. If you still see only this message, check DevTools for [MuseWave] logs.
              </span>
              <button
                onClick={logout}
                className="text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2 py-1 rounded transition-colors"
              >
                Logout
              </button>
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
      <Toaster />
    </ToastProvider>
  );
}

function App() {
  return <AppContent />;
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
