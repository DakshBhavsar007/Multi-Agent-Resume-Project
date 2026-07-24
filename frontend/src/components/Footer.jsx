"use client";
import React from 'react';
import { motion } from 'framer-motion';
import './Footer.css';
import { SocialTooltip } from './ui/social-media';

const Footer = () => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.21, 0.45, 0.32, 0.9] }}
  };

  const linkUrls = {
    "Find Jobs": "/jobs/search",
    "Explore Companies": "/jobs/companies",
    "AI Resume Builder": "/resume-builder",
    "Hiring Safety": "/jobs/safety-checker",
    "Market Trends": "/jobs/trends",
    "AI Mock Interview": "/jobs/mock-interview",
    "Premium Plans": "/jobs/billing",
    "Developer Portal": "/developer",
    "API Documentation": "/developer/docs",
    "API Keys": "/developer/keys",
    "Webhooks": "/developer/webhooks",
    "Usage & Billing": "/developer/billing",
    "Job Seeker Portal": "/jobs",
    "Recruiter Workspace": "/login",
    "Admin Login": "/admin/login",
    "About Us": "/about",
    "Contact Support": "/contact",
    "Support & Appeals": "/support",
    "Terms of Service": "/terms",
    "Privacy Policy": "/terms",
    "Refund Policy": "/refund-policy"
  };

  const getLinkUrl = (name) => {
    return linkUrls[name] || "/#";
  };

  const socialLinks = [
    { href: "https://linkedin.com", ariaLabel: "LinkedIn", tooltip: "LinkedIn", color: "#0A66C2" },
    { href: "https://x.com", ariaLabel: "Twitter", tooltip: "Twitter", color: "#000000" },
    { href: "https://instagram.com", ariaLabel: "Instagram", tooltip: "Instagram", color: "#E1306C" },
    { href: "https://facebook.com", ariaLabel: "Facebook", tooltip: "Facebook", color: "#1877F2" },
    { href: "https://t.me", ariaLabel: "Telegram", tooltip: "Telegram", color: "#0088CC" }
  ];

  return (
    <footer className="footer">
      <motion.div 
        className="footer-main"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        <motion.div className="footer-brand" variants={itemVariants}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-display font-bold text-sm bg-[#2A2A2A] p-1 border border-white/10 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="logo-grad-footer-c" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
                <line x1="32" y1="68" x2="68" y2="32" stroke="url(#logo-grad-footer-c)" strokeWidth="14" strokeLinecap="round" />
                <circle cx="32" cy="68" r="16" fill="#38bdf8" />
                <circle cx="68" cy="32" r="24" fill="#2563eb" />
              </svg>
            </div>
            <span className="font-display text-[22px] text-white tracking-tight font-semibold">
              Between
            </span>
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', maxWidth: '240px', lineHeight: '1.6' }}>
            A calmer job search & screening platform. Built for smarter hiring.
          </p>
        </motion.div>

        {[
          { title: "Job Seekers", links: ["Find Jobs", "Explore Companies", "AI Resume Builder", "Hiring Safety", "Market Trends", "AI Mock Interview", "Premium Plans"] },
          { title: "Developers & API", links: ["Developer Portal", "API Documentation", "API Keys", "Webhooks", "Usage & Billing"] },
          { title: "Portals & Login", links: ["Job Seeker Portal", "Recruiter Workspace", "Developer Portal", "Admin Login"] },
          { title: "Company & Legal", links: ["About Us", "Contact Support", "Support & Appeals", "Terms of Service", "Privacy Policy", "Refund Policy"] }
        ].map((column, i) => (
          <motion.div key={i} className="footer-column" variants={itemVariants}>
            <h4>{column.title}</h4>
            <ul className="footer-list">
              {column.links.map((link, li) => (
                <li key={li}><a href={getLinkUrl(link)}>{link}</a></li>
              ))}
            </ul>
          </motion.div>
        ))}
      </motion.div>

      <motion.div 
        className="footer-bottom"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
      >
        <div className="footer-copyright">
          © {new Date().getFullYear()} Between AI, Inc.
        </div>
        
        <div className="social-icons-footer flex items-center gap-3">
            <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', marginRight: '8px' }}>Social</span>
            <SocialTooltip items={socialLinks} className="justify-start" />
            <div className="status-indicator" style={{ marginLeft: '40px' }}>
                <motion.div 
                    className="status-dot"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
                <span>System Status</span>
            </div>
        </div>
      </motion.div>
    </footer>
  );
};

export default Footer;
