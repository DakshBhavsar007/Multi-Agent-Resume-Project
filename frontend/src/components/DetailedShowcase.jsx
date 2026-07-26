import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code, ChevronRight, Target, PlayCircle } from 'lucide-react';
import apiImg from '../assets/developer-api.png';
import dashboardImg from '../assets/spot-dashboard.png';
import './DetailedShowcase.css';

const DetailedShowcase = () => {
  const navigate = useNavigate();

  return (
    <section className="showcase-section-wrapper" id="detailed-showcase">
      <div className="showcase-container">
        {/* Slide 1: Developers */}
        <div className="showcase-block">
          <div className="showcase-content">
            <span className="showcase-label">
              <Code size={14} /> Developers
            </span>
            <h2 className="showcase-title">Connect screening to your systems.</h2>
            <p className="showcase-desc">
              Our API handles resume analysis and candidate ranking. Build recruitment workflows that fit your stack without the overhead.
            </p>
            <div className="showcase-actions">
              <button className="btn btn-secondary cursor-pointer" onClick={() => navigate('/developer')}>Explore API Docs</button>
              <button className="nav-link cursor-pointer" style={{ fontSize: '15px' }} onClick={() => navigate('/developer/portal/docs')}>
                View Endpoints <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="showcase-visual">
            <div className="dotted-grid" />
            <motion.div 
              className="visual-card"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <img src={apiImg} alt="API Documentation" className="api-frame" loading="lazy" />
            </motion.div>
          </div>
        </div>

        {/* Slide 2: Dashboard */}
        <div className="showcase-block reverse">
          <div className="showcase-content">
            <span className="showcase-label">
              <Target size={14} /> Dashboard
            </span>
            <h2 className="showcase-title">See your candidates at a glance.</h2>
            <p className="showcase-desc">
              Upload resumes, watch the AI rank them, then manage your best matches. Full transparency for your hiring pipeline.
            </p>
            <div className="showcase-actions">
              <button className="btn btn-primary cursor-pointer" style={{ gap: '10px' }} onClick={() => navigate('/jobs/companies')}>
                <PlayCircle size={18} /> Get Started
              </button>
              <button className="btn btn-secondary cursor-pointer" onClick={() => navigate('/jobs/search')}>Try Search</button>
            </div>
          </div>

          <div className="showcase-visual">
            <div className="dotted-grid" />
            <motion.div 
              className="visual-card"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <img src={dashboardImg} alt="Platform Dashboard" className="api-frame" loading="lazy" />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DetailedShowcase;
