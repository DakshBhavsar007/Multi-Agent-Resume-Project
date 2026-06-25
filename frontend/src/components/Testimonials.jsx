"use client";
import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Quote, Star } from 'lucide-react';
import './Testimonials.css';

const testimonials = [
  {
    quote: "Between transformed our screening process. We reduced our time-to-hire by 60% in just one quarter. The AI accuracy is unparalleled.",
    author: "Sarah Jenkins",
    role: "Head of Talent @ TechFlow",
    initials: "SJ",
    color: "#3b82f6",
    size: "large"
  },
  {
    quote: "The developer API is a masterpiece. We integrated ranking directly in 48 hours.",
    author: "Alex Rivera",
    role: "CTO @ Solv",
    initials: "AR",
    color: "#10b981",
    size: "small"
  },
  {
    quote: "Finally, an AI tool that doesn't feel like a black box. The transparency is exactly what we needed for our scale.",
    author: "Elena Petrova",
    role: "HR Lead @ Nordics Tech",
    initials: "EP",
    color: "#f59e0b",
    size: "medium"
  },
  {
    quote: "Our recruiters focus more on people now than on paperwork. Precision is key.",
    author: "Michael Ross",
    role: "Founder @ ScaleUp Studios",
    initials: "MR",
    color: "#8b5cf6",
    size: "medium"
  },
  {
    quote: "The best ROI we've seen from any HR tool in 5 years. Innovative and fast.",
    author: "Dinesh Kumar",
    role: "VP Engineering @ CloudNexus",
    initials: "DK",
    color: "#ec4899",
    size: "large"
  },
  {
    quote: "A must-have for modern recruiters. Surgical precision for every session.",
    author: "James Chen",
    role: "Director of HR @ GlobalScale",
    initials: "JC",
    color: "#1a1c1e",
    size: "small"
  }
];

const TestimonialCard = ({ t, index }) => {
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

  return (
    <motion.div 
      className={`testimonial-card-wrapper size-${t.size}`}
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
        
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={14} fill={t.color} color={t.color} opacity={0.4} />
          ))}
        </div>

        <p className="testimonial-quote">"{t.quote}"</p>
        
        <div className="testimonial-author">
          <div className="author-avatar" style={{ color: t.color }}>
            {t.initials}
          </div>
          <div className="author-info">
            <h4>{t.author}</h4>
            <p>{t.role}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Testimonials = () => {
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
          Trusted by Innovative Teams.
        </motion.h2>
      </div>

      <div className="testimonials-grid">
        {testimonials.map((t, i) => (
          <TestimonialCard key={i} t={t} index={i} />
        ))}
      </div>

      <div className="company-logo-strip">
        <span className="company-logo">TECHFLOW</span>
        <span className="company-logo">SOLV</span>
        <span className="company-logo">GLOBALSCALE_</span>
        <span className="company-logo">NORDICS</span>
        <span className="company-logo">SCALE_UP</span>
      </div>
    </section>
  );
};

export default Testimonials;
