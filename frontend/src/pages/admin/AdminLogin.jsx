"use client";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Shield, Eye, EyeOff, Loader2, Lock, Mail, Sun, Moon } from 'lucide-react';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { API_HOST } from '../../lib/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const adminAuth = useAdminAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  // Sync theme with document.documentElement.classList
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    // Auto-redirect if already logged in as admin
    if (adminAuth.adminToken) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [adminAuth.adminToken, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_HOST}/api/v1/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const resData = await response.json();
      if (response.status === 429) {
        const retryAfter = resData.data?.retry_after_seconds || 60;
        toast.error(`Too many attempts. Please try again in ${retryAfter} seconds.`);
        return;
      }
      if (resData.success) {
        adminAuth.setAdminAuth(resData.data);
        toast.success("Welcome back, Administrator!");
        navigate('/admin/dashboard');
      } else {
        toast.error(resData.error || "Invalid admin credentials.");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-200">
      
      {/* Theme Toggle Button */}
      <button 
        onClick={toggleTheme} 
        className="absolute top-6 right-6 p-3 rounded-full bg-slate-200/80 hover:bg-slate-300 dark:bg-zinc-800/80 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 backdrop-blur-md border border-slate-300 dark:border-zinc-700 transition z-20 shadow-sm"
        title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      {/* Decorative background glows */}
      <div className="absolute w-[400px] h-[400px] bg-blue-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl top-[10%] left-[20%] pointer-events-none" />
      <div className="absolute w-[500px] h-[500px] bg-indigo-500/10 dark:bg-pink-500/10 rounded-full blur-3xl bottom-[10%] right-[10%] pointer-events-none" />

      {/* Card Container */}
      <div className="w-full max-w-[440px] bg-white/90 dark:bg-zinc-900/80 backdrop-blur-xl border border-slate-200 dark:border-zinc-800 rounded-3xl p-8 shadow-2xl z-10 transition-colors">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/30 mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
            Between Admin
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Enter your credentials to access the moderation console.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} className="space-y-5">
          {/* Email field */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-400">
              Admin Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-4 top-3.5" />
              <input
                type="email"
                placeholder="admin@between.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl pl-11 pr-4 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-zinc-400">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute left-4 top-3.5" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl pl-11 pr-11 py-3 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:border-blue-600 dark:focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-3.5 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Sign In to Console"
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
