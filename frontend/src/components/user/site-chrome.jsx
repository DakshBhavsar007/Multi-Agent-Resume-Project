import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { Briefcase, Search, Building2, User, LayoutDashboard, LogOut, Shield, TrendingUp, FileText, HelpCircle, Sparkles, Home, BarChart3, ChevronRight, ChevronDown, Info, Heart, Grid3x3, Bot } from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { OnboardingTour, useTour } from "../OnboardingTour";
import { SocialTooltip } from "../ui/social-media";
import ThemeToggle from "../ThemeToggle";
import { seekerAPI, API_HOST } from "../../lib/api";
import { useSeekerAuthStore } from "../../stores/seekerAuthStore";

const SEEKER_TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Between',
    content: 'A calmer, AI-powered job search experience. Take a quick tour to get started and make the most of every feature.',
    icon: Sparkles,
    target: null,
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    content: 'View your applications, active ATS scores, and top improvements in one clean layout.',
    icon: LayoutDashboard,
    target: '[data-tour="seeker-nav-dashboard"]',
    placement: 'bottom',
  },
  {
    id: 'jobs',
    title: 'Search Jobs',
    content: 'Browse hand-picked positions, check match scores, and apply directly to matching roles.',
    icon: Search,
    target: '[data-tour="seeker-nav-jobs"]',
    placement: 'bottom',
  },
  {
    id: 'career-tools',
    title: 'Career Tools',
    content: 'Access powerful career utilities like the AI Resume Builder, Hiring Safety Checker, Market Trends, and Companies list from this menu.',
    icon: Sparkles,
    target: '[data-tour="seeker-nav-career-tools"]',
    placement: 'bottom',
  },
  {
    id: 'billing',
    title: 'Pricing & Plans',
    content: 'Upgrade to Premium for Rs 199/month — unlock unlimited applications and full AI diagnostics.',
    icon: Sparkles,
    target: '[data-tour="seeker-nav-premium-plans"]',
    placement: 'bottom',
  },
  {
    id: 'help',
    title: 'Help, anytime',
    content: 'Click the help button in the navbar to replay this tour whenever you need a refresher.',
    icon: HelpCircle,
    target: '[data-tour="seeker-help-btn"]',
    placement: 'bottom',
  },
];

const links = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/jobs/search", label: "Find Jobs", icon: Search },
  { to: "/jobs/companies", label: "Companies", icon: Building2 },
  { to: "/jobs/following", label: "Following", icon: Heart },
  { to: "/resume-builder", label: "Resume Builder", icon: FileText },
  { to: "/jobs/safety-checker", label: "Hiring Safety", icon: Shield },
  { to: "/jobs/trends", label: "Market Trends", icon: TrendingUp },
  { to: "/jobs/applications", label: "Applications", icon: Briefcase },
  { to: "/jobs/mock-interview", label: "Mock Interview", icon: Sparkles },
  { to: "/jobs/billing", label: "Premium Plans", icon: Sparkles },
];

