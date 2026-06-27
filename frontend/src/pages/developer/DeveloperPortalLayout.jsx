import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, Key, BarChart2, Webhook, Code, CreditCard, BookOpen, Settings, LogOut, Menu, X, HelpCircle, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePortalAuthStore } from "../../stores/portalAuthStore";
import { portalAuth } from "../../lib/portalApi";
import { motion } from "framer-motion";
import UsageProgress from "../../components/developer/UsageProgress";
import { OnboardingTour, useTour } from "../../components/OnboardingTour";

const DEVELOPER_TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to the Dev Portal',
    content: 'Build powerful recruitment tools using the Between API. Take a quick tour to explore what you can do here.',
    icon: Code,
    target: null,
  },
  {
    id: 'dashboard',
    title: 'Overview Dashboard',
    content: 'Track your API usage, see rate limits, and monitor your integration health in real time.',
    icon: LayoutDashboard,
    target: '[data-tour="dev-nav-dashboard"]',
    placement: 'right',
  },
  {
    id: 'keys',
    title: 'API Keys',
    content: 'Generate and manage your API keys. Use them to authenticate all API calls to Between.',
    icon: Key,
    target: '[data-tour="dev-nav-keys"]',
    placement: 'right',
  },
  {
    id: 'usage',
    title: 'Usage & Logs',
    content: 'View detailed call logs, response times, and usage analytics across all your API keys.',
    icon: BarChart2,
    target: '[data-tour="dev-nav-usage"]',
    placement: 'right',
  },
  {
    id: 'billing',
    title: 'Billing & Plans',
    content: 'Upgrade your developer plan to get higher rate limits and access to advanced features.',
    icon: CreditCard,
    target: '[data-tour="dev-nav-billing"]',
    placement: 'right',
  },
  {
    id: 'help',
    title: 'Help, anytime',
    content: 'Click the help button to replay this tour whenever you need a refresher.',
    icon: HelpCircle,
    target: '[data-tour="dev-help-btn"]',
    placement: 'right',
  },
];

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error) { return { hasError: true }; }
  render() {
    if (this.state.hasError) return <div className="p-8 w-full"><div className="bg-red-50 text-red-500 font-bold p-6 rounded-xl border border-red-200 flex flex-col items-start gap-3"><h3>Something went wrong.</h3><button onClick={()=>window.location.reload()} className="px-4 py-2 bg-red-100 rounded-lg text-sm">Retry</button></div></div>;
    return this.props.children;
  }
}

