import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

const TOUR_STORAGE_KEY_PREFIX = 'between_tour_done_';

function getElementRect(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
    el,
  };
}

function Spotlight({ target, padding = 8 }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    const update = () => {
      if (!target) { setRect(null); return; }
      setRect(getElementRect(target));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
    };
  }, [target]);

  if (!rect) return null;

  const t = rect.top - padding;
  const l = rect.left - padding;
  const w = rect.width + padding * 2;
  const h = rect.height + padding * 2;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        pointerEvents: 'none',
      }}
    >
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <mask id="spotlight-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={l}
              y={t - window.scrollY}
              width={w}
              height={h}
              rx={12}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.55)"
          mask="url(#spotlight-mask)"
        />
        {/* Glowing highlight border */}
        <rect
          x={l}
          y={t - window.scrollY}
          width={w}
          height={h}
          rx={12}
          fill="none"
          stroke="url(#tour-glow)"
          strokeWidth="2.5"
        />
        <defs>
          <linearGradient id="tour-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function TooltipBox({ step, currentIndex, total, onNext, onPrev, onClose }) {
  const [rect, setRect] = useState(null);
  const [pos, setPos] = useState({ top: '50%', left: '50%', transform: 'translate(-50%,-50%)' });
  const boxRef = useRef(null);
  const padding = 12;

  useEffect(() => {
    const update = () => {
      if (!step.target) {
        setPos({ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', position: 'fixed' });
        setRect(null);
        return;
      }
      const r = getElementRect(step.target);
      setRect(r);
      if (!r) {
        setPos({ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', position: 'fixed' });
        return;
      }

      const boxW = 340;
      const boxH = 200;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const elTop = r.top - window.scrollY;
      const elLeft = r.left;
      const elRight = r.left + r.width;
      const elBottom = elTop + r.height;

      let newPos = {};

      const place = step.placement || 'auto';

      if (place === 'bottom' || (place === 'auto' && elBottom + boxH + padding < vh)) {
        newPos = { top: Math.round(elBottom + padding), left: Math.max(8, Math.min(elLeft, vw - boxW - 8)), transform: 'none', position: 'fixed' };
      } else if (place === 'top' || (place === 'auto' && elTop - boxH - padding > 0)) {
        newPos = { top: Math.round(elTop - boxH - padding), left: Math.max(8, Math.min(elLeft, vw - boxW - 8)), transform: 'none', position: 'fixed' };
      } else if (place === 'right' || (place === 'auto' && elRight + boxW + padding < vw)) {
        newPos = { top: Math.max(8, Math.round(elTop)), left: Math.round(elRight + padding), transform: 'none', position: 'fixed' };
      } else {
        newPos = { top: Math.max(8, Math.round(elTop)), left: Math.max(8, Math.round(elLeft - boxW - padding)), transform: 'none', position: 'fixed' };
      }

      setPos(newPos);
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step]);

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === total - 1;

  return (
    <motion.div
      ref={boxRef}
      key={step.id}
      initial={{ opacity: 0, scale: 0.92, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: 8 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.4, 1] }}
      style={{
        position: pos.position || 'fixed',
        top: pos.top,
        left: pos.left,
        transform: pos.transform,
        width: 340,
        zIndex: 9999,
        pointerEvents: 'all',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          borderRadius: 20,
          padding: '24px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(99,102,241,0.3)',
          border: '1px solid rgba(99,102,241,0.2)',
          color: '#fff',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {step.icon && (
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>
                {step.icon}
              </div>
            )}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>
                Step {currentIndex + 1} of {total}
              </div>
              <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>{step.title}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8,
              width: 28, height: 28, cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#aaa',
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#cbd5e1', marginBottom: 20 }}>
          {step.content}
        </p>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginBottom: 16 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === currentIndex ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === currentIndex
                  ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                  : 'rgba(255,255,255,0.2)',
                transition: 'all 0.25s ease',
              }}
            />
          ))}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between' }}>
          {!isFirst ? (
            <button
              onClick={onPrev}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)', color: '#cbd5e1',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          ) : (
            <button
              onClick={onClose}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)', color: '#cbd5e1',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}
            >
              Skip tour
            </button>
          )}
          <button
            onClick={isLast ? onClose : onNext}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
            }}
          >
            {isLast ? (
              <>🎉 Finish!</>
            ) : (
              <>Next <ArrowRight size={14} /></>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function OnboardingTour({ tourKey, steps, isOpen, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentStep = steps[currentIndex];

  const handleNext = useCallback(() => {
    if (currentIndex < steps.length - 1) setCurrentIndex(i => i + 1);
    else handleClose();
  }, [currentIndex, steps.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) setCurrentIndex(i => i - 1);
  }, [currentIndex]);

  const handleClose = useCallback(() => {
    if (tourKey) localStorage.setItem(TOUR_STORAGE_KEY_PREFIX + tourKey, '1');
    setCurrentIndex(0);
    onClose?.();
  }, [tourKey, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, handleClose, handleNext, handlePrev]);

  // Scroll element into view when step changes
  useEffect(() => {
    if (!isOpen || !currentStep?.target) return;
    const el = document.querySelector(currentStep.target);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentIndex, isOpen, currentStep]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <Spotlight target={currentStep?.target} />
          <TooltipBox
            step={currentStep}
            currentIndex={currentIndex}
            total={steps.length}
            onNext={handleNext}
            onPrev={handlePrev}
            onClose={handleClose}
          />
        </>
      )}
    </AnimatePresence>
  );
}

export function useTour(tourKey) {
  const [isOpen, setIsOpen] = useState(false);

  const startTour = useCallback(() => setIsOpen(true), []);
  const closeTour = useCallback(() => setIsOpen(false), []);

  // Auto-start on first visit
  useEffect(() => {
    if (!tourKey) return;
    const done = localStorage.getItem(TOUR_STORAGE_KEY_PREFIX + tourKey);
    if (!done) {
      const t = setTimeout(() => setIsOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [tourKey]);

  return { isOpen, startTour, closeTour };
}

export default OnboardingTour;
