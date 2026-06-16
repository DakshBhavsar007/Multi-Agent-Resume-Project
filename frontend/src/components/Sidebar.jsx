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
          <h1 className="text-[#C8871A] text-[20px] font-bold tracking-tight">Vishleshan</h1>
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
                    ? 'bg-amber-500/15 text-[#C8871A] border-l-2 border-[#C8871A] pl-[10px]'
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
            {logo ? (
              <img src={logo} alt="Company Logo" className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#C8871A] flex items-center justify-center text-white font-bold shrink-0">
                {company?.name?.charAt(0)?.toUpperCase() || 'V'}
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
              <div className="bg-[#C8871A] h-full rounded-full" style={{ width: `${parsePercent}%` }}></div>
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
