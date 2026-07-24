"use client";
import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Quote, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { publicAPI } from '../lib/api';
import VerifiedBadge from './VerifiedBadge';
import './Testimonials.css';



const TestimonialCard = ({ t, index, timeAgo }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const ratingStars = t.rating || 5;

  const AvatarEl = () => (
    t.avatarPath ? (
      <img src={t.avatarPath} alt={t.author} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.1)' }} />
    ) : (
      <div className="author-avatar" style={{ color: t.color || "#3b82f6" }}>
        {t.initials}
      </div>
    )
  );

  return (
    <motion.div 
      className={`testimonial-card-wrapper size-${t.size || 'medium'}`}
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
    >
      <motion.div 
        className="testimonial-card"
        style={{ rotateX, rotateY }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div className="quote-icon-bg">
          <Quote size={80} opacity={0.05} />
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <div style={{ display: 'flex', gap: '4px' }}>
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={14} fill={i < ratingStars ? (t.color || "#f59e0b") : "transparent"} color={t.color || "#f59e0b"} opacity={i < ratingStars ? 0.9 : 0.2} />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {t.createdAt && timeAgo && (
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>
                {timeAgo(t.createdAt)}
              </span>
            )}
            {t.targetBadge && (
              <span style={{ fontSize: '10px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(96, 165, 250, 0.3)' }}>
                {t.targetBadge}
              </span>
            )}
          </div>
        </div>

        <p className="testimonial-quote">"{t.quote}"</p>
        
        <div className="testimonial-author">
          {t.authorId ? (
            <Link to={`/jobs/profile/${t.authorId}`} className="flex items-center gap-3 group hover:opacity-85 transition-opacity no-underline text-inherit">
              <AvatarEl />
              <div className="author-info">
                <h4 className="flex items-center gap-1 font-bold">
                  {t.author}
                  {t.isVerified && <VerifiedBadge size={14} />}
                </h4>
                <p>{t.role}</p>
                {t.roleBadge && (
                  <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '1px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', marginTop: '4px', display: 'inline-block' }}>
                    {t.roleBadge}
                  </span>
                )}
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <AvatarEl />
              <div className="author-info">
                <h4 className="flex items-center gap-1 font-bold">
                  {t.author}
                  {t.isVerified && <VerifiedBadge size={14} />}
                </h4>
                <p>{t.role}</p>
                {t.roleBadge && (
                  <span style={{ fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '1px 6px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', marginTop: '4px', display: 'inline-block' }}>
                    {t.roleBadge}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};


const Testimonials = () => {
  const [items, setItems] = useState([]);
  const [filterTab, setFilterTab] = useState("all");
  const [companyNames, setCompanyNames] = useState([]);

  useEffect(() => {
    publicAPI.listReviews()
      .then((data) => {
        if (data.reviews && data.reviews.length > 0) {
          const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];
          const sizes = ["large", "small", "medium", "medium", "large", "small"];
          const mapped = data.reviews.map((r, idx) => ({
            id: r.id,
            quote: r.text,
            author: r.author?.full_name || "Verified Professional",
            authorId: r.author?.user_type === "job_seeker" ? r.author?.id : null,
            avatarPath: r.author?.avatar_path || null,
            isVerified: r.author?.is_verified,
            role: r.author?.headline || (r.company_name ? `Review for ${r.company_name}` : "Verified Member"),
            roleBadge: r.author?.role_badge || (r.user_type ? r.user_type.replace('_', ' ').toUpperCase() : "MEMBER"),
            targetBadge: r.company_name ? r.company_name : "Between Platform",
            initials: r.author?.full_name?.charAt(0) || "V",
            rating: r.rating || 5,
            review_type: r.review_type,
            user_type: r.user_type,
            createdAt: r.created_at,
            color: colors[idx % colors.length],
            size: sizes[idx % sizes.length],
          }));

          setItems(mapped);
        } else {
          setItems([]);
        }
      })
      .catch((err) => console.error("Failed to load public reviews on landing page:", err));

    // Fetch real company names for the logo strip
    publicAPI.listCompanies()
      .then((data) => {
        const comps = data?.companies || (Array.isArray(data) ? data : []);
        if (comps.length > 0) {
          setCompanyNames(comps.slice(0, 6).map(c => c.name?.toUpperCase() || ""));
        }
      })
      .catch(() => {});
  }, []);

  const filteredItems = items.filter(t => {
    if (filterTab === "platform") return t.review_type === "platform" || !t.review_type;
    if (filterTab === "company") return t.review_type === "company";
    if (filterTab === "developer") return t.user_type === "developer";
    return true;
  });

  // Helper: relative time
  const timeAgo = (dateStr) => {
    if (!dateStr) return "";
    const now = new Date();
    const past = new Date(dateStr);
    const diffMs = now - past;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}mo ago`;
    return `${Math.floor(months / 12)}y ago`;
  };

  return (
    <section className="testimonials-section">
      <div className="testimonials-bg-glow" />
      
      <div className="testimonials-header">
        <motion.span 
          className="testimonials-label"
          initial={{ opacity: 0, letterSpacing: "0.5em" }}
          whileInView={{ opacity: 1, letterSpacing: "0.3em" }}
          transition={{ duration: 1 }}
        >
          Voices of Impact
        </motion.span>
        <motion.h2 
          className="testimonials-title"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.21, 0.45, 0.32, 0.9] }}
        >
          Trusted by Innovative Teams & Builders
        </motion.h2>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '20px', flexWrap: 'wrap' }}>
          {[
            { id: "all", label: "All Testimonials" },
            { id: "platform", label: "Between Platform" },
            { id: "company", label: "Company Reviews" },
            { id: "developer", label: "Developer Reviews" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                border: '1px solid rgba(255,255,255,0.15)',
                background: filterTab === tab.id ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="testimonials-grid">
        {(filteredItems.length > 0 ? filteredItems : items).map((t, i) => (
          <TestimonialCard key={t.id || i} t={t} index={i} timeAgo={timeAgo} />
        ))}
      </div>

      {companyNames.length > 0 && (
        <div className="company-logo-strip">
          {companyNames.map((name, i) => (
            <span key={i} className="company-logo">{name}</span>
          ))}
        </div>
      )}
    </section>
  );
};

export default Testimonials;

