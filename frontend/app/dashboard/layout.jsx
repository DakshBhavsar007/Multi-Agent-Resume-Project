"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import Sidebar from '../../components/Sidebar';
import RateLimitBanner from '../../components/RateLimitBanner';

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { initFromStorage, company } = useAuthStore();
  const [initDone, setInitDone] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    initFromStorage();
    const jwt = localStorage.getItem("vish_jwt");
    if (!jwt) {
      router.push("/login");
    } else {
      setInitDone(true);
    }
  }, [initFromStorage, router]);

  if (!initDone) return null; // Wait for hydrate

  const getTierBadgeColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'starter': return 'bg-blue-100 text-blue-700';
      case 'business': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-cream">
      <RateLimitBanner />
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out`}>
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Bar */}
        <header className="h-[60px] shrink-0 bg-white border-b border-gray-200 px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              className="md:hidden p-2 -ml-2 text-charcoal hover:bg-gray-50 rounded-lg"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} />
            </button>
            <h2 className="text-charcoal font-semibold hidden md:block">Vishleshan Platform</h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-charcoal">{company?.name || 'Company Name'}</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getTierBadgeColor(company?.tier)}`}>
                {company?.tier || 'Free'}
              </span>
            </div>
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm shrink-0">
              {company?.name?.charAt(0)?.toUpperCase() || 'V'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
