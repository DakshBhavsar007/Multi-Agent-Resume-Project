"use client";
import React, { useState, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, PlayCircle, Code, Target, X, CheckCircle, ShieldCheck, Sparkles, Cpu, ArrowRight } from 'lucide-react';
import './DetailedShowcase.css';

const apiImg = '/assets/developer-api.png';

const SimulatedDashboard = () => {
  const candidates = [
    { 
      name: "Marcus Aurelius", 
      role: "Lead Fullstack Developer", 
      score: "98", 
      color: "#059669", 
      skills: ["React", "Go", "AWS", "NLP"],
      initials: "MA"
    },
    { 
      name: "Sophia Chen", 
      role: "Senior AI Engineer", 
      score: "95", 
      color: "#3b82f6", 
      skills: ["Python", "PyTorch", "Rust"],
      initials: "SC"
    },
    { 
      name: "David Kim", 
      role: "Backend Architect", 
      score: "92", 
      color: "#8b5cf6", 
      skills: ["Java", "Kubernetes", "Redis"],
      initials: "DK"
    },
    { 
      name: "Elena Rodriguez", 
      role: "Data Scientist", 
      score: "89", 
      color: "#059669", 
      skills: ["R", "Tableau", "SQL"],
      initials: "ER"
    },
  ];

  return (
    <div className="simulated-dashboard">
      <div className="dash-top-nav">
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f' }} />
        </div>
        <div className="dash-search" />
      </div>
      <div className="candidate-list">
        {candidates.map((c, j) => (
          <motion.div 
            key={j} 
            className="candidate-item"
            animate={{ 
              y: [0, -80],
              opacity: [1, 1, 1, 0]
            }}
            transition={{ 
              duration: 5, 
              repeat: Infinity, 
              delay: j * 1,
              ease: "linear"
            }}
            whileHover={{ 
              scale: 1.02, 
              borderColor: c.color,
              boxShadow: `0 8px 24px ${c.color}15`,
              transition: { duration: 0.2 }
            }}
          >
            <div className="avatar-circle" style={{ border: `2px solid ${c.color}30` }}>
              {c.initials}
            </div>
            <div className="candidate-info">
              <h4>{c.name}</h4>
              <p>{c.role}</p>
              <div className="skill-tags">
                {c.skills.map((s, si) => (
                  <span key={si} className="skill">{s}</span>
                ))}
              </div>
            </div>
            <div className="score-cell">
              <div className="score-val" style={{ color: c.color }}>{c.score}%</div>
              <div className="score-label">Match</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const DetailedShowcase = () => {
  const navigate = useNavigate();
  const [showDemoModal, setShowDemoModal] = useState(false);
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  const x = useTransform(scrollYProgress, [0, 0.45, 0.55, 1], ["0vw", "0vw", "-100vw", "-100vw"]);
  const opacity1 = useTransform(scrollYProgress, [0, 0.4, 0.5], [1, 1, 0]);
  const opacity2 = useTransform(scrollYProgress, [0.5, 0.6, 1], [0, 1, 1]);

  const handleTryDashboard = () => {
    if (localStorage.getItem("vish_jwt")) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <>
      <div className="showcase-horizontal-wrapper" ref={containerRef}>
        <div className="sticky-container">
          <motion.div className="horizontal-track" style={{ x }}>
            <div className="showcase-slide">
              <motion.div className="showcase-section-inner" style={{ opacity: opacity1 }}>
                <div className="showcase-content">
                  <span className="showcase-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Code size={14} /> Developers
                  </span>
                  <h2 className="showcase-title">Connect screening to your systems.</h2>
                  <p className="showcase-desc">
                    Our API handles resume analysis and candidate ranking. Build recruitment workflows that fit your stack without the overhead.
                  </p>
                  <div className="showcase-actions">
                    <button className="btn btn-secondary" onClick={() => navigate('/developer/portal/docs')}>Explore API Docs</button>
                    <button className="nav-link" style={{ fontSize: '15px' }} onClick={() => navigate('/developer/portal/docs')}>
                      View Endpoints <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="showcase-visual">
                  <div className="dotted-grid" />
                  <motion.div 
                    className="visual-card"
                    whileHover={{ scale: 1.02, rotate: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <img src={apiImg} alt="API Documentation" className="api-frame" />
                  </motion.div>
                </div>
              </motion.div>
            </div>

            <div className="showcase-slide">
              <motion.div className="showcase-section-inner reverse" style={{ opacity: opacity2 }}>
                <div className="showcase-content">
                  <span className="showcase-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={14} /> Dashboard
                  </span>
                  <h2 className="showcase-title">See your candidates at a glance.</h2>
                  <p className="showcase-desc">
                    Upload resumes, watch the AI rank them, then manage your best matches. Full transparency for your hiring pipeline.
                  </p>
                  <div className="showcase-actions">
                    <button className="btn btn-primary" style={{ gap: '10px' }} onClick={() => setShowDemoModal(true)}>
                      <PlayCircle size={18} /> Watch Demo
                    </button>
                    <button className="btn btn-secondary" onClick={handleTryDashboard}>Try Dashboard</button>
                  </div>
                </div>

                <div className="showcase-visual">
                  <div className="dotted-grid" />
                  <motion.div 
                    className="visual-card"
                    whileHover={{ scale: 1.02, rotate: -1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <SimulatedDashboard />
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Interactive Watch Demo Modal */}
      <AnimatePresence>
        {showDemoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full p-6 text-gray-900 dark:text-white shadow-2xl relative"
            >
              <button 
                onClick={() => setShowDemoModal(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-blue-500/20">
                  <Sparkles size={13} /> Live Screening Simulation
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-display">Between Multi-Agent AI Screening</h3>
              <p className="text-gray-600 dark:text-zinc-400 text-xs mb-6">
                Watch how specialized AI agents ingest resumes, perform semantic matching, and rank candidates in real-time.
              </p>

              {/* Demo Animation Board */}
              <div className="bg-gray-50 dark:bg-zinc-900/90 rounded-xl p-5 border border-gray-200 dark:border-zinc-800 space-y-4 mb-6">
                <div className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-zinc-800/60 border border-gray-200 dark:border-zinc-700/50 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                      SC
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900 dark:text-white">Sophia Chen</div>
                      <div className="text-xs text-gray-500 dark:text-zinc-400">Senior AI Engineer · 5 yrs exp</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-600 dark:text-emerald-400 font-extrabold text-lg">95%</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium">ATS Match</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <ShieldCheck size={16} className="text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
                    <div className="text-[11px] font-semibold text-gray-900 dark:text-white">Legitimacy</div>
                    <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">100 / 100</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <Sparkles size={16} className="text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                    <div className="text-[11px] font-semibold text-gray-900 dark:text-white">Skill Match</div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">Python, PyTorch</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 shadow-sm">
                    <Cpu size={16} className="text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                    <div className="text-[11px] font-semibold text-gray-900 dark:text-white">AI Interview</div>
                    <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">Passed (4.8/5)</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button 
                  onClick={() => setShowDemoModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition"
                >
                  Close Preview
                </button>
                <button 
                  onClick={() => {
                    setShowDemoModal(false);
                    handleTryDashboard();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  Launch Recruiter Workspace <ArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DetailedShowcase;
