"use client";
import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import './FeaturesList.css';

const FeatureCard = ({ feature, index }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  const backgroundGlow = useTransform(
    [mouseX, mouseY],
    ([x, y]) => `radial-gradient(450px circle at ${x}px ${y}px, ${feature.color}35, transparent 80%)`
  );

  return (
    <motion.div
      className={`feature-card ${feature.size}`}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.21, 0.45, 0.32, 0.9] }}
    >
      <motion.div className="feature-glow-overlay" style={{ background: backgroundGlow }} />
      <div className="card-top-accent" style={{ background: feature.color }} />
      <div className="feature-icon-wrapper" style={{ background: `${feature.color}15`, color: feature.color }}>
        {feature.iconSVG}
      </div>
      <div className="feature-content">
        <h3 className="feature-title">{feature.title}</h3>
        <p className="feature-description">{feature.description}</p>
      </div>
      <div className="feature-detail-badge" style={{ borderColor: `${feature.color}30`, color: feature.color }}>
        {feature.tag}
      </div>
    </motion.div>
  );
};

const FeaturesList = () => {
  const features = [
    { 
      title: "AI Resume Parsing", 
      description: "Multi-agent extraction of skills, experience, and projects with deep LLM-powered analysis.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>,
      color: "#3b82f6", tag: "CORE", size: "tall" 
    },
    { 
      title: "Rank & Match", 
      description: "Semantic scoring maps candidate skills against job requirements with configurable weights.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11c0 3.517-2.103 6.542-5.12 7.792V21l3.91-2.347A10.046 10.046 0 0 1 12 11z"/><path d="M18 11c0 3.517-2.103 6.542-5.12 7.792V21l3.91-2.347A10.046 10.046 0 0 0 18 11z"/><circle cx="12" cy="5" r="3"/></svg>,
      color: "#059669", tag: "NEW", size: "wide" 
    },
    { 
      title: "Fraud Detection", 
      description: "AI-powered scanning detects plagiarism, fake resumes, ATS keyword stuffing, and phishing job posts.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>,
      color: "#ef4444", tag: "SAFE", size: "small" 
    },
    { 
      title: "Developer API", 
      description: "Full REST API with tiered subscriptions, rate limiting, and interactive documentation.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
      color: "#1a1c1e", tag: "EXT", size: "small" 
    },
    { 
      title: "Resume Builder & Seeker Portal", 
      description: "Dedicated seeker accounts with a dynamic 7-template Resume Builder, 1/2 column layouts, domain authenticity verification, and active profile auto-sync.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
      color: "#f59e0b", tag: "PRO", size: "wide" 
    },
    { 
      title: "Smart Search & Analytics", 
      description: "Autocomplete job search with state mapping, hiring velocity dashboards, and pipeline analytics.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><path d="M16 8v5M19 11h-6"/></svg>,
      color: "#8b5cf6", tag: "DATA", size: "small" 
    }
  ];

  return (
    <section className="features-section" id="features">
      <div className="features-container">
        <div className="features-header-small">Capabilities</div>
        <h2 className="features-main-title">Built for the future of hiring.</h2>
        <div className="features-bento-grid">
          {features.map((f, i) => (
            <FeatureCard key={i} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesList;
