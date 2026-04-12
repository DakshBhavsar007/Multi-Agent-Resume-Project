"use client";
import React, { useRef, useEffect } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import gsap from 'gsap';
import './HeroHeader.css';

const heroImg = '/assets/hero-image.png';

const HeroHeader = ({ onStart }) => {
  const containerRef = useRef(null);
  const btnPrimaryRef = useRef(null);
  const btnSecondaryRef = useRef(null);

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

    if (b1) {
      b1.addEventListener('mousemove', handleMagnetic);
      b1.addEventListener('mouseleave', resetMagnetic);
    }
    if (b2) {
      b2.addEventListener('mousemove', handleMagnetic);
      b2.addEventListener('mouseleave', resetMagnetic);
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
      className="hero-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
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
          <span className="badge-text">Vishleshan 1.0 is live</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      </motion.div>

      <motion.h1 className="hero-title">
        {words.map((word, i) => (
          <motion.span 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: [0.21, 0.45, 0.32, 0.9] }}
            style={{ display: 'inline-block', marginRight: '0.25em' }}
          >
            {word}
          </motion.span>
        ))}
      </motion.h1>

      <motion.p 
        className="hero-subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
      >
        Build recruitment workflows that work. Automate screening and rank candidates with surgical precision across your entire pipeline.
      </motion.p>

      <div className="hero-actions">
        <motion.button 
          ref={btnSecondaryRef}
          className="btn btn-secondary" 
          whileHover={{ x: -2 }}
        >
          For Enterprise 
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}><path d="m9 18 6-6-6-6"/></svg>
        </motion.button>
        <motion.button 
          ref={btnPrimaryRef}
          className="btn btn-primary"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
        >
          Start for Free 
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </motion.button>
      </div>

      <motion.div className="hero-image-container" style={{ scale, rotateX }}>
        <img src={heroImg} alt="Dashboard" className="hero-image" />
        <div className="hero-image-vignette" />
      </motion.div>
    </motion.section>
  );
};

export default HeroHeader;
