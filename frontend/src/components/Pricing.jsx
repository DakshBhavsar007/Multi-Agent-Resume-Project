"use client";
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import './Pricing.css';

const plans = [
  {
    name: "Starter plan",
    monthlyPrice: 0,
    yearlyPrice: 0,
    description: "Start free. Scale as you hire.",
    features: ["One active session", "Up to 100 resumes", "Basic AI screening", "Standard support"],
    cta: "Start free",
    featured: false,
    color: "#3b82f6"
  },
  {
    name: "Business plan",
    monthlyPrice: 19,
    yearlyPrice: 15,
    description: "Perfect for growing teams.",
    features: ["Five active sessions", "Up to 2,000 resumes", "Advanced matching", "API access"],
    cta: "Get started",
    featured: true,
    color: "#059669"
  },
  {
    name: "Enterprise plan",
    monthlyPrice: 49,
    yearlyPrice: 39,
    description: "Deep automation for power users.",
    features: ["Unlimited sessions", "Priority VIP support", "Custom integrations", "Advanced analytics"],
    cta: "Get started",
    featured: false,
    color: "#8b5cf6"
  }
];

const PricingCard = ({ plan, isYearly, index, onStart, isLoggedIn, userTier }) => {
  const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;

  const getPlanTierValue = (name) => {
    if (name === "Starter plan") return 0;
    if (name === "Business plan") return 1;
    if (name === "Enterprise plan") return 2;
    return 0;
  };

  const getUserTierValue = (tier) => {
    const t = (tier || "free").toLowerCase();
    if (t === "free" || t === "starter") return 0;
    if (t === "business") return 1;
    if (t === "enterprise") return 2;
    return 0;
  };

  const userVal = getUserTierValue(userTier);
  const planVal = getPlanTierValue(plan.name);

  let buttonText = plan.cta;
  if (isLoggedIn) {
    if (userVal === planVal) {
      buttonText = "Go to Dashboard";
    } else if (userVal < planVal) {
      buttonText = "Upgrade";
    }
  }

  return (
    <motion.div 
      className={`pricing-card ${plan.featured ? 'featured' : ''}`}
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.21, 0.45, 0.32, 0.9] }}
      whileHover={{ y: -10 }}
    >
      {plan.featured && (
        <motion.div 
            className="card-badge"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
        >
          Most Popular
        </motion.div>
      )}
      
      <div className="card-inner">
        <span className="plan-name">{plan.name}</span>
        
        <div className="plan-price">
          <AnimatePresence mode="wait">
            <motion.span
              key={price}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              ${price}
            </motion.span>
          </AnimatePresence>
          <span className="price-unit">/mo</span>
        </div>

        <p className="plan-desc">{plan.description}</p>
        <hr className="plan-hr" />

        <ul className="feature-list">
          {plan.features.map((feature, i) => (
            <motion.li 
                key={i} 
                className="feature-item"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: (index * 0.1) + (i * 0.05) }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '10px' }}>
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              {feature}
            </motion.li>
          ))}
        </ul>

        <motion.button 
          className="plan-btn"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
        >
          {buttonText}
        </motion.button>
      </div>
    </motion.div>
  );
};

const Pricing = ({ onStart, isLoggedIn }) => {
  const [isYearly, setIsYearly] = useState(false);
  const { tier, initFromStorage } = useAuthStore();

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  return (
    <section className="pricing-section" id="pricing">
      <div className="pricing-header">
        <motion.span className="pricing-label" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}>Plans</motion.span>
        <motion.h2 className="pricing-title" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}>Pricing</motion.h2>
      </div>

      <div className="pricing-toggle-container">
        <div className="toggle-bg" onClick={() => setIsYearly(!isYearly)}>
          <motion.div className="toggle-slider" animate={{ x: isYearly ? '100.5%' : '0%' }} />
          <div className={`toggle-option ${!isYearly ? 'active' : ''}`}>Monthly</div>
          <div className={`toggle-option ${isYearly ? 'active' : ''}`}>Yearly</div>
        </div>
        <AnimatePresence>
            {isYearly && (
            <motion.span 
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: -20 }}
                className="save-badge" 
            >
                Save 20%
            </motion.span>
            )}
        </AnimatePresence>
      </div>

      <div className="pricing-grid">
        {plans.map((plan, i) => (
          <PricingCard key={i} plan={plan} isYearly={isYearly} index={i} onStart={onStart} isLoggedIn={isLoggedIn} userTier={tier} />
        ))}
      </div>
    </section>
  );
};

export default Pricing;
