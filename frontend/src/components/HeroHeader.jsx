"use client";
import React, { useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import FlipFadeText from './ui/flip-fade-text';
import './HeroHeader.css';

const heroImg = '/assets/hero-image.webp';

const HeroHeader = ({ onStart, isLoggedIn }) => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const btnPrimaryRef = useRef(null);
  const btnSecondaryRef = useRef(null);
  const btnDeveloperRef = useRef(null);

  useEffect(() => {
    const handleMagnetic = (e) => {
      const { clientX, clientY, currentTarget } = e;
      const { left, top, width, height } = currentTarget.getBoundingClientRect();
      const x = clientX - (left + width / 2);
      const y = clientY - (top + height / 2);
      
      gsap.to(currentTarget, {
        x: x * 0.25,
        y: y * 0.25,
        duration: 0.35,
        ease: "power2.out"
      });
    };

    const resetMagnetic = (e) => {
      gsap.to(e.currentTarget, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: "elastic.out(1.1, 0.4)"
      });
    };

    const b1 = btnPrimaryRef.current;
    const b2 = btnSecondaryRef.current;
    const b3 = btnDeveloperRef.current;

    if (b1) {
      b1.addEventListener('mousemove', handleMagnetic);
      b1.addEventListener('mouseleave', resetMagnetic);
    }
    if (b2) {
      b2.addEventListener('mousemove', handleMagnetic);
      b2.addEventListener('mouseleave', resetMagnetic);
    }
    if (b3) {
      b3.addEventListener('mousemove', handleMagnetic);
      b3.addEventListener('mouseleave', resetMagnetic);
    }

    return () => {
      if (b1) {
        b1.removeEventListener('mousemove', handleMagnetic);
        b1.removeEventListener('mouseleave', resetMagnetic);
      }
      if (b2) {
        b2.removeEventListener('mousemove', handleMagnetic);
        b2.removeEventListener('mouseleave', resetMagnetic);
      }
      if (b3) {
        b3.removeEventListener('mousemove', handleMagnetic);
        b3.removeEventListener('mouseleave', resetMagnetic);
      }
    };
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  
  const scale = useTransform(smoothProgress, [0, 1], [1, 1.05]);
  const rotateX = useTransform(smoothProgress, [0, 1], [0, 5]);

  const titleText = "Screen resumes with artificial intelligence.";
  const words = titleText.split(" ");

  return (
    <motion.section 
      ref={containerRef}
      className="hero-container relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <video
        className="absolute inset-0 z-0 h-full w-full object-cover pointer-events-none opacity-95 dark:opacity-70"
        style={{ filter: 'blur(2px) saturate(1.06)', transform: 'scale(1.06)' }}
        src="https://zxdefgavgwfxastwmmjm.supabase.co/storage/v1/object/public/assets/flux.mp4"
        autoPlay
        muted
        loop
        playsInline
        onCanPlay={(e) => e.target.play().catch(() => {})}
      />
      <div
        aria-hidden
        className="hero-scrim"
      />
      <div className="relative z-10 flex flex-col items-center w-full px-6">
        <motion.div 
          className="badge-wrapper"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="badge-border-glow">
            <svg width="100%" height="100%" viewBox="0 0 200 40" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
              <rect x="1" y="1" width="198" height="38" rx="19" fill="none" stroke="white" strokeWidth="0.5" opacity="0.2"/>
              <motion.rect
                x="1" y="1" width="198" height="38" rx="19"
                fill="none" stroke="url(#badge-gradient)" strokeWidth="2.5" strokeDasharray="60 140"
                animate={{ strokeDashoffset: [0, -200] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                style={{ filter: 'drop-shadow(0 0 8px #3b82f6)' }}
              />
              <defs>
                <linearGradient id="badge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" /><stop offset="50%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#3b82f6" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="badge">
            <span className="badge-tag">NEW</span>
            <span className="badge-text">Between 1.0 is live</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
          </div>
        </motion.div>

        <motion.h1 className="hero-title flex flex-wrap items-center justify-center gap-x-[0.25em]">
          <span>Screen resumes with</span>
          <FlipFadeText
            words={["artificial intelligence.", "surgical precision.", "multi-agent scoring.", "instant verification."]}
            className="text-blue-600 dark:text-blue-400 font-bold"
          />
        </motion.h1>

        <motion.p 
          className="hero-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
        >
          Build recruitment workflows that work. Automate screening, detect fraud, and rank candidates with surgical precision — powered by 7 specialized AI agents.
        </motion.p>

        <div className="hero-actions">
          <motion.button 
            ref={btnDeveloperRef}
            className="btn btn-secondary" 
            whileHover={{ y: -2 }}
            onClick={() => navigate('/developer')}
          >
            Developer Portal
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}><path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/></svg>
          </motion.button>
          <motion.button 
            ref={btnPrimaryRef}
            className="btn btn-primary"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onStart}
          >
            {isLoggedIn ? "Go to Dashboard" : "Start for Free"} 
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </motion.button>
        </div>
      </div>
    </motion.section>
  );
};

export default HeroHeader;
