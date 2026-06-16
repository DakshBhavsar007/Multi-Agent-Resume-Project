import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogOut, Upload, Briefcase, TrendingUp, FolderGit, Home, Shield } from 'lucide-react';

export default function JobsNavbar({ onUploadClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isLoggedIn = !!localStorage.getItem('vish_jwt');

  // Sync profile from local storage
  const syncProfile = () => {
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
        <Link to="/jobs" className="flex items-center space-x-2">
          <div className="bg-[#C8871A] text-white p-2 rounded-lg flex items-center justify-center font-bold">
            CE
          </div>
          <span className="text-xl font-bold text-[#2A2A2A] font-sans">CareerEngine</span>
        </Link>

        {/* Links */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            to="/"
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-[#5c5c5c] hover:text-[#2A2A2A] hover:bg-[#f5f4ef]/50"
          >
            <Home size={16} className="text-[#5c5c5c]" />
            <span>Home</span>
          </Link>
          
          <Link
            to="/jobs/search"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive('/jobs/search')
                ? 'text-[#C8871A] bg-[#fcebd1]/50 font-semibold'
                : 'text-[#5c5c5c] hover:text-[#2A2A2A]'
            }`}
          >
            <Briefcase size={16} />
            <span>Find Jobs</span>
          </Link>
          
          <Link
            to="/jobs/trends"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive('/jobs/trends')
                ? 'text-[#C8871A] bg-[#fcebd1]/50 font-semibold'
                : 'text-[#5c5c5c] hover:text-[#2A2A2A]'
            }`}
          >
            <TrendingUp size={16} />
            <span>Market Trends</span>
          </Link>

          <Link
            to="/jobs/safety-checker"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive('/jobs/safety-checker')
                ? 'text-[#C8871A] bg-[#fcebd1]/50 font-semibold'
                : 'text-[#5c5c5c] hover:text-[#2A2A2A]'
            }`}
          >
            <Shield size={16} />
            <span>Hiring Safety</span>
          </Link>

          <Link
            to="/jobs/applications"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              isActive('/jobs/applications')
                ? 'text-[#C8871A] bg-[#fcebd1]/50 font-semibold'
                : 'text-[#5c5c5c] hover:text-[#2A2A2A]'
            }`}
          >
            <FolderGit size={16} />
            <span>My Applications</span>
          </Link>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-4">
        {profile ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 border border-[#e6dfcd] hover:border-[#C8871A] rounded-full px-4 py-2 text-sm font-medium text-[#2A2A2A] transition-colors"
            >
              <div className="w-6 h-6 bg-[#C8871A] text-white rounded-full flex items-center justify-center text-xs font-bold capitalize">
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
                      <div className="mt-1 text-[10px] bg-[#C8871A]/10 text-[#C8871A] px-1.5 py-0.5 rounded inline-block font-semibold">
                        {profile.skills?.length || 0} Skills Extracted
                      </div>
                    </div>
                    <div className="p-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          onUploadClick();
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
                        <span>Clear AI Profile</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button
            onClick={onUploadClick}
            className="flex items-center space-x-2 bg-[#C8871A] hover:bg-[#B07314] text-white font-medium rounded-full px-5 py-2.5 text-sm transition-all shadow-sm active:scale-95"
          >
            <Upload size={14} />
            <span>Upload Resume</span>
          </button>
        )}

        <button 
          onClick={() => navigate(isLoggedIn ? '/dashboard' : '/login')} 
          className="text-sm font-medium text-[#5c5c5c] hover:text-[#2A2A2A] border border-transparent hover:border-[#e6dfcd] rounded-full px-4 py-2 transition-all"
        >
          {isLoggedIn ? 'Dashboard' : 'Sign In'}
        </button>
      </div>
    </nav>
  );
}
