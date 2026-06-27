"use client";

import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Layers, Settings as SettingsIcon, LogOut, Sparkles, Home, Shield } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { authAPI } from '../lib/api';

export default function Sidebar() {
  const pathname = useLocation().pathname;
  const { company, clearAuth } = useAuthStore();
  const [logo, setLogo] = useState(localStorage.getItem('vish_company_logo') || '');

  const getFullUrl = (path) => {
    if (!path) return "";
    if (path.startsWith("data:") || path.startsWith("http")) return path;
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1").replace("/api/v1", "");
    return `${apiBase}${path}`;
  };

  const logoUrl = company?.logo_path ? getFullUrl(company.logo_path) : logo;

  useEffect(() => {
    const updateLogo = () => {
      setLogo(localStorage.getItem('vish_company_logo') || '');
    };
    window.addEventListener('company_logo_updated', updateLogo);
    return () => window.removeEventListener('company_logo_updated', updateLogo);
  }, []);

  const handleLogout = () => {
    try {
      authAPI.logout();
    } catch(e) {
      clearAuth();
    }
  };

  const navItems = [
    { href: '/', label: 'Home Page', icon: Home },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/dashboard/smart-analyzer', label: 'Smart Analyzer', icon: Sparkles },
    { href: '/dashboard/protection', label: 'Protection', icon: Shield },
    { href: '/dashboard/sessions', label: 'Sessions', icon: Layers },
    { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const getTierBadgeColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'starter': return 'bg-blue-100 text-blue-700';
      case 'business': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Mock usage data
  const parsesUsed = 247;
  const parsesTotal = 1000;
  const parsePercent = (parsesUsed / parsesTotal) * 100;

  return (
    <div className="w-64 min-w-[256px] bg-[#2A2A2A] h-screen flex flex-col overflow-y-auto">
      {/* Top Section */}
      <div className="pt-6 px-5 pb-4">
        <div>
          <h1 className="text-[#2563EB] text-[20px] font-bold tracking-tight">Between</h1>
          <p className="text-[#9CA3AF] text-xs mt-0.5">Recruiter Dashboard</p>
        </div>
      </div>
      <div className="border-b border-[#374151] mx-5 mb-4"></div>

      {/* Nav Items */}
      <div className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} to={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  isActive
                    ? 'bg-amber-500/15 text-[#2563EB] border-l-2 border-[#2563EB] pl-[10px]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom Section */}
      <div className="mt-auto p-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <div className="flex items-center gap-3 mb-3">
            {logoUrl ? (
              <img src={logoUrl} alt="Company Logo" className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-charcoal border border-white/10 flex items-center justify-center text-white shrink-0 p-1.5">
                <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="logo-grad-side" x1="0%" y1="100%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#2563eb" />
                    </linearGradient>
                  </defs>
                  <line x1="32" y1="68" x2="68" y2="32" stroke="url(#logo-grad-side)" strokeWidth="12" strokeLinecap="round" />
                  <circle cx="32" cy="68" r="16" fill="#38bdf8" />
                  <circle cx="68" cy="32" r="24" fill="#2563eb" />
                </svg>
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-white text-sm font-medium truncate">
                {company?.name || 'Company Name'}
              </p>
              <span className={`inline-block px-2 py-0.5 mt-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getTierBadgeColor(company?.tier)}`}>
                {company?.tier || 'Free'}
              </span>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-gray-400 text-xs">{parsesUsed}/{parsesTotal} parses</span>
            </div>
            <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden">
              <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${parsePercent}%` }}></div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-gray-400 hover:text-red-400 transition-colors text-sm font-medium px-2 py-2 rounded hover:bg-white/5"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
