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
      description: "Deep extraction of technical skills and experience with surgical precision.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>,
      color: "#3b82f6", tag: "CORE", size: "tall" 
    },
    { 
      title: "Rank & Match", 
      description: "Automated ranking based on job requirements and candidate potential.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11c0 3.517-2.103 6.542-5.12 7.792V21l3.91-2.347A10.046 10.046 0 0 1 12 11z"/><path d="M18 11c0 3.517-2.103 6.542-5.12 7.792V21l3.91-2.347A10.046 10.046 0 0 0 18 11z"/><circle cx="12" cy="5" r="3"/></svg>,
      color: "#059669", tag: "NEW", size: "wide" 
    },
    { 
      title: "Developer API", 
      description: "Full control over your recruitment pipeline with our robust SDK.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
      color: "#1a1c1e", tag: "EXT", size: "small" 
    },
    { 
      title: "Fraud & Safety Audits", 
      description: "Scan resumes and job postings for plagiarism, AI-generation probability, ATS tricks, and job seeker phishing scams.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
      color: "#ef4444", tag: "SEC", size: "small" 
    },
    { 
      title: "Instant Screening", 
      description: "From upload to shortlist in milliseconds, not minutes.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
      color: "#f59e0b", tag: "PRO", size: "wide" 
    },
    { 
      title: "Smart Search & Logos", 
      description: "Find jobs via smart search autocomplete with auto-appended Indian states and upload custom company logos.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><path d="M16 8v5M19 11h-6"/></svg>,
      color: "#ec4899", tag: "UX", size: "small" 
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