export default function DeveloperPortalLayout() {
  const { jwt, developer, company_name, initFromStorage, clearAuth, setAuth } = usePortalAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { isOpen: tourOpen, startTour, closeTour } = useTour('developer_portal');

  useEffect(() => {
    initFromStorage();
    setMounted(true);
    const token = usePortalAuthStore.getState().jwt || localStorage.getItem("portal_jwt");
    if (!token) {
      navigate("/developer/login");
      return;
    }

    // Refresh profile on layout mount
    portalAuth.getMe()
      .then((meData) => {
        setAuth(meData);
      })
      .catch((err) => {
        console.error("Failed to sync developer info:", err);
        if (err.message === "Session expired" || err.message === "Unauthorized") {
          clearAuth();
        }
      });
  }, [initFromStorage, navigate, setAuth, clearAuth]);

  if (!mounted || !jwt) return null;

  const navItems = [
    { name: "Overview", href: "/developer/portal/dashboard", icon: LayoutDashboard, tourAttr: 'dev-nav-dashboard' },
    { name: "API Keys", href: "/developer/portal/keys", icon: Key, tourAttr: 'dev-nav-keys' },
    { name: "Usage & Logs", href: "/developer/portal/usage", icon: BarChart2, tourAttr: 'dev-nav-usage' },
    { name: "Webhooks", href: "/developer/portal/webhooks", icon: Webhook },
    { name: "Embed", href: "/developer/portal/embed", icon: Code },
    { name: "Billing", href: "/developer/portal/billing", icon: CreditCard, tourAttr: 'dev-nav-billing' },
  ];

  const bottomItems = [
    { name: "API Docs", href: "/developer/portal/docs", icon: BookOpen },
    { name: "Settings", href: "/developer/portal/settings", icon: Settings },
  ];

  const cleanPath = pathname.replace(/\/$/, "");

  return (
    <div className="min-h-screen bg-white text-foreground font-sans developer-portal-page">
      
      {/* Top App Bar — Google / Recruiter style */}
      <header className="fixed top-0 inset-x-0 z-40 h-16 bg-white border-b border-gray-200 flex items-center px-4 gap-2">
        <button
          onClick={() => setSidebarCollapsed((v) => !v)}
          className="w-12 h-12 shrink-0 rounded-full hover:bg-gray-100 flex items-center justify-center text-muted-foreground transition"
          aria-label="Toggle menu"
        >
          <Menu size={22} />
        </button>

        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/developer")}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm bg-charcoal p-1">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-grad-dev-portal" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <line x1="32" y1="68" x2="68" y2="32" stroke="url(#logo-grad-dev-portal)" strokeWidth="14" strokeLinecap="round" />
              <circle cx="32" cy="68" r="16" fill="#38bdf8" />
              <circle cx="68" cy="32" r="24" fill="#2563eb" />
            </svg>
          </div>
          <span className="font-display text-[22px] text-foreground tracking-tight font-semibold">
            Between
          </span>
          <span className="text-muted-foreground text-sm hidden sm:inline ml-1 font-medium">Developer Portal</span>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={`fixed top-16 bottom-0 left-0 z-40 bg-white border-r border-gray-200 transition-[width] duration-200 ${
        sidebarCollapsed ? "w-[72px]" : "w-[260px]"
      } flex flex-col`}>
        
        <div className="flex-1 overflow-y-auto px-2 py-3 hide-scrollbar">
          <div className="flex flex-col gap-1 mb-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = cleanPath.startsWith(item.href.replace(/\/$/, ""));
              const showLabel = !sidebarCollapsed;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  data-tour={item.tourAttr || undefined}
                  className={`flex items-center h-12 rounded-full px-3 gap-5 relative group transition-colors duration-200 ${
                    isActive 
                      ? "text-[#111111] font-semibold" 
                      : "text-charcoal hover:bg-gray-100 font-medium"
                  } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                  title={item.name}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeDevNavBackground"
                      className="absolute inset-0 bg-gray-100 rounded-full border border-[#111111]/10"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span className={`w-6 flex items-center justify-center shrink-0 transition-colors duration-200 relative z-10 ${
                    isActive ? "text-[#111111]" : "text-gray-500 group-hover:text-charcoal"
                  }`}>
                    <Icon size={20} />
                  </span>
                  {showLabel && (
                    <span className="text-sm truncate relative z-10">
                      {item.name}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          <div className="flex flex-col gap-1 mb-4 border-t border-gray-200 pt-4">
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const isActive = cleanPath === item.href.replace(/\/$/, "");
              const showLabel = !sidebarCollapsed;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center h-12 rounded-full px-3 gap-5 relative group transition-colors duration-200 ${
                    isActive 
                      ? "text-[#111111] font-semibold" 
                      : "text-charcoal hover:bg-gray-100 font-medium"
                  } ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                  title={item.name}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeDevNavBackgroundBottom"
                      className="absolute inset-0 bg-gray-100 rounded-full border border-[#111111]/10"
                      transition={{ type: "spring", stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span className={`w-6 flex items-center justify-center shrink-0 transition-colors duration-200 relative z-10 ${
                    isActive ? "text-[#111111]" : "text-gray-500 group-hover:text-charcoal"
                  }`}>
                    <Icon size={20} />
                  </span>
                  {showLabel && (
                    <span className="text-sm truncate relative z-10">
                      {item.name}
                    </span>
                  )}
                </Link>
              )
            })}
             <button
                onClick={clearAuth}
                className={`flex items-center h-10 rounded-full px-3 gap-5 text-gray-500 hover:text-red-600 hover:bg-red-50 transition mt-2 text-left w-full ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                title="Logout"
              >
                <span className="w-6 flex items-center justify-center shrink-0">
                  <LogOut size={18} />
                </span>
                {!sidebarCollapsed && <span className="text-sm font-medium">Logout</span>}
              </button>
              <button
                data-tour="dev-help-btn"
                onClick={startTour}
                className={`flex items-center h-10 rounded-full px-3 gap-5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition text-left w-full ${sidebarCollapsed ? "justify-center px-0" : ""}`}
                title="Help & Tour"
              >
                <span className="w-6 flex items-center justify-center shrink-0">
                  <HelpCircle size={18} />
                </span>
                {!sidebarCollapsed && <span className="text-sm font-medium">Help & Tour</span>}
              </button>
          </div>
        </div>

        {/* User Card - hide when collapsed */}
        {!sidebarCollapsed ? (
          <div className="p-3 border-t border-gray-200 bg-gray-50/50">
             <UsageProgress />
              <div className="flex items-center gap-2 pt-3 mt-2 border-t border-gray-200/60">
                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm tracking-tighter shrink-0 cursor-default">
                  {(company_name || developer?.email || "D").substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-xs font-bold truncate text-charcoal">{company_name || "Developer"}</span>
                  <span className="text-[10px] text-gray-500 truncate font-semibold">{developer?.email || "developer@example.com"}</span>
                </div>
              </div>
          </div>
        ) : (
          <div className="p-3 border-t border-gray-200 bg-gray-50/50 flex justify-center">
            <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm tracking-tighter cursor-default" title={company_name || "Developer"}>
              {(company_name || developer?.email || "D").substring(0, 2).toUpperCase()}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main 
        className="pt-16 transition-[padding] duration-200 min-h-screen flex-1 bg-white overflow-y-auto"
        style={{ paddingLeft: sidebarCollapsed ? 72 : 260 }}
      >
        <div className="p-4 sm:p-6 md:p-8 max-w-[1400px] mx-auto">
          <ErrorBoundary>
            <motion.div key={pathname} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.08}} className="w-full h-full">
              <Outlet />
            </motion.div>
          </ErrorBoundary>
        </div>
      </main>

      {/* Onboarding Tour */}
      <OnboardingTour
        tourKey="developer_portal"
        steps={DEVELOPER_TOUR_STEPS}
        isOpen={tourOpen}
        onClose={closeTour}
      />
    </div>
  );
}
