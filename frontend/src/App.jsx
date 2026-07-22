import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { useSeekerAuthStore } from './stores/seekerAuthStore';
import { usePortalAuthStore } from './stores/portalAuthStore';
import { useAdminAuthStore } from './stores/adminAuthStore';

import LandingPage from './pages/LandingPage';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import BrevoTracker from './components/BrevoTracker';
import BrevoConversations from './components/BrevoConversations';


// Lazy load pages for performance optimization
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const AuthVerifyPage = lazy(() => import('./pages/AuthVerifyPage'));
const GitHubCallbackPage = lazy(() => import('./pages/GitHubCallbackPage'));
const DashboardLayout = lazy(() => import('./pages/DashboardLayout'));
const DashboardHome = lazy(() => import('./pages/DashboardHome'));
const SessionsPage = lazy(() => import('./pages/SessionsPage'));
const NewSessionPage = lazy(() => import('./pages/NewSessionPage'));
const SessionWorkspacePage = lazy(() => import('./pages/SessionWorkspacePage'));
const SmartAnalyzerPage = lazy(() => import('./pages/SmartAnalyzerPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AiRecruiterPage = lazy(() => import('./pages/AiRecruiterPage'));
const GoogleCallbackPage = lazy(() => import('./pages/GoogleCallbackPage'));
const FraudDetectionPage = lazy(() => import('./pages/FraudDetectionPage'));

// Public pages
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const TermsPage = lazy(() => import('./pages/public/TermsPage'));
const RefundPolicyPage = lazy(() => import('./pages/public/RefundPolicyPage'));
const SupportPortalPage = lazy(() => import('./pages/SupportPortalPage'));

// Seeker Pages
const UserHome = lazy(() => import('./pages/user/UserHome'));
const UserJobs = lazy(() => import('./pages/user/UserJobs'));
const UserJobDetail = lazy(() => import('./pages/user/UserJobDetail'));
const JobsTrendsPage = lazy(() => import('./pages/JobsTrendsPage'));
const JobSeekerSafetyPage = lazy(() => import('./pages/JobSeekerSafetyPage'));
const ResumeBuilderLanding = lazy(() => import('./pages/user/ResumeBuilderLanding'));
const ResumeEditor = lazy(() => import('./pages/user/ResumeEditor'));
const MockInterviewPage = lazy(() => import('./pages/user/MockInterviewPage'));


// Developer Portal imports
const DeveloperLandingPage = lazy(() => import('./pages/developer/DeveloperLandingPage'));
const DeveloperLoginPage = lazy(() => import('./pages/developer/DeveloperLoginPage'));
const DeveloperRegisterPage = lazy(() => import('./pages/developer/DeveloperRegisterPage'));
const DeveloperPortalLayout = lazy(() => import('./pages/developer/DeveloperPortalLayout'));
const DeveloperDashboard = lazy(() => import('./pages/developer/DeveloperDashboard'));
const DeveloperKeys = lazy(() => import('./pages/developer/DeveloperKeys'));
const DeveloperUsage = lazy(() => import('./pages/developer/DeveloperUsage'));
const DeveloperBilling = lazy(() => import('./pages/developer/DeveloperBilling'));
const DeveloperWebhooks = lazy(() => import('./pages/developer/DeveloperWebhooks'));
const DeveloperEmbed = lazy(() => import('./pages/developer/DeveloperEmbed'));
const DeveloperDocs = lazy(() => import('./pages/developer/DeveloperDocs'));
const DeveloperSettings = lazy(() => import('./pages/developer/DeveloperSettings'));

// Seeker specific sub-pages
const JobSeekerLoginPage = lazy(() => import('./pages/seeker/JobSeekerLoginPage'));
const JobSeekerRegisterPage = lazy(() => import('./pages/seeker/JobSeekerRegisterPage'));
const MyResumePage = lazy(() => import('./pages/seeker/MyResumePage'));
const MyApplicationsPage = lazy(() => import('./pages/seeker/MyApplicationsPage'));
const NotificationsPage = lazy(() => import('./pages/seeker/NotificationsPage'));
const SeekerBillingPage = lazy(() => import('./pages/seeker/SeekerBillingPage'));
const UserCompanies = lazy(() => import('./pages/user/UserCompanies'));
const UserCompanyDetail = lazy(() => import('./pages/user/UserCompanyDetail'));
const UserFollowedCompanies = lazy(() => import('./pages/user/UserFollowedCompanies'));
const UserProfile = lazy(() => import('./pages/user/UserProfile'));
const UserDashboard = lazy(() => import('./pages/user/UserDashboard'));
const UserUploadResume = lazy(() => import('./pages/user/UserUploadResume'));
const UserApply = lazy(() => import('./pages/user/UserApply'));
const UserApplications = lazy(() => import('./pages/user/UserApplications'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const CompleteProfilePage = lazy(() => import('./pages/CompleteProfilePage'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));

const ApplicantResultsPage = lazy(() => import('./pages/ApplicantResultsPage'));
const TestEntry = lazy(() => import('./pages/test/TestEntry'));
const MCQRound = lazy(() => import('./pages/test/MCQRound'));
const CodingRound = lazy(() => import('./pages/test/CodingRound'));
const InterviewRound = lazy(() => import('./pages/test/InterviewRound'));


function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    if (location.hash) {
      return;
    }
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
  }, [location.pathname, location.key, location.hash]);

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
    const isDark = localStorage.getItem("theme") === "dark";
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (e) => {
      // e.key is null when localStorage.clear() is called
      if (e.key === null || e.key === 'vish_jwt' || e.key === 'admin_jwt') {
        // Clear recruiter/company auth
        useAuthStore.getState().setAuth(null);
        // Clear seeker auth
        useSeekerAuthStore.getState().setAuth({ seeker_token: '', seeker: null });
        // Clear developer auth
        usePortalAuthStore.getState().setAuth(null);
        // Clear admin auth
        useAdminAuthStore.getState().clearAdminAuth();

        // Redirect current tab depending on pathname
        const path = window.location.pathname;
        if (path.startsWith('/admin/dashboard')) {
          window.location.href = '/admin/login';
        } else if (path.startsWith('/developer/portal')) {
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
    <ErrorBoundary>
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
        <BrevoTracker />
        <BrevoConversations />
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-[#09090b]">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              <p className="text-zinc-400 text-sm font-medium">Loading Between...</p>
            </div>
          </div>
        }>
          <Routes>
           {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/verify" element={<AuthVerifyPage />} />
          <Route path="/auth/github/callback" element={<GitHubCallbackPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/auth/complete-profile" element={<CompleteProfilePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<SupportPortalPage />} />
          <Route path="/support" element={<SupportPortalPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/refund-policy" element={<RefundPolicyPage />} />
          <Route path="/forgot-password" element={<ResetPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/careers" element={<Navigate to="/jobs" replace />} />
          <Route path="/hiring-safety" element={<Navigate to="/jobs/safety-checker" replace />} />

          {/* Job Seeker Routes */}
          <Route path="/jobs" element={<UserHome />} />
          <Route path="/jobs/search" element={<UserJobs />} />
          <Route path="/jobs/safety-checker" element={<JobSeekerSafetyPage />} />
          <Route path="/jobs/trends" element={<JobsTrendsPage />} />
          <Route path="/jobs/companies" element={<UserCompanies />} />
          <Route path="/jobs/companies/:companyId" element={<UserCompanyDetail />} />
          <Route path="/jobs/following" element={<UserFollowedCompanies />} />
          <Route path="/jobs/profile" element={<UserProfile />} />
          <Route path="/jobs/dashboard" element={<UserDashboard />} />
          <Route path="/jobs/upload-resume" element={<UserUploadResume />} />
          <Route path="/jobs/apply/:jobId" element={<UserApply />} />
          <Route path="/jobs/applications" element={<UserApplications />} />
          <Route path="/jobs/resume" element={<MyResumePage />} />
          <Route path="/jobs/notifications" element={<NotificationsPage />} />
          <Route path="/jobs/billing" element={<SeekerBillingPage />} />
          <Route path="/jobs/mock-interview" element={<MockInterviewPage />} />
          <Route path="/jobs/:jobId" element={<UserJobDetail />} />
          <Route path="/resume-builder" element={<ResumeBuilderLanding />} />
          <Route path="/resume-builder/edit/:resumeId" element={<ResumeEditor />} />

          {/* Job Seeker Portal — Auth */}
          <Route path="/jobs/login"    element={<LoginPage />} />
          <Route path="/jobs/register" element={<RegisterPage />} />
          <Route path="/seeker/reset-password" element={<ResetPasswordPage />} />
          <Route path="/seeker/forgot-password" element={<ResetPasswordPage />} />

          {/* Developer Portal Routes */}
          <Route path="/developer" element={<DeveloperLandingPage />} />
          <Route path="/developer/login" element={<LoginPage />} />
          <Route path="/developer/register" element={<RegisterPage />} />
          <Route path="/developer/reset-password" element={<ResetPasswordPage />} />
          <Route path="/developer/forgot-password" element={<ResetPasswordPage />} />
          
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
            <Route path="sessions/:id/results" element={<ApplicantResultsPage />} />
            <Route path="smart-analyzer" element={<SmartAnalyzerPage />} />
            <Route path="ai-recruiter" element={<AiRecruiterPage />} />
            <Route path="protection" element={<FraudDetectionPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Admin Dashboard */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />

          {/* Candidate Assessment Rounds */}
          <Route path="/test/entry" element={<TestEntry />} />
          <Route path="/test/mcq" element={<MCQRound />} />
          <Route path="/test/coding" element={<CodingRound />} />
          <Route path="/test/interview" element={<InterviewRound />} />

          {/* Fallback */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </Suspense>
      </Router>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}
