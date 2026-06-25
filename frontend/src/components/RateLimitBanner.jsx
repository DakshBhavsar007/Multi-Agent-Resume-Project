"use client";
import { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RateLimitBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [limitData, setLimitData] = useState(null);

  useEffect(() => {
    const handleRateLimit = (e) => {
      setLimitData(e.detail);
      setIsVisible(true);
    };
    window.addEventListener("rate-limit", handleRateLimit);
    return () => window.removeEventListener("rate-limit", handleRateLimit);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: -100 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-blue-100 border-b-2 border-[#2563EB] px-6 py-3 shadow-md flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-amber-800 shrink-0" />
            <span className="text-sm font-bold text-amber-900">
              Rate limit reached{limitData?.action ? ` for ${limitData.action}` : ''}. 
              Used {limitData?.used || 0}/{limitData?.limit || 0} API calls.
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.open('https://portal.between.indevs.in', '_blank')}
              className="bg-[#2563EB] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#1D4ED8] transition-colors shadow-sm cursor-pointer"
            >
              Upgrade Plan
            </button>
            <button onClick={() => setIsVisible(false)} className="text-amber-900/50 hover:text-amber-900 transition-colors">
              <X size={20} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
