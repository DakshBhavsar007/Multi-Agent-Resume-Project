"use client";
import React from 'react';
import { motion } from 'framer-motion';
import './LogoCloud.css';

const CompanyLogo = ({ name, icon }) => (
  <div className="logo-item-wrapper">
    <div className="logo-symbol">{icon}</div>
    <span className="logo-name">{name}</span>
  </div>
);

const companies = [
  { name: "Unity", icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z"/></svg> },
  { name: "Tera AI", icon: <circle cx="10" cy="10" r="8" fill="currentColor" stroke="none" /> },
  { name: "Capsule", icon: <rect width="20" height="10" rx="5" fill="currentColor" /> },
  { name: "Caine", icon: <path d="M2 12h20M12 2v20" stroke="currentColor" strokeWidth="2" /> },
  { name: "Dandelion", icon: <path d="M12 2l2 7h7l-5.5 4 2 7-5.5-4-5.5 4 2-7-5.5-4h7l2-7z" fill="currentColor" /> }
];

const institutes = [
  { name: "BioSpark", icon: <circle cx="10" cy="10" r="10" stroke="currentColor" strokeWidth="2" fill="none"/> },
  { name: "K & B", icon: <rect x="2" y="2" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none"/> },
  { name: "LBH Han", icon: <rect x="5" y="5" width="14" height="14" fill="currentColor" /> },
  { name: "BioSpark", icon: <circle cx="10" cy="10" r="10" stroke="currentColor" strokeWidth="2" fill="none"/> }
];

const MarqueeRow = ({ items, direction = "left", speed = 60 }) => {
  return (
    <div className="marquee-container">
      <motion.div 
        className="marquee-content"
        animate={{ 
          x: direction === "left" ? ["0%", "-50%"] : ["-50%", "0%"]
        }}
        transition={{ 
          duration: speed, 
          repeat: Infinity, 
          ease: "linear",
          initial: { x: direction === "left" ? "-25%" : "-25%" } // Start offset
        }}
        style={{ x: "-25%" }} // Initial static offset to prevent "empty start"
      >
        {[...items, ...items, ...items, ...items].map((item, i) => (
          <CompanyLogo key={i} name={item.name} icon={item.icon} />
        ))}
      </motion.div>
    </div>
  );
};

const LogoCloud = () => {
  return (
    <section className="logo-cloud-section">
      <div className="logo-cloud-container">
        <motion.p 
          className="logo-cloud-title"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Preferred by engineers and scientists at leading startups and public companies.
        </motion.p>
        
        <MarqueeRow items={companies} direction="left" speed={40} />
        
        <div className="marquee-spacer" />
        
        <motion.p 
          className="logo-cloud-title"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          Trusted by top patent practices worldwide.
        </motion.p>
        
        <MarqueeRow items={institutes} direction="right" speed={50} />
      </div>
    </section>
  );
};

export default LogoCloud;
