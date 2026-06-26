import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import { CompanyLogo } from '../components/user/company-logo';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  Search,
  HelpCircle,
  Settings as SettingsIcon,
  Grid3x3,
  LayoutDashboard,
  Sparkles,
  Shield,
  Layers,
  Bell,
  X,
  LogOut,
  Home
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { authAPI } from '../lib/api';
import RateLimitBanner from '../components/RateLimitBanner';
import { OnboardingTour, useTour } from '../components/OnboardingTour';

const RECRUITER_TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Between! 🎉',
    content: 'Your AI-powered recruitment platform. Let\'s take a quick tour to help you get started hiring smarter.',
    icon: '🚀',
    target: null,
  },
  {
    id: 'dashboard',
    title: 'Dashboard Overview',
    content: 'Your central hub shows key metrics, recent sessions, and quick actions at a glance.',
    icon: '📊',
    target: '[data-tour="dashboard-home"]',
    placement: 'bottom',
  },
  {
    id: 'sessions',
    title: 'Recruitment Sessions',
    content: 'Create sessions for each job opening. Upload resumes and let AI rank and score candidates automatically.',
    icon: '📁',
    target: '[data-tour="nav-sessions"]',
    placement: 'right',
  },
  {
    id: 'smart-analyzer',
    title: 'Smart Analyzer',
    content: 'Deep-dive into candidate profiles with AI insights, skill matching, and cultural fit scores.',
    icon: '✨',
    target: '[data-tour="nav-smart-analyzer"]',
    placement: 'right',
  },
  {
    id: 'protection',
    title: 'Fraud Protection',
    content: 'Detect fake resumes, plagiarism, and fraudulent applications powered by our AI fraud engine.',
    icon: '🛡️',
    target: '[data-tour="nav-protection"]',
    placement: 'right',
  },
  {
    id: 'settings',
    title: 'Settings & Billing',
    content: 'Manage your company profile, API keys, and upgrade your plan for more sessions and resumes.',
    icon: '⚙️',
    target: '[data-tour="nav-settings"]',
    placement: 'right',
  },
  {
    id: 'help',
    title: 'Need help anytime?',
    content: 'Click the ❓ button in the top bar whenever you want to replay this tour.',
    icon: '💡',
    target: '[data-tour="help-btn"]',
    placement: 'bottom',
  },
];

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { initFromStorage, company, clearAuth } = useAuthStore();
  const [initDone, setInitDone] = useState(false);
  const { isOpen: tourOpen, startTour, closeTour } = useTour('recruiter_dashboard');

  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showGlobalSuggestions, setShowGlobalSuggestions] = useState(false);

  useEffect(() => {
    initFromStorage();
    const jwt = localStorage.getItem("vish_jwt");
    if (!jwt) {
      navigate("/login");
    } else {
      setInitDone(true);
    }
  }, [initFromStorage, navigate]);

  // Default open on desktop, closed on mobile
  useEffect(() => {
    setOpen(isDesktop);
  }, [isDesktop]);

  // Close mobile drawer on route change
  useEffect(() => {
    if (!isDesktop) setOpen(false);
    setSearchOpen(false);
  }, [pathname, isDesktop]);

  if (!initDone) return null; // Wait for hydrate

  const handleLogout = () => {
    try {
      authAPI.logout();
    } catch (e) {
      clearAuth();
    }
  };

  const getTierBadgeColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'starter': return 'bg-blue-100 text-blue-700';
      case 'business': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const navItems = [
    { to: "/", label: "Home Page", icon: Home, exact: true },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true, tourAttr: 'dashboard-home' },
    { to: "/dashboard/smart-analyzer", label: "Smart Analyzer", icon: Sparkles, tourAttr: 'nav-smart-analyzer' },
    { to: "/dashboard/protection", label: "Protection", icon: Shield, tourAttr: 'nav-protection' },
    { to: "/dashboard/sessions", label: "Sessions", icon: Layers, tourAttr: 'nav-sessions' },
    { to: "/dashboard/settings", label: "Settings", icon: SettingsIcon, tourAttr: 'nav-settings' },
  ];

  // Parses usage configuration
  const parsesUsed = 247;
  const parsesTotal = 1000;
  const parsePercent = (parsesUsed / parsesTotal) * 100;

  const sideWidth = isDesktop ? (open ? 260 : 72) : 0;

  const cleanPath = pathname.replace(/\/$/, "");

  return (
    <div className="min-h-screen bg-white text-foreground font-sans recruiter-page">
      <RateLimitBanner />

      {/* Top App Bar — Google style */}
      <header className="fixed top-0 inset-x-0 z-40 h-16 bg-white border-b border-gray-200 flex items-center px-2 sm:px-4 gap-1 sm:gap-2">
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-12 h-12 shrink-0 rounded-full hover:bg-gray-100 flex items-center justify-center text-muted-foreground transition"
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>

        <Link to="/dashboard" className="flex items-center gap-2 pr-1 sm:pr-3 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm bg-charcoal p-1">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-grad-dash" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <line x1="32" y1="68" x2="68" y2="32" stroke="url(#logo-grad-dash)" strokeWidth="14" strokeLinecap="round" />
              <circle cx="32" cy="68" r="16" fill="#38bdf8" />
              <circle cx="68" cy="32" r="24" fill="#2563eb" />
            </svg>
          </div>
          <span className="font-display text-[20px] sm:text-[22px] text-foreground tracking-tight hidden xs:inline sm:inline">
            Between
          </span>
          <span className="text-muted-foreground text-sm hidden lg:inline ml-1 font-medium">Workspace</span>
        </Link>

        {/* Search — inline on sm+, icon-only sheet on xs */}
        <div className="flex-1 max-w-2xl mx-auto px-2 hidden sm:block relative">
          <div className="group flex items-center h-11 md:h-12 bg-gray-100 rounded-full px-4 gap-3 focus-within:bg-white focus-within:shadow-sm transition">
            <Search size={20} className="text-gray-500 shrink-0" />
            <input
              type="text"
              placeholder="Search candidates, sessions, jobs"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              onFocus={() => setShowGlobalSuggestions(true)}
              onBlur={() => setTimeout(() => setShowGlobalSuggestions(false), 200)}
              className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-charcoal placeholder:text-gray-500"
            />
          </div>
          {showGlobalSuggestions && (
            <div className="absolute left-2 right-2 mt-1.5 bg-white border border-gray-200 rounded-2xl shadow-lg z-[100] max-h-64 overflow-y-auto py-2 px-1">
              {globalSearch ? (
                <>
                  <div className="text-[10px] font-bold text-gray-400 px-3 py-1 uppercase tracking-wider">Search Actions</div>
                  <button onClick={() => { navigate(`/dashboard/sessions?q=${encodeURIComponent(globalSearch)}`); setGlobalSearch(""); }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-50 text-accent flex items-center gap-2 rounded-lg">
                    🔍 Search sessions for "{globalSearch}"
                  </button>
                  <button onClick={() => { navigate(`/dashboard/sessions`); setGlobalSearch(""); }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-50 text-charcoal flex items-center gap-2 rounded-lg">
                    👥 Find candidates matching "{globalSearch}"
                  </button>
                </>
              ) : (
                <>
                  <div className="text-[10px] font-bold text-gray-400 px-3 py-1 uppercase tracking-wider">Quick Actions</div>
                  <button onClick={() => { navigate("/dashboard/sessions/new"); setShowGlobalSuggestions(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-50 text-charcoal flex items-center gap-2 rounded-lg">
                    ✨ Create Recruitment Session
                  </button>
                  <button onClick={() => { navigate("/dashboard/smart-analyzer"); setShowGlobalSuggestions(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-50 text-charcoal flex items-center gap-2 rounded-lg">
                    🚀 Analyze with AI (Smart Analyzer)
                  </button>
                  <button onClick={() => { navigate("/dashboard/protection"); setShowGlobalSuggestions(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-50 text-charcoal flex items-center gap-2 rounded-lg">
                    🛡️ View Security & Fraud Logs
                  </button>
                  <button onClick={() => { navigate("/dashboard/sessions"); setShowGlobalSuggestions(false); }} className="w-full text-left px-3 py-2 text-xs font-semibold hover:bg-gray-50 text-charcoal flex items-center gap-2 rounded-lg">
                    📂 View All Sessions
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex-1 sm:hidden" />

        <div className="flex items-center gap-0.5 sm:gap-1 pl-1 sm:pl-2 shrink-0">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="sm:hidden w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
          >
            <Search size={20} />
          </button>
          <button
            data-tour="help-btn"
            aria-label="Help / Tour"
            onClick={startTour}
            className="hidden sm:flex w-10 h-10 rounded-full hover:bg-gray-100 items-center justify-center text-gray-500 transition shrink-0"
          >
            <HelpCircle size={20} />
          </button>
          <IconBtn label="Notifications"><Bell size={20} /></IconBtn>
          <IconBtn label="Apps" hideOn="sm"><Grid3x3 size={20} /></IconBtn>
          
          {/* User profile identifier */}
          <div className="ml-1 flex items-center gap-2">
            <div className="text-right hidden md:block">
              <div className="text-xs font-semibold text-charcoal truncate max-w-[120px]">
                {company?.name || 'Company'}
              </div>
              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${getTierBadgeColor(company?.tier)}`}>
                {company?.tier || 'Free'}
              </span>
            </div>
            <Link to="/dashboard/settings" className="w-9 h-9 shrink-0 rounded-full overflow-hidden hover:shadow-sm transition block border border-black/5">
              <CompanyLogo name={company?.name || 'Company'} logoPath={company?.logo_path} size={36} />
            </Link>
          </div>
        </div>
      </header>

      {/* Mobile search overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-white sm:hidden">
          <div className="h-16 flex items-center px-2 gap-2 border-b border-gray-200">
            <button
              onClick={() => setSearchOpen(false)}
              className="w-12 h-12 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500"
              aria-label="Close search"
            >
              <X size={22} />
            </button>
            <div className="flex-1 flex items-center h-11 bg-gray-100 rounded-full px-4 gap-3">
              <Search size={20} className="text-gray-500 shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search"
                className="flex-1 min-w-0 bg-transparent outline-none text-[15px]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile drawer backdrop */}
      {!isDesktop && open && (
        <button
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 top-16 z-30 bg-black/30 md:hidden"
        />
      )}

      {/* Side Nav — Material 3 drawer */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 bg-white border-r border-gray-200 md:border-transparent transition-[width,transform] duration-200 ${
          isDesktop
            ? open
              ? "w-[260px] translate-x-0"
              : "w-[72px] translate-x-0"
            : open
              ? "w-[280px] translate-x-0 shadow-md"
              : "w-[280px] -translate-x-full"
        }`}
      >
        <nav className="py-3 px-2 space-y-1 overflow-y-auto h-[calc(100%-140px)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.exact 
              ? cleanPath === item.to.replace(/\/$/, "") 
              : cleanPath.startsWith(item.to);
            const showLabel = !isDesktop || open;
            return (
              <Link
                key={item.to}
                to={item.to}
                data-tour={item.tourAttr || undefined}
                onClick={() => { if (!isDesktop) setOpen(false); }}
                className={`flex items-center h-12 rounded-full px-3 gap-5 relative group transition-colors duration-200 ${
                  active 
                    ? "text-[#111111] font-semibold" 
                    : "text-charcoal hover:bg-gray-100 font-medium"
                }`}
                title={item.label}
              >
                {active && (
                  <motion.div
                    layoutId="activeNavBackground"
                    className="absolute inset-0 bg-gray-100 rounded-full border border-[#111111]/10"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
                <span className={`w-6 flex items-center justify-center shrink-0 transition-colors duration-200 relative z-10 ${
                  active ? "text-[#111111]" : "text-gray-500 group-hover:text-charcoal"
                }`}>
                  <Icon size={20} />
                </span>
                {showLabel && (
                  <span className="text-sm truncate relative z-10">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Details Panel with Logout & Usage limits */}
        <div className="absolute bottom-0 inset-x-0 p-3 border-t border-gray-200 bg-white">
          {(!isDesktop || open) ? (
            <div className="space-y-3">
              <div className="text-xs text-gray-500 px-2">
                <div className="flex justify-between items-center mb-1">
                  <span>Usage: {parsesUsed}/{parsesTotal} parses</span>
                </div>
                <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                  <div className="bg-[#111111] h-full rounded-full animate-pulse" style={{ width: `${parsePercent}%`, animationDuration: '3s' }}></div>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center h-10 rounded-full px-3 gap-5 text-gray-500 hover:text-red-600 hover:bg-red-50 transition"
              >
                <span className="w-6 flex items-center justify-center shrink-0">
                  <LogOut size={18} />
                </span>
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              title="Logout"
              className="w-10 h-10 mx-auto rounded-full hover:bg-red-50 text-gray-500 hover:text-red-600 flex items-center justify-center transition"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
      </aside>

      {/* Main Page Content */}
      <main
        className="pt-16 transition-[padding] duration-200 min-h-screen"
        style={{ paddingLeft: isDesktop ? sideWidth : 0 }}
      >
        <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Onboarding Tour */}
      <OnboardingTour
        tourKey="recruiter_dashboard"
        steps={RECRUITER_TOUR_STEPS}
        isOpen={tourOpen}
        onClose={closeTour}
      />
    </div>
  );
}

function IconBtn({ children, label, hideOn }) {
  const hideCls = hideOn === "sm" ? "hidden sm:flex" : hideOn === "md" ? "hidden md:flex" : "flex";
  return (
    <button
      aria-label={label}
      className={`${hideCls} w-10 h-10 rounded-full hover:bg-gray-100 items-center justify-center text-gray-500 transition shrink-0`}
    >
      {children}
    </button>
  );
}
