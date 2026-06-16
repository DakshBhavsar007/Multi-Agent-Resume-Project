"use client";
import React from 'react';
import { motion } from 'framer-motion';
import './FinalCTA.css';

const FinalCTA = ({ onStart, isLoggedIn }) => {
  return (
    <section className="final-cta-section">
      <motion.div 
        className="cta-energy-blob"
        animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="cta-container">
        <motion.h2 
          className="cta-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.21, 0.45, 0.32, 0.9] }}
        >
          Start screening today
        </motion.h2>
        
        <motion.p 
          className="cta-subtitle"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          No credit card required. Build your first session in minutes and let our AI do the heavy lifting.
        </motion.p>

        <motion.div 
          className="cta-actions"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <motion.button 
            className="btn-cta-primary"
            whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(59, 130, 246, 0.6)" }}
            whileTap={{ scale: 0.95 }}
            onClick={onStart}
          >
            {isLoggedIn ? "Go to Dashboard" : "Sign up for free"}
          </motion.button>
          <motion.button 
            className="btn-cta-secondary"
            whileHover={{ background: "rgba(255,255,255,0.05)" }}
          >
            Contact Sales
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};

export default FinalCTA;
