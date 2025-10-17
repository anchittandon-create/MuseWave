


import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import MainSidebar from './components/MainSidebar';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import { Toaster } from './components/Toaster';
// FIX: Changed import path to point to .tsx file.
import { ToastProvider } from './hooks/useToast';

function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <div className="min-h-screen w-full bg-background text-foreground flex">
          <MainSidebar />
          <main className="flex-1 flex flex-col">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/n8n-workflow" element={<PlaceholderPage title="n8n Workflow" message="Display n8n workflow JSON here." />} />
              <Route path="/replication-prompt" element={<PlaceholderPage title="Replication Prompt" message="This page would display the replication prompt." />} />
            </Routes>
          </main>
        </div>
        <Toaster />
      </ToastProvider>
    </HashRouter>
  );
}

type PlaceholderPageProps = {
  title: string;
  message: string;
}

const PlaceholderPage = ({ title, message }: PlaceholderPageProps) => {
  return (
    <div className="flex-1 flex flex-col p-4 md:p-8">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export default App;
