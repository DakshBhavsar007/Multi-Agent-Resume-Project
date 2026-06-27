import React, { useEffect, useState } from "react";
import { useNavigate, useLocation, Outlet, Link } from "react-router-dom";
import { LayoutDashboard, Key, BarChart2, Webhook, Code, CreditCard, BookOpen, Settings, LogOut, Menu, X, HelpCircle, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { usePortalAuthStore } from "../../stores/portalAuthStore";
import { portalAuth } from "../../lib/portalApi";
import { motion } from "framer-motion";
import UsageProgress from "../../components/developer/UsageProgress";
import logoWhite from "../../assets/logo_white.png";
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
  const [mobileMenu, setMobileMenu] = useState(false);
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

  return (
    <div className="flex h-screen bg-bg overflow-hidden font-sans text-charcoal">
      
      {/* Mobile Toggle */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b z-50 p-4 flex justify-between items-center text-charcoal shadow-sm">
        <div className="flex items-center gap-2">
          <Key className="text-accent" size={24} />
          <span className="font-bold">Portal</span>
        </div>
        <button onClick={() => setMobileMenu(!mobileMenu)} className="p-2">
          {mobileMenu ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`${mobileMenu ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:relative z-40 ${sidebarCollapsed ? "w-16" : "w-64"} h-full bg-white border-r border-[#e6dfcd] flex flex-col transition-all duration-300 ease-in-out`}>
        
        <div className="p-4 pb-2">
          <div className={`flex items-start flex-col mb-6 gap-0.5 mt-4 md:mt-0 ${sidebarCollapsed ? "items-center" : ""}`}>
            {!sidebarCollapsed && (
              <>
                <div className="relative flex shrink-0 items-center w-44 h-16 overflow-hidden cursor-pointer" onClick={() => navigate("/developer")}>
                  <img src={logoWhite} alt="Between Logo" className="absolute left-[-76px] top-1/2 -translate-y-1/2 h-[220px] w-auto max-w-none object-contain pointer-events-none" />
                </div>
                <span className="text-xs font-bold text-gray-700 uppercase tracking-widest pl-0.5">Dev Portal</span>
              </>
            )}
            {sidebarCollapsed && (
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center cursor-pointer mt-2" onClick={() => navigate("/developer")}>
                <Code size={16} className="text-accent" />
              </div>
            )}
          </div>
          {/* Desktop collapse toggle button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`hidden md:flex items-center justify-center w-full h-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200 ${sidebarCollapsed ? "" : ""}`}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 hide-scrollbar">
          <div className="flex flex-col gap-1 mb-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  data-tour={item.tourAttr || undefined}
                  onClick={() => setMobileMenu(false)}
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
                  {!sidebarCollapsed && (
                    <span className="text-sm truncate relative z-10">
                      {item.name}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>

          <div className="flex flex-col gap-1 mb-4 border-t border-[#e6dfcd] pt-4">
            {bottomItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenu(false)}
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
                  {!sidebarCollapsed && (
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
        {!sidebarCollapsed && (
          <div className="p-4 border-t border-[#e6dfcd] bg-gray-50/50">
             <UsageProgress />
              
              <div className="flex items-center gap-2 pt-4 mt-3 border-t border-gray-100">
                <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm tracking-tighter shrink-0 cursor-default">
                  {(company_name || developer?.email || "D").substring(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-bold truncate text-charcoal">{company_name || "Developer"}</span>
                  <span className="text-[11px] text-gray-750 truncate font-bold">{developer?.email || "developer@example.com"}</span>
                </div>
              </div>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="p-3 border-t border-[#e6dfcd] bg-gray-50/50 flex justify-center">
            <div className="w-8 h-8 rounded-full bg-accent text-white flex items-center justify-center font-bold text-sm tracking-tighter cursor-default" title={company_name || "Developer"}>
              {(company_name || developer?.email || "D").substring(0, 2).toUpperCase()}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto bg-white md:mt-0 mt-16 md:p-8 p-4 relative z-0 hide-scrollbar">
          <ErrorBoundary>
              <motion.div key={pathname} initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.08}} className="w-full h-full">
                <Outlet />
              </motion.div>
          </ErrorBoundary>
      </main>

      {/* Mobile overlay */}
      {mobileMenu && (
        <div 
          className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileMenu(false)}
        />
      )}

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
