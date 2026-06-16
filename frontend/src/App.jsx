import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthVerifyPage from './pages/AuthVerifyPage';
import DashboardLayout from './pages/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import SessionsPage from './pages/SessionsPage';
import NewSessionPage from './pages/NewSessionPage';
import SessionWorkspacePage from './pages/SessionWorkspacePage';
import SmartAnalyzerPage from './pages/SmartAnalyzerPage';
import SettingsPage from './pages/SettingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import FraudDetectionPage from './pages/FraudDetectionPage';

import JobsLandingPage from './pages/JobsLandingPage';
import JobsSearchPage from './pages/JobsSearchPage';
import JobDetailsPage from './pages/JobDetailsPage';
import JobsTrendsPage from './pages/JobsTrendsPage';
import JobsApplicationsPage from './pages/JobsApplicationsPage';
import JobSeekerSafetyPage from './pages/JobSeekerSafetyPage';

// Developer Portal imports
import DeveloperLandingPage from './pages/developer/DeveloperLandingPage';
import DeveloperLoginPage from './pages/developer/DeveloperLoginPage';
import DeveloperRegisterPage from './pages/developer/DeveloperRegisterPage';
import DeveloperPortalLayout from './pages/developer/DeveloperPortalLayout';
import DeveloperDashboard from './pages/developer/DeveloperDashboard';
import DeveloperKeys from './pages/developer/DeveloperKeys';
import DeveloperUsage from './pages/developer/DeveloperUsage';
import DeveloperBilling from './pages/developer/DeveloperBilling';
import DeveloperWebhooks from './pages/developer/DeveloperWebhooks';
import DeveloperEmbed from './pages/developer/DeveloperEmbed';
import DeveloperDocs from './pages/developer/DeveloperDocs';
import DeveloperSettings from './pages/developer/DeveloperSettings';

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    // Scroll immediately
    window.scrollTo(0, 0);
    document.documentElement.scrollTo(0, 0);
    document.body.scrollTo(0, 0);

    // Also scroll on subsequent rendering frames/ticks to handle layout shifts & delayed renders
    const handleScroll = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTo(0, 0);
      document.body.scrollTo(0, 0);
    };

    const rafId = requestAnimationFrame(handleScroll);
    const t1 = setTimeout(handleScroll, 20);
    const t2 = setTimeout(handleScroll, 100);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [location.pathname, location.key]);

  return null;
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,      // 5 min
        gcTime: 10 * 60 * 1000,         // 10 min garbage collection
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      }
    }
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster 
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background:"white",
            color:"#2A2A2A",
            borderLeft:"4px solid #C8871A",
            borderRadius:"8px",
            boxShadow:"0 4px 12px rgba(0,0,0,0.1)"
          },
          success: {
            iconTheme:{primary:"#22C55E",secondary:"white"}
          },
          error: {
            iconTheme:{primary:"#EF4444",secondary:"white"}
          }
        }}
      />
      <Router>
        <ScrollToTop />
        <Routes>
           {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/verify" element={<AuthVerifyPage />} />

          {/* Job Seeker Routes */}
          <Route path="/jobs" element={<JobsLandingPage />} />
          <Route path="/jobs/search" element={<JobsSearchPage />} />
          <Route path="/jobs/safety-checker" element={<JobSeekerSafetyPage />} />
          <Route path="/jobs/:id" element={<JobDetailsPage />} />
          <Route path="/jobs/trends" element={<JobsTrendsPage />} />
          <Route path="/jobs/applications" element={<JobsApplicationsPage />} />

          {/* Developer Portal Routes */}
          <Route path="/developer" element={<DeveloperLandingPage />} />
          <Route path="/developer/login" element={<DeveloperLoginPage />} />
          <Route path="/developer/register" element={<DeveloperRegisterPage />} />
          
          <Route path="/developer/portal" element={
            <DeveloperPortalLayout />
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DeveloperDashboard />} />
            <Route path="keys" element={<DeveloperKeys />} />
            <Route path="usage" element={<DeveloperUsage />} />
            <Route path="billing" element={<DeveloperBilling />} />
            <Route path="webhooks" element={<DeveloperWebhooks />} />
            <Route path="embed" element={<DeveloperEmbed />} />
            <Route path="docs" element={<DeveloperDocs />} />
            <Route path="settings" element={<DeveloperSettings />} />
          </Route>

          {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardHome />} />
            <Route path="sessions" element={<SessionsPage />} />
            <Route path="sessions/new" element={<NewSessionPage />} />
            <Route path="sessions/:id" element={<SessionWorkspacePage />} />
            <Route path="smart-analyzer" element={<SmartAnalyzerPage />} />
            <Route path="protection" element={<FraudDetectionPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}
