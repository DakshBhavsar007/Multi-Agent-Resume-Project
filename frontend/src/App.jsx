import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { useSeekerAuthStore } from './stores/seekerAuthStore';
import { usePortalAuthStore } from './stores/portalAuthStore';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthVerifyPage from './pages/AuthVerifyPage';
import GitHubCallbackPage from './pages/GitHubCallbackPage';
import DashboardLayout from './pages/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import SessionsPage from './pages/SessionsPage';
import NewSessionPage from './pages/NewSessionPage';
import SessionWorkspacePage from './pages/SessionWorkspacePage';
import SmartAnalyzerPage from './pages/SmartAnalyzerPage';
import SettingsPage from './pages/SettingsPage';
import ProtectedRoute from './components/ProtectedRoute';
import FraudDetectionPage from './pages/FraudDetectionPage';

import UserHome from './pages/user/UserHome';
import UserJobs from './pages/user/UserJobs';
import UserJobDetail from './pages/user/UserJobDetail';
import JobsTrendsPage from './pages/JobsTrendsPage';
import JobSeekerSafetyPage from './pages/JobSeekerSafetyPage';
import ResumeBuilderLanding from './pages/user/ResumeBuilderLanding';
import ResumeEditor from './pages/user/ResumeEditor';

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

import JobSeekerLoginPage from './pages/seeker/JobSeekerLoginPage';
import JobSeekerRegisterPage from './pages/seeker/JobSeekerRegisterPage';
import MyResumePage from './pages/seeker/MyResumePage';
import MyApplicationsPage from './pages/seeker/MyApplicationsPage';
import NotificationsPage from './pages/seeker/NotificationsPage';
import UserCompanies from './pages/user/UserCompanies';
import UserCompanyDetail from './pages/user/UserCompanyDetail';
import UserProfile from './pages/user/UserProfile';
import UserDashboard from './pages/user/UserDashboard';
import UserUploadResume from './pages/user/UserUploadResume';
import UserApply from './pages/user/UserApply';
import UserApplications from './pages/user/UserApplications';

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

  useEffect(() => {
    const handleStorageChange = (e) => {
      // e.key is null when localStorage.clear() is called
      if (e.key === null || e.key === 'vish_jwt') {
        // Clear recruiter/company auth
        useAuthStore.getState().setAuth(null);
        // Clear seeker auth
        useSeekerAuthStore.getState().setAuth({ seeker_token: '', seeker: null });
        // Clear developer auth
        usePortalAuthStore.getState().setAuth(null);

        // Redirect current tab depending on pathname
        const path = window.location.pathname;
        if (path.startsWith('/developer/portal')) {
          window.location.href = '/developer/login';
        } else if (path.startsWith('/jobs/applications') || path.startsWith('/jobs/resume') || path.startsWith('/jobs/notifications') || path.startsWith('/jobs')) {
          // If they are on a seeker page, go back to jobs login
          if (path !== '/jobs' && path !== '/jobs/search' && path !== '/jobs/trends' && path !== '/jobs/safety-checker') {
            window.location.href = '/jobs/login';
          }
        } else if (path.startsWith('/dashboard')) {
          window.location.href = '/login';
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster 
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: "#111111",
            color: "#ffffff",
            borderRadius: "10px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
            fontSize: "13px",
            fontWeight: "600",
            padding: "12px 16px",
          },
          success: {
            iconTheme: { primary: "#22C55E", secondary: "#111111" }
          },
          error: {
            iconTheme: { primary: "#EF4444", secondary: "#111111" }
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
          <Route path="/auth/github/callback" element={<GitHubCallbackPage />} />

          {/* Job Seeker Routes */}
          <Route path="/jobs" element={<UserHome />} />
          <Route path="/jobs/search" element={<UserJobs />} />
          <Route path="/jobs/safety-checker" element={<JobSeekerSafetyPage />} />
          <Route path="/jobs/trends" element={<JobsTrendsPage />} />
          <Route path="/jobs/companies" element={<UserCompanies />} />
          <Route path="/jobs/companies/:companyId" element={<UserCompanyDetail />} />
          <Route path="/jobs/profile" element={<UserProfile />} />
          <Route path="/jobs/dashboard" element={<UserDashboard />} />
          <Route path="/jobs/upload-resume" element={<UserUploadResume />} />
          <Route path="/jobs/apply/:jobId" element={<UserApply />} />
          <Route path="/jobs/applications" element={<UserApplications />} />
          <Route path="/jobs/resume" element={<MyResumePage />} />
          <Route path="/jobs/notifications" element={<NotificationsPage />} />
          <Route path="/jobs/:jobId" element={<UserJobDetail />} />
          <Route path="/resume-builder" element={<ResumeBuilderLanding />} />
          <Route path="/resume-builder/edit/:resumeId" element={<ResumeEditor />} />

          {/* Job Seeker Portal — Auth */}
          <Route path="/jobs/login"    element={<JobSeekerLoginPage />} />
          <Route path="/jobs/register" element={<JobSeekerRegisterPage />} />

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
