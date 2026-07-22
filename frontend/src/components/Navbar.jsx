import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll } from 'framer-motion';
import { Grid3x3, Home, LayoutDashboard, Bot, HelpCircle } from 'lucide-react';
import './Navbar.css';
import ThemeToggle from './ThemeToggle';

const Navbar = ({ onSignIn, isLoggedIn }) => {
  const [scrolled, setScrolled] = useState(false);
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [appsOpen, setAppsOpen] = useState(false);
  const appsDropdownRef = useRef(null);

  const { scrollY } = useScroll();

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setScrolled(latest > 50);
    });
  }, [scrollY]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.product-dropdown-container')) {
        setProductDropdownOpen(false);
      }
      if (appsDropdownRef.current && !appsDropdownRef.current.contains(e.target)) {
        setAppsOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleScrollTo = (e, id) => {
    if (window.location.pathname === '/') {
      e.preventDefault();
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.history.pushState(null, null, `/#${id}`);
      }
    }
  };

  return (
    <motion.nav 
      className={`navbar ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.21, 0.45, 0.32, 0.9] }}
    >
      <Link to="/" className="nav-left no-underline text-inherit">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm bg-[#2A2A2A] p-1">
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="logo-grad-nav-new" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
            <line x1="32" y1="68" x2="68" y2="32" stroke="url(#logo-grad-nav-new)" strokeWidth="14" strokeLinecap="round" />
            <circle cx="32" cy="68" r="16" fill="#38bdf8" />
            <circle cx="68" cy="32" r="24" fill="#2563eb" />
          </svg>
        </div>
        <span className="font-display text-[22px] text-foreground tracking-tight font-semibold">
          Between
        </span>
      </Link>

      <div className="nav-center">
        {['Product', 'Features', 'Pricing', 'Jobs', 'Developers'].map((item) => {
          if (item === 'Jobs') {
            return (
              <Link 
                key={item}
                to="/jobs" 
                className="nav-link font-semibold transition-all hover:translate-y-[-2px]"
              >
                Jobs
              </Link>
            );
          }
          if (item === 'Developers') {
            return (
              <Link 
                key={item}
                to="/developer" 
                className="nav-link font-semibold transition-all hover:translate-y-[-2px]"
              >
                Developers
              </Link>
            );
          }
          if (item === 'Product') {
            return (
              <div key={item} className="product-dropdown-container">
                <button 
                  onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                  className="nav-link dropdown-trigger font-semibold transition-all hover:translate-y-[-2px] flex items-center gap-1"
                >
                  Product
                  <svg className={`chevron transition-transform duration-200 ${productDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                </button>
                <div className={`product-dropdown-menu skeuo-dropdown-panel ${productDropdownOpen ? 'open' : ''}`}>
                  <a 
                    href="/#how-it-works" 
                    onClick={(e) => { setProductDropdownOpen(false); handleScrollTo(e, 'how-it-works'); }} 
                    className="product-dropdown-item skeuo-dropdown-item"
                  >
                    <span className="product-dropdown-item-title">AI Recruiter</span>
                    <span className="product-dropdown-item-desc">Automated resume ranking & matching</span>
                  </a>
                  <a 
                    href="/#features" 
                    onClick={(e) => { setProductDropdownOpen(false); handleScrollTo(e, 'features'); }} 
                    className="product-dropdown-item skeuo-dropdown-item"
                  >
                    <span className="product-dropdown-item-title">Smart Analyzer</span>
                    <span className="product-dropdown-item-desc">Deep-dive candidate profiles</span>
                  </a>
                  <a 
                    href="/#detailed-showcase" 
                    onClick={(e) => { setProductDropdownOpen(false); handleScrollTo(e, 'detailed-showcase'); }} 
                    className="product-dropdown-item skeuo-dropdown-item"
                  >
                    <span className="product-dropdown-item-title">Fraud Protection</span>
                    <span className="product-dropdown-item-desc">Detect fake resumes & plagiarisms</span>
                  </a>
                </div>
              </div>
            );
          }
          return (
            <motion.a 
              key={item}
              href={`/#${item.toLowerCase()}`} 
              className="nav-link"
              onClick={(e) => handleScrollTo(e, item.toLowerCase())}
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              {item}
            </motion.a>
          );
        })}
      </div>

      <div className="nav-right" style={{ gap: '8px' }}>
        <ThemeToggle />

        {/* 9-Box App Switcher Dropdown */}
        <div className="relative" ref={appsDropdownRef}>
          <button
            onClick={() => setAppsOpen(!appsOpen)}
            aria-label="App Switcher"
            className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 transition shrink-0 border border-slate-200/60 dark:border-zinc-800"
            title="App Switcher"
          >
            <Grid3x3 size={18} />
          </button>

          {appsOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl p-1.5 z-50 flex flex-col gap-0.5 shadow-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
              <a
                href="/jobs"
                onClick={() => setAppsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <Home size={14} className="text-blue-500 shrink-0" />
                <span>Between Jobs</span>
              </a>
              <a
                href="/dashboard"
                onClick={() => setAppsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <LayoutDashboard size={14} className="text-slate-400 shrink-0" />
                <span>Between Recruiter</span>
              </a>
              <a
                href="/developer"
                onClick={() => setAppsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <Bot size={14} className="text-slate-400 shrink-0" />
                <span>Between Developer</span>
              </a>
              <a
                href="/support"
                onClick={() => setAppsOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition border-t border-slate-200 dark:border-zinc-800 mt-1 pt-2"
              >
                <HelpCircle size={14} className="text-slate-400 shrink-0" />
                <span>Support & Appeals</span>
              </a>
            </div>
          )}
        </div>

        <motion.button 
          className="sign-in-btn"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSignIn}
        >
          {isLoggedIn ? 'Dashboard' : 'Sign In'}
          <svg className="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </motion.button>
      </div>
    </motion.nav>
  );
};

export default Navbar;
