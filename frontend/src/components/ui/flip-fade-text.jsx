'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function FlipFadeText({
  words = [],
  text = "",
  className = "",
  interval = 2500,
  duration = 0.5,
  delay = 0,
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!words || words.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, interval);
    return () => clearInterval(timer);
  }, [words, interval]);

  if (text && (!words || words.length === 0)) {
    return (
      <motion.span
        initial={{ opacity: 0, rotateX: -90, filter: 'blur(8px)', y: 12 }}
        animate={{ opacity: 1, rotateX: 0, filter: 'blur(0px)', y: 0 }}
        transition={{ duration, delay, ease: [0.2, 0.65, 0.3, 0.9] }}
        className={`inline-block perspective-[1000px] ${className}`}
      >
        {text}
      </motion.span>
    );
  }

  const currentWord = words[index] || "";

  return (
    <span className="relative inline-flex overflow-hidden perspective-[1000px] align-baseline">
      <AnimatePresence mode="wait">
        <motion.span
          key={currentWord}
          initial={{ opacity: 0, rotateX: -90, filter: 'blur(6px)', y: 16 }}
          animate={{ opacity: 1, rotateX: 0, filter: 'blur(0px)', y: 0 }}
          exit={{ opacity: 0, rotateX: 90, filter: 'blur(6px)', y:-16 }}
          transition={{ duration, ease: [0.21, 0.45, 0.32, 0.9] }}
          className={`inline-block transform-gpu origin-center ${className}`}
        >
          {currentWord}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default FlipFadeText;
