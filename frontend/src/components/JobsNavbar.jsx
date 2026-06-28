import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Upload, Briefcase, TrendingUp, FolderGit, Home, Shield, Bell, Sparkles, LayoutDashboard } from 'lucide-react';
import ResumeUploadModal from './ResumeUploadModal';

export default function JobsNavbar({ onUploadClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isSeekerLoggedIn = !!localStorage.getItem('vish_seeker_token');

  const [modalOpen, setModalOpen] = useState(false);
  const [preselectedFile, setPreselectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreselectedFile(file);
      setModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setPreselectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Sync profile from local storage
  const syncProfile = () => {
    const seekerData = localStorage.getItem('vish_seeker_data');
    if (seekerData) {
      try {
        const parsed = JSON.parse(seekerData);
        setProfile({
          name: parsed.full_name,
          email: parsed.email,
          skills: parsed.skills || []
        });
        return;
      } catch (e) {}
    }

    const saved = localStorage.getItem('vish_seeker_profile');
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch (e) {
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    syncProfile();
    // Listen for custom event triggered when profile is uploaded
    window.addEventListener('seeker_profile_updated', syncProfile);
    return () => window.removeEventListener('seeker_profile_updated', syncProfile);
  }, []);

  const handleClearProfile = () => {
    localStorage.removeItem('vish_seeker_profile');
    localStorage.removeItem('vish_applied_jobs');
    localStorage.removeItem('vish_seeker_token');
    localStorage.removeItem('vish_seeker_data');
    setProfile(null);
    setDropdownOpen(false);
    window.dispatchEvent(new Event('seeker_profile_updated'));
    navigate('/jobs');
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="w-full bg-[#FFFFFF] border-b border-[#e6dfcd] sticky top-0 z-40 px-6 py-4 flex items-center justify-between shadow-sm">
      {/* Brand logo */}
      <div className="flex items-center space-x-8">
        <Link to="/jobs" className="flex items-center gap-2 pr-1 sm:pr-3 shrink-0 no-underline text-inherit">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm bg-[#2A2A2A] p-1">
            <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="logo-grad-jobs-nav" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <line x1="32" y1="68" x2="68" y2="32" stroke="url(#logo-grad-jobs-nav)" strokeWidth="14" strokeLinecap="round" />
              <circle cx="32" cy="68" r="16" fill="#38bdf8" />
              <circle cx="68" cy="32" r="24" fill="#2563eb" />
            </svg>
          </div>
          <span className="font-display text-[22px] text-foreground tracking-tight font-semibold">
            Between
          </span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center space-x-2 xl:space-x-4 lg:space-x-3 overflow-x-auto hide-scrollbar">
          <Link
            to="/"
            className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              isActive('/')
                ? 'text-[#111111] bg-gray-100 font-semibold'
                : 'text-[#5c5c5c] hover:text-[#2A2A2A]'
            }`}
          >
            <Home size={16} />
            <span>Home</span>
          </Link>

          {isSeekerLoggedIn && (
            <Link
              to="/jobs"
              className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                isActive('/jobs')
                  ? 'text-[#111111] bg-gray-100 font-semibold'
                  : 'text-[#5c5c5c] hover:text-[#2A2A2A]'
              }`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </Link>
          )}
          
          <Link
            to="/jobs/search"
            className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              isActive('/jobs/search')
                ? 'text-[#111111] bg-gray-100 font-semibold'
                : 'text-[#5c5c5c] hover:text-[#2A2A2A]'
            }`}
          >
            <Briefcase size={16} />
            <span>Find Jobs</span>
          </Link>

          {isSeekerLoggedIn && (
            <Link
              to="/jobs/resume"
              className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                isActive('/jobs/resume')
                  ? 'text-[#111111] bg-gray-100 font-semibold'
                  : 'text-[#5c5c5c] hover:text-[#2A2A2A]'
              }`}
            >
              <Sparkles size={16} />
              <span>AI Resume Enhancer</span>
            </Link>
          )}
          
          {isSeekerLoggedIn && (
            <Link
              to="/jobs/applications"
              className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                isActive('/jobs/applications')
                  ? 'text-[#111111] bg-gray-100 font-semibold'
                  : 'text-[#5c5c5c] hover:text-[#2A2A2A]'
              }`}
            >
              <FolderGit size={16} />
              <span>My Applications</span>
            </Link>
          )}

          {isSeekerLoggedIn && (
            <Link
              to="/jobs/notifications"
              className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                isActive('/jobs/notifications')
                  ? 'text-[#111111] bg-gray-100 font-semibold'
                  : 'text-[#5c5c5c] hover:text-[#2A2A2A]'
              }`}
            >
              <Bell size={16} />
              <span>Notifications</span>
            </Link>
          )}

          <Link
            to="/jobs/trends"
            className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              isActive('/jobs/trends')
                ? 'text-[#111111] bg-gray-100 font-semibold'
                : 'text-[#5c5c5c] hover:text-[#2A2A2A]'
            }`}
          >
            <TrendingUp size={16} />
            <span>Market Trends</span>
          </Link>

          <Link
            to="/jobs/safety-checker"
            className={`flex items-center space-x-1.5 px-2.5 lg:px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
              isActive('/jobs/safety-checker')
                ? 'text-[#111111] bg-gray-100 font-semibold'
                : 'text-[#5c5c5c] hover:text-[#2A2A2A]'
            }`}
          >
            <Shield size={16} />
            <span>Hiring Safety</span>
          </Link>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-4">
        {profile ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 border border-[#e6dfcd] hover:border-gray-400 rounded-full px-4 py-2 text-sm font-medium text-[#2A2A2A] transition-colors"
            >
              <div className="w-6 h-6 bg-[#111111] text-white rounded-full flex items-center justify-center text-xs font-bold capitalize">
                {profile.name ? profile.name[0] : 'U'}
              </div>
              <span className="max-w-[120px] truncate">
                {profile.name ? profile.name.split(' ')[0] : 'User'}
              </span>
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-56 bg-white border border-[#e6dfcd] rounded-xl shadow-lg z-20 overflow-hidden"
                  >
                    <div className="p-3 border-b border-[#e6dfcd] bg-[#f5f4ef]/50">
                      <div className="text-sm font-bold text-[#2A2A2A] truncate">{profile.name}</div>
                      <div className="text-xs text-[#5c5c5c] truncate">{profile.email || 'No email associated'}</div>
                      <div className="mt-1 text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded inline-block font-semibold">
                        {profile.skills?.length || 0} Skills Extracted
                      </div>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          fileInputRef.current?.click();
                        }}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-[#2A2A2A] hover:bg-[#f5f4ef] rounded-lg text-left transition-colors"
                      >
                        <Upload size={14} />
                        <span>Update Resume</span>
                      </button>
                      <button
                        onClick={handleClearProfile}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-[#EF4444] hover:bg-red-50 rounded-lg text-left transition-colors"
                      >
                        <LogOut size={14} />
                        <span>{isSeekerLoggedIn ? 'Log Out' : 'Clear AI Profile'}</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-2 bg-[#111111] hover:bg-[#333333] text-white font-medium rounded-full px-5 py-2.5 text-sm transition-all shadow-sm active:scale-95"
          >
            <Upload size={14} />
            <span>Upload Resume</span>
          </button>
        )}

        {!isSeekerLoggedIn && (
          <button 
            onClick={() => navigate('/jobs/login')} 
            className="text-sm font-bold text-[#111111] border border-[#e6dfcd] hover:border-[#111111] hover:bg-[#fdfcfb] rounded-full px-5 py-2 transition-all bg-white shadow-sm active:scale-95"
          >
            Sign In
          </button>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.docx,.txt"
          style={{ display: 'none' }}
        />
        <ResumeUploadModal isOpen={modalOpen} onClose={handleModalClose} preselectedFile={preselectedFile} />

      </div>
    </nav>
  );
}
