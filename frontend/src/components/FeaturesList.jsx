"use client";
import React, { useState, useEffect, useRef, useId } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { X, ExternalLink, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOutsideClick } from '../hooks/use-outside-click';
import './FeaturesList.css';

const FeatureCard = ({ feature, index, onClick }) => {
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
      className={`feature-card ${feature.size} cursor-pointer group`}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.21, 0.45, 0.32, 0.9] }}
      whileHover={{ y: -4 }}
    >
      <motion.div className="feature-glow-overlay" style={{ background: backgroundGlow }} />
      <div className="card-top-accent" style={{ background: feature.color }} />
      <div className="feature-icon-wrapper" style={{ background: `${feature.color}15`, color: feature.color }}>
        {feature.iconSVG}
      </div>
      <div className="feature-content">
        <h3 className="feature-title">{feature.title}</h3>
        <p className="feature-description">{feature.description}</p>
        
        <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: feature.color }}>
          <span>Click to view capabilities</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
        </div>
      </div>
      <div className="feature-detail-badge" style={{ borderColor: `${feature.color}40`, color: feature.color, background: `${feature.color}10` }}>
        {feature.tag}
      </div>
    </motion.div>
  );
};

const FeaturesList = () => {
  const [active, setActive] = useState(null);
  const modalRef = useRef(null);

  useOutsideClick(modalRef, () => setActive(null));

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setActive(null);
      }
    }
    if (active) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active]);

  const features = [
    { 
      id: "ai-resume-parsing",
      title: "AI Resume Parsing", 
      description: "Multi-agent extraction of skills, experience, and projects with deep LLM-powered analysis.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="15" x2="23" y2="15"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="15" x2="4" y2="15"/></svg>,
      color: "#2563eb", tag: "CORE AI", size: "wide",
      link: "/jobs/register",
      details: (
        <div className="space-y-4">
          <p className="text-sm font-medium leading-relaxed text-charcoal dark:text-gray-200">
            Our multi-agent resume engine automatically parses PDF, DOCX, and TXT files. It extracts candidate names, contact details, work histories, normalized skill taxonomies, and headline summaries in milliseconds.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <span className="font-extrabold text-blue-600 dark:text-blue-400 block text-xs mb-1">Parsing Speed</span>
              <span className="text-xs font-semibold text-charcoal dark:text-gray-200">Sub-second AI response</span>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block text-xs mb-1">Skill Extraction</span>
              <span className="text-xs font-semibold text-charcoal dark:text-gray-200">98.4% taxonomy precision</span>
            </div>
          </div>
          <ul className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-500 shrink-0" /> Auto-populates registration & profile fields upon upload</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-500 shrink-0" /> Normalizes custom skill synonyms to standard canonical terms</li>
            <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-blue-500 shrink-0" /> Generates structured JSON schema for instant ATS indexing</li>
          </ul>
        </div>
      )
    },
    { 
      id: "developer-api",
      title: "Developer API", 
      description: "Full REST API with tiered subscriptions, rate limiting, and interactive documentation.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>,
      color: "#8b5cf6", tag: "API & DEV", size: "small",
      link: "/developer/portal",
      details: (
        <div className="space-y-4">
          <p className="text-sm font-medium leading-relaxed text-charcoal dark:text-gray-200">
            Integrate our multi-agent AI resume parser and candidate ranking endpoints directly into your career site, ATS software, or internal recruitment pipeline.
          </p>
          <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs font-mono text-purple-700 dark:text-purple-300">
            POST /api/v1/parse -H "X-API-Key: vish_pub_xxx"
          </div>
        </div>
      )
    },
    { 
      id: "rank-match",
      title: "Rank & Match", 
      description: "Semantic scoring maps candidate skills against job requirements with configurable weights.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 11c0 3.517-2.103 6.542-5.12 7.792V21l3.91-2.347A10.046 10.046 0 0 1 12 11z"/><path d="M18 11c0 3.517-2.103 6.542-5.12 7.792V21l3.91-2.347A10.046 10.046 0 0 0 18 11z"/><circle cx="12" cy="5" r="3"/></svg>,
      color: "#10b981", tag: "MATCHING", size: "small",
      link: "/jobs/search",
      details: (
        <div className="space-y-4">
          <p className="text-sm font-medium leading-relaxed text-charcoal dark:text-gray-200">
            Eliminate manual resume screening with weighted semantic matching. Recruiters set custom weights for mandatory skills, experience years, and compensation ranges to instantly rank applicants.
          </p>
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs space-y-1.5 font-medium text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-1.5"><CheckCircle2 size={13} className="shrink-0" /><span>Configurable weighting matrix (Technical skills vs Experience)</span></div>
            <div className="flex items-center gap-1.5"><CheckCircle2 size={13} className="shrink-0" /><span>Real-time score calculation out of 100</span></div>
            <div className="flex items-center gap-1.5"><CheckCircle2 size={13} className="shrink-0" /><span>Automated candidate shortlist recommendations</span></div>
          </div>
        </div>
      )
    },
    { 
      id: "resume-builder",
      title: "Resume Builder & Seeker Portal", 
      description: "Dedicated seeker accounts with a dynamic 7-template Resume Builder, 1/2 column layouts, domain authenticity verification, and active profile auto-sync.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
      color: "#f59e0b", tag: "PRO BUILDER", size: "wide",
      link: "/jobs/resume-builder",
      details: (
        <div className="space-y-4">
          <p className="text-sm font-medium leading-relaxed text-charcoal dark:text-gray-200">
            Create publication-ready resumes with 7 modern executive templates, custom section ordering, real-time ATS scoring, font styling, and 1-click high-resolution PDF download.
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 font-bold text-amber-800 dark:text-amber-300">7 Executive Templates</div>
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 font-bold text-amber-800 dark:text-amber-300">Live ATS Verification</div>
          </div>
        </div>
      )
    },
    { 
      id: "smart-analytics",
      title: "Smart Search & Analytics", 
      description: "Autocomplete job search with state mapping, hiring velocity dashboards, and pipeline analytics.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><path d="M16 8v5M19 11h-6"/></svg>,
      color: "#06b6d4", tag: "DATA", size: "wide",
      link: "/jobs/trends",
      details: (
        <div className="space-y-4">
          <p className="text-sm font-medium leading-relaxed text-charcoal dark:text-gray-200">
            Track industry compensation benchmarks, high-demand technical skills, regional hiring hubs, and company response velocity in real time.
          </p>
        </div>
      )
    },
    { 
      id: "keystroke-security",
      title: "Keystroke Telemetry & Security", 
      description: "Anti-fraud keystroke dynamics, domain verification, and background integrity protection.", 
      iconSVG: <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
      color: "#ec4899", tag: "SECURITY", size: "small",
      link: "/support",
      details: (
        <div className="space-y-4">
          <p className="text-sm font-medium leading-relaxed text-charcoal dark:text-gray-200">
            Continuous biometric typing verification and domain validation protect against impersonation and fraudulent application spam.
          </p>
          <div className="p-3.5 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-xs space-y-1.5 font-medium text-pink-800 dark:text-pink-300">
            <div className="flex items-center gap-1.5"><CheckCircle2 size={13} className="shrink-0" /><span>Real-time keystroke dynamics profiling</span></div>
            <div className="flex items-center gap-1.5"><CheckCircle2 size={13} className="shrink-0" /><span>Automated domain authenticity verification</span></div>
          </div>
        </div>
      )
    }
  ];

  return (
    <section className="features-section" id="features">
      <div className="features-container">
        <div className="features-header-small">Capabilities</div>
        <h2 className="features-main-title">Built for the future of hiring.</h2>

        <div className="features-bento-grid">
          {features.map((f, i) => (
            <FeatureCard key={f.id || i} feature={f} index={i} onClick={() => setActive(f)} />
          ))}
        </div>
      </div>

      {/* Expandable Modal Overlay */}
      <AnimatePresence>
        {active && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm h-full w-full z-[10000]"
            />
            <div className="fixed inset-0 top-10 md:top-16 grid place-items-center z-[10001] p-4 overflow-y-auto">
              <motion.div
                ref={modalRef}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-xl bg-white dark:bg-[#141417] text-charcoal dark:text-gray-100 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden relative"
              >
                {/* Modal Header */}
                <div 
                  className="p-6 md:p-8 relative overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, ${active.color}20 0%, ${active.color}05 100%)`
                  }}
                >
                  <button
                    onClick={() => setActive(null)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/80 dark:bg-black/50 text-gray-500 hover:text-charcoal dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>

                  <div className="flex items-center gap-4">
                    <div 
                      className="p-4 rounded-2xl shadow-md border border-white/20 dark:border-white/10 shrink-0"
                      style={{ background: `${active.color}20`, color: active.color }}
                    >
                      {active.iconSVG}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase border bg-white/80 dark:bg-black/60"
                          style={{ borderColor: active.color, color: active.color }}
                        >
                          {active.tag}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-xl md:text-2xl text-charcoal dark:text-white mt-1">
                        {active.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {active.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Modal Body Content */}
                <div className="p-6 md:p-8 space-y-6">
                  {active.details}

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setActive(null)}
                      className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer"
                    >
                      Close
                    </button>
                    {active.link && (
                      <Link
                        to={active.link}
                        onClick={() => setActive(null)}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold text-white transition-all flex items-center gap-2 shadow-md hover:opacity-90 cursor-pointer"
                        style={{ background: active.color }}
                      >
                        <span>Explore Feature</span>
                        <ExternalLink size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </section>
  );
};

export default FeaturesList;
