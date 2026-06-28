"use client";
import React from 'react';
import { motion } from 'framer-motion';
import './Footer.css';
import logoWhite from '../assets/logo_white.png';
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
    "For Developers": "/developer",
    "Board": "/dashboard",
    "Pricing": "/#pricing",
    "Sign In": "/login",
    "Careers": "/jobs",
    "About": "/about",
    "Documentation": "/developer",
    "API Reference": "/developer",
    "Terms of Service": "/terms",
    "Privacy Policy": "/terms",
    "Refund Policy": "/refund-policy"
  };

  const getLinkUrl = (name) => {
    return linkUrls[name] || "/#";
  };

  const socialLinks = [
    { href: "#", ariaLabel: "LinkedIn", tooltip: "LinkedIn", color: "#0A66C2" },
    { href: "#", ariaLabel: "Twitter", tooltip: "Twitter", color: "#000000" },
    { href: "#", ariaLabel: "Instagram", tooltip: "Instagram", color: "#E1306C" },
    { href: "#", ariaLabel: "Facebook", tooltip: "Facebook", color: "#3B5998" },
    { href: "#", ariaLabel: "Telegram", tooltip: "Telegram", color: "#0088CC" }
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
          <div className="footer-logo-wrapper relative flex shrink-0 items-center w-64 h-16 overflow-hidden">
            <img src={logoWhite} alt="Between Logo" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[260px] w-auto max-w-none object-contain pointer-events-none" />
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px', maxWidth: '240px', lineHeight: '1.6' }}>
            The next generation of AI-driven recruitment screening.
          </p>
        </motion.div>

        {[
          { title: "Product", links: ["For Developers", "Board", "Pricing", "Sign In"] },
          { title: "Company", links: ["About", "Careers"] },
          { title: "Resources", links: ["Documentation", "API Reference"] },
          { title: "Legal", links: ["Terms of Service", "Privacy Policy", "Refund Policy"] }
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