export function Header() {
  const getSeekerInitial = (name) => {
    if (!name) return "D";
    const parts = name.trim().split(" ").filter(Boolean);
    const dakshPart = parts.find(p => p.toUpperCase() === "DAKSH");
    if (dakshPart) return "D";
    
    if (parts.length > 0) {
      const firstUpper = parts[0].toUpperCase();
      const lastNames = ["BHAVSAR", "PATEL", "SHAH", "MEHTA", "JOSHI", "TRIVEDI"];
      if (lastNames.includes(firstUpper) && parts.length >= 2) {
        return parts[1][0].toUpperCase();
      }
      return parts[0][0].toUpperCase();
    }
    return "D";
  };

  const { pathname } = useLocation();
  const [seekerData, setSeekerData] = useState(() => {
    const token = localStorage.getItem('vish_seeker_token');
    const data = localStorage.getItem('vish_seeker_data');
    if (token && data) {
      try { return JSON.parse(data); } catch {}
    }
    return null;
  });
  const { isOpen: tourOpen, startTour, closeTour } = useTour('seeker_portal');

  useEffect(() => {
    const handleProfileUpdate = () => {
      const data = localStorage.getItem('vish_seeker_data');
      if (data) {
        try { setSeekerData(JSON.parse(data)); } catch {}
      } else {
        setSeekerData(null);
      }
    };
    window.addEventListener('seeker_profile_updated', handleProfileUpdate);
    return () => window.removeEventListener('seeker_profile_updated', handleProfileUpdate);
  }, []);

  const isLoggedIn = !!seekerData;

  const [imgError, setImgError] = useState(false);
  const rawAvatar = seekerData?.avatar_path || seekerData?.avatar_url;

  useEffect(() => {
    if (isLoggedIn) {
      seekerAPI.getMe()
        .then((profile) => {
          setSeekerData(profile);
          localStorage.setItem('vish_seeker_data', JSON.stringify(profile));
          useSeekerAuthStore.getState().setAuth({ seeker_token: localStorage.getItem('vish_seeker_token'), seeker: profile });
        })
        .catch((err) => console.error("Error syncing profile to navbar:", err));
    }
  }, [isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem('vish_seeker_token');
    localStorage.removeItem('vish_seeker_data');
    window.location.href = '/jobs';
  };

  const [toolsOpen, setToolsOpen] = useState(false);
  const toolsDropdownRef = useRef(null);

  const [appsOpen, setAppsOpen] = useState(false);
  const appsDropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (toolsDropdownRef.current && !toolsDropdownRef.current.contains(event.target)) {
        setToolsOpen(false);
      }
      if (appsDropdownRef.current && !appsDropdownRef.current.contains(event.target)) {
        setAppsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredLinks = links.filter((l) => {
    if (l.to === "/jobs/applications" || l.to === "/jobs/profile" || l.to === "/jobs/billing") {
      return isLoggedIn;
    }
    return true;
  });

  const filteredPrimary = filteredLinks.filter(l => l.to === "/" || l.to === "/jobs/search" || l.to === "/jobs/applications");
  const filteredTools = filteredLinks.filter(l => l.to === "/resume-builder" || l.to === "/jobs/safety-checker" || l.to === "/jobs/trends" || l.to === "/jobs/companies" || l.to === "/jobs/following" || l.to === "/jobs/mock-interview");

  return (
    <div className="sticky top-0 z-40 w-full transition-all duration-300 p-0 pointer-events-none">
      <header className={`mx-auto transition-all duration-300 pointer-events-auto backdrop-blur-xl ${
        isScrolled
          ? "max-w-7xl mt-3 rounded-full border border-border bg-background/80 shadow-lg"
          : "w-full border-b border-border/60 bg-background/80"
      }`}>
      <div className={`mx-auto flex max-w-7xl items-center gap-4 py-3 transition-all duration-300 ${
        isScrolled ? "px-8" : "px-4 sm:px-6"
      }`}>
        <Link to="/jobs" className="flex items-center gap-2 pr-1 sm:pr-3 shrink-0 no-underline text-inherit">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm bg-[#2A2A2A] p-1">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-grad-site-chrome" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <line x1="32" y1="68" x2="68" y2="32" stroke="url(#logo-grad-site-chrome)" strokeWidth="14" strokeLinecap="round" />
              <circle cx="32" cy="68" r="16" fill="#38bdf8" />
              <circle cx="68" cy="32" r="24" fill="#2563eb" />
            </svg>
          </div>
          <span className="font-display text-[22px] text-foreground tracking-tight font-semibold">
            Between
          </span>
        </Link>

        <nav className="ml-4 hidden flex-1 items-center gap-1.5 md:flex">
          {filteredPrimary.map((l) => {
            const active = pathname === l.to;
            const tourId = `seeker-nav-${l.label.toLowerCase().replace(/\s+/g, '-')}`;
            return (
              <Link
                key={l.to}
                to={l.to}
                data-tour={tourId}
                className={`pill px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
                  active
                    ? "bg-muted text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}

          {/* Tools Dropdown */}
          {filteredTools.length > 0 && (
            <div className="relative" ref={toolsDropdownRef}>
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                data-tour="seeker-nav-career-tools"
                className={`pill px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition flex items-center gap-1 ${
                  filteredTools.some(l => pathname === l.to)
                    ? "bg-muted text-foreground font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <span>Career Tools</span>
                <ChevronDown size={14} className={`transition-transform duration-200 ${toolsOpen ? "rotate-180" : ""}`} />
              </button>

              {toolsOpen && (
                <div className="absolute left-0 mt-2 w-52 rounded-xl p-1.5 z-20 flex flex-col gap-0.5 skeuo-dropdown-panel">
                  {filteredTools.map((l) => {
                    const Icon = l.icon;
                    const active = pathname === l.to;
                    const tourId = `seeker-nav-${l.label.toLowerCase().replace(/\s+/g, '-')}`;
                    return (
                      <Link
                        key={l.to}
                        to={l.to}
                        data-tour={tourId}
                        onClick={() => setToolsOpen(false)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm skeuo-dropdown-item ${
                          active
                            ? "bg-[#faf9f6] dark:bg-[#212126] text-foreground font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        <Icon size={14} className="text-muted-foreground shrink-0 transition-colors" />
                        <span className="transition-colors">{l.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Premium plans featured pill */}
          {isLoggedIn && (
            <Link
              to="/jobs/billing"
              data-tour="seeker-nav-premium-plans"
              className={`pill px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                pathname === "/jobs/billing"
                  ? "bg-amber-500/10 text-amber-500 font-semibold border border-amber-500/20"
                  : "text-amber-500 hover:bg-amber-500/5"
              }`}
            >
              <Sparkles size={14} />
              <span>Premium Plans</span>
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />

          {/* 9-Box App Switcher Dropdown */}
          <div className="relative" ref={appsDropdownRef}>
            <button
              onClick={() => setAppsOpen(!appsOpen)}
              aria-label="Between Applications"
              className="pill p-2 text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition shrink-0 rounded-full"
              title="Between Applications"
            >
              <Grid3x3 className="h-4 w-4" />
            </button>

            {appsOpen && (
              <div className="absolute right-0 mt-2 w-52 rounded-xl p-1.5 z-50 flex flex-col gap-0.5 shadow-2xl border border-border bg-popover text-popover-foreground">
                <Link
                  to="/jobs"
                  onClick={() => setAppsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm skeuo-dropdown-item font-semibold text-foreground hover:bg-muted/80 transition"
                >
                  <Home size={14} className="text-blue-500 shrink-0" />
                  <span>Between Jobs</span>
                </Link>
                <a
                  href="/dashboard"
                  onClick={() => setAppsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm skeuo-dropdown-item text-muted-foreground hover:bg-muted/80 hover:text-foreground transition"
                >
                  <LayoutDashboard size={14} className="text-muted-foreground shrink-0" />
                  <span>Between Recruiter</span>
                </a>
                <a
                  href="/developer"
                  onClick={() => setAppsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm skeuo-dropdown-item text-muted-foreground hover:bg-muted/80 hover:text-foreground transition"
                >
                  <Bot size={14} className="text-muted-foreground shrink-0" />
                  <span>Between Developer</span>
                </a>
                <Link
                  to="/support"
                  onClick={() => setAppsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm skeuo-dropdown-item text-muted-foreground hover:bg-muted/80 hover:text-foreground transition border-t border-border/50 mt-1 pt-2"
                >
                  <HelpCircle size={14} className="text-muted-foreground shrink-0" />
                  <span>Support & Appeals</span>
                </Link>
              </div>
            )}
          </div>
          {isLoggedIn && (
            <button
              data-tour="seeker-help-btn"
              aria-label="Help & Tour"
              onClick={startTour}
              className="pill p-2 text-muted-foreground hover:bg-muted hover:text-foreground flex items-center justify-center transition shrink-0"
              title="Help & Tour"
            >
              <HelpCircle className="h-4 w-4" />
            </button>
          )}
          {isLoggedIn ? (
            <>
              <Link
                to="/jobs/dashboard"
                data-tour="seeker-nav-dashboard"
                className="pill hidden border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted sm:inline-flex"
              >
                Dashboard
              </Link>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <Link
                  to="/jobs/profile"
                  className="flex items-center justify-center h-10 w-10 rounded-full bg-accent/10 text-accent hover:bg-accent/20 transition shrink-0"
                  aria-label="Profile"
                >
                  {rawAvatar && !imgError ? (
                    <img
                      src={rawAvatar.startsWith('http') ? rawAvatar : `${API_HOST}${rawAvatar}`}
                      alt={seekerData?.full_name || 'Profile'}
                      onError={() => setImgError(true)}
                      className="h-8 w-8 rounded-full object-cover border border-accent/20 bg-muted"
                    />
                  ) : (
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-bold text-white uppercase">
                      {getSeekerInitial(seekerData?.full_name)}
                    </div>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="pill p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/jobs/login"
                className="pill hidden border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                to="/jobs/register"
                className="pill bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto hide-scrollbar border-t border-border/60 px-3 py-2 md:hidden">
        {filteredLinks.map((l) => {
          const active = pathname === l.to;
          const Icon = l.icon;
          const tourId = `seeker-nav-${l.label.toLowerCase().replace(/\s+/g, '-')}`;
          return (
            <Link
              key={l.to}
              to={l.to}
              data-tour={tourId}
              className={`pill flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${
                active 
                  ? "bg-muted text-foreground font-medium shadow-sm" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {l.label}
            </Link>
          );
        })}
      </nav>

      {isLoggedIn && (
        <OnboardingTour
          tourKey="seeker_portal"
          steps={SEEKER_TOUR_STEPS}
          isOpen={tourOpen}
          onClose={closeTour}
        />
      )}
      </header>
    </div>
  );
}

export function Footer() {
  const [logoHovered, setLogoHovered] = useState(false);

  const socialLinks = [
    {
      href: "https://linkedin.com",
      ariaLabel: "LinkedIn",
      tooltip: "LinkedIn",
      color: "#0A66C2",
      svgUrl: "https://cdn.simpleicons.org/linkedin",
    },
    {
      href: "https://x.com",
      ariaLabel: "Twitter",
      tooltip: "Twitter",
      color: "#000000",
      svgUrl: "https://cdn.simpleicons.org/x",
    },
    {
      href: "https://instagram.com",
      ariaLabel: "Instagram",
      tooltip: "Instagram",
      color: "#E1306C",
      svgUrl: "https://cdn.simpleicons.org/instagram",
    },
    {
      href: "https://facebook.com",
      ariaLabel: "Facebook",
      tooltip: "Facebook",
      color: "#1877F2",
      svgUrl: "https://cdn.simpleicons.org/facebook",
    },
    {
      href: "https://t.me",
      ariaLabel: "Telegram",
      tooltip: "Telegram",
      color: "#0088CC",
      svgUrl: "https://cdn.simpleicons.org/telegram",
    },
  ];

  const footerSections = [
    { 
      t: "Job Seekers", 
      items: [
        { label: "Find Jobs", to: "/jobs/search" },
        { label: "Explore Companies", to: "/jobs/companies" },
        { label: "AI Resume Builder", to: "/resume-builder" },
        { label: "Hiring Safety", to: "/jobs/safety-checker" },
        { label: "Market Trends", to: "/jobs/trends" },
        { label: "AI Mock Interview", to: "/jobs/mock-interview" },
        { label: "Premium Plans", to: "/jobs/billing" }
      ] 
    },
    { 
      t: "Developers & API", 
      items: [
        { label: "Developer Portal", to: "/developer" },
        { label: "API Documentation", to: "/developer/docs" },
        { label: "API Keys", to: "/developer/keys" },
        { label: "Webhooks", to: "/developer/webhooks" },
        { label: "Usage & Billing", to: "/developer/billing" }
      ] 
    },
    { 
      t: "Portals & Login", 
      items: [
        { label: "Job Seeker Portal", to: "/jobs" },
        { label: "Recruiter Workspace", to: "/login" },
        { label: "Developer Portal", to: "/developer" },
        { label: "Admin Login", to: "/admin/login" }
      ] 
    },
    { 
      t: "Company & Legal", 
      items: [
        { label: "About Us", to: "/about" },
        { label: "Contact Support", to: "/contact" },
        { label: "Support & Appeals", to: "/support" },
        { label: "Terms of Service", to: "/terms" },
        { label: "Privacy Policy", to: "/terms" },
        { label: "Refund Policy", to: "/refund-policy" }
      ] 
    },
  ];

  return (
    <footer className="mt-24 border-t border-border/60 bg-background relative overflow-hidden">
      <div className="mx-auto flex flex-col lg:flex-row justify-between items-start max-w-7xl w-full px-6 py-12 gap-10 relative z-10">
        {/* Brand Section */}
        <div className="max-w-xs w-full space-y-4">
          <Link 
            to="/jobs" 
            className="flex items-center gap-2.5 w-max group"
            onMouseEnter={() => setLogoHovered(true)}
            onMouseLeave={() => setLogoHovered(false)}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm bg-[#2A2A2A] p-1.5 border border-white/10 shrink-0 shadow-sm transition-all duration-300 ${logoHovered ? 'scale-105 shadow-md ring-2 ring-blue-500/20' : ''}`}>
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logo-grad-footer-chrome" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
                <line x1="32" y1="68" x2="68" y2="32" stroke="url(#logo-grad-footer-chrome)" strokeWidth="14" strokeLinecap="round" />
                <circle cx="32" cy="68" r="16" fill="#38bdf8" />
                <circle cx="68" cy="32" r="24" fill="#2563eb" />
              </svg>
            </div>
            <span className={`font-display text-2xl font-bold tracking-tight transition-all duration-300 ${
              logoHovered 
                ? "text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-600" 
                : "text-foreground"
            }`}>
              Between
            </span>
          </Link>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A calmer job search & screening platform. Built for smarter hiring.
          </p>
          <div className="pt-2">
            <SocialTooltip items={socialLinks} className="justify-start" />
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 w-full lg:w-auto flex-1 lg:max-w-3xl">
          {footerSections.map((c) => (
            <div key={c.t} className="min-w-[120px]">
              <div className="text-sm font-bold text-foreground mb-3 font-display">{c.t}</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {c.items.map((x) => (
                  <li key={x.label}>
                    <Link to={x.to} className="hover:text-foreground transition-colors leading-normal block">{x.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground relative z-10 bg-background/80 backdrop-blur-sm">
        © {new Date().getFullYear()} Between Platform · Built for smarter hiring.
      </div>
    </footer>
  );
};
