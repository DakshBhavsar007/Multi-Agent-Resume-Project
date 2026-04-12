"use client";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import './HowItWorks.css';

const step1Img = '/assets/step1.png';
const step2Img = '/assets/step2.png';
const step3Img = '/assets/step3.png';
const step4Img = '/assets/step4.png';

const words = ["STARTUPS", "RECRUITERS", "HR TEAMS", "DEVELOPERS"];

const FeatureCard = ({ step, index }) => {
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
      className="process-card"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.21, 0.45, 0.32, 0.9] }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
    >
      <div className="process-image-box" style={{ transform: "translateZ(50px)" }}>
        <motion.img 
          src={step.image} 
          alt={step.title} 
          className="process-image" 
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.4 }}
        />
        <motion.div 
          className="step-number-float"
          initial={{ x: -20, opacity: 0 }}
          whileInView={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.5 + index * 0.1 }}
        >
          {step.id}
        </motion.div>
      </div>
      <div style={{ transform: "translateZ(30px)" }}>
        <h3 className="process-step-title">{step.title}</h3>
        <p className="process-step-desc">{step.desc}</p>
      </div>
    </motion.div>
  );
};

const HowItWorks = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const steps = [
    {
      title: "Create Session",
      desc: "Set up a dedicated space for your job opening. Define role requirements and specific screening criteria in seconds.",
      id: "01",
      image: step1Img
    },
    {
      title: "Upload Resumes",
      desc: "Drop your PDF or Doc files. Our system handles massive batch uploads with zero friction, preserving all metadata.",
      id: "02",
      image: step2Img
    },
    {
      title: "AI Analysis",
      desc: "Vishleshan analyzes resumes against your criteria, ranking candidates by match score and skills automatically.",
      id: "03",
      image: step3Img
    },
    {
      title: "Manage Candidates",
      desc: "Shortlist the best matches, export data, or integrate directly with your existing ATS through our robust API.",
      id: "04",
      image: step4Img
    }
  ];

  return (
    <section className="process-section">
      <div className="process-header">
        <div className="scrolling-text-container">
          FOR 
          <div className="scrolling-word-wrapper">
            <AnimatePresence mode="wait">
              <motion.div
                key={words[index]}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                style={{ position: 'absolute' }}
              >
                {words[index]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <motion.h2 
          className="process-title"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.21, 0.45, 0.32, 0.9] }}
        >
          One platform. <br />Better hiring.
        </motion.h2>
        <motion.p 
          className="process-subtitle"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.2, ease: [0.21, 0.45, 0.32, 0.9] }}
        >
          From initial session, to AI analysis, to final shortlist—manage your entire screening pipeline in one place.
        </motion.p>
      </div>

      <div className="process-grid">
        {steps.map((step, i) => (
          <FeatureCard key={i} step={step} index={i} />
        ))}
      </div>
    </section>
  );
};

export default HowItWorks;
