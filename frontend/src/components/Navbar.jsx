import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import './Navbar.css';
import logoWhite from '../assets/logo_white.png';

const Logo = () => (
  <svg width="32" height="32" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logo-grad-nav" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#38bdf8" />
        <stop offset="100%" stopColor="#2563eb" />
      </linearGradient>
    </defs>
    <line x1="32" y1="68" x2="68" y2="32" stroke="url(#logo-grad-nav)" strokeWidth="12" strokeLinecap="round" />
    <circle cx="32" cy="68" r="16" fill="#38bdf8" />
    <circle cx="68" cy="32" r="24" fill="#2563eb" />
  </svg>
);

const Navbar = ({ onSignIn, isLoggedIn }) => {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    return scrollY.onChange((latest) => {
      setScrolled(latest > 50);
    });
  }, [scrollY]);

  return (
    <motion.nav 
      className={`navbar ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.21, 0.45, 0.32, 0.9] }}
    >
      <Link to="/" className="nav-left relative flex shrink-0 items-center w-64 h-16 overflow-hidden no-underline text-inherit cursor-pointer">
        <img src={logoWhite} alt="Between Logo" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[260px] w-auto max-w-none object-contain pointer-events-none" />
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
          return (
            <motion.a 
              key={item}
              href={`/#${item.toLowerCase()}`} 
              className="nav-link"
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              {item}
              {item === 'Product' && (
                <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              )}
            </motion.a>
          );
        })}
      </div>

      <div className="nav-right">
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
