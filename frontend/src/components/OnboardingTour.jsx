import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, ArrowLeft, HelpCircle } from 'lucide-react';

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

function Spotlight({ target, padding = 10 }) {
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
              rx={10}
              fill="black"
            />
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#spotlight-mask)"
        />
        {/* Clean highlight border */}
        <rect
          x={l}
          y={t - window.scrollY}
          width={w}
          height={h}
          rx={10}
          fill="none"
          stroke="#111111"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

function TooltipBox({ step, currentIndex, total, onNext, onPrev, onClose }) {
  const [pos, setPos] = useState({ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', position: 'fixed' });
  const boxRef = useRef(null);
  const padding = 14;

  useEffect(() => {
    const update = () => {
      if (!step.target) {
        setPos({ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', position: 'fixed' });
        return;
      }
      const r = getElementRect(step.target);
      if (!r) {
        setPos({ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', position: 'fixed' });
        return;
      }

      const boxW = 360;
      const boxH = 220;
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
  const StepIcon = step.icon;

  return (
    <motion.div
      ref={boxRef}
      key={step.id}
      initial={{ opacity: 0, scale: 0.94, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 6 }}
      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.4, 1] }}
      style={{
        position: pos.position || 'fixed',
        top: pos.top,
        left: pos.left,
        transform: pos.transform,
        width: 360,
        zIndex: 9999,
        pointerEvents: 'all',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e5e7eb',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: 3, background: '#111111', width: '100%' }} />

        <div style={{ padding: '20px 22px 22px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {StepIcon && (
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: '#f3f4f6',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <StepIcon size={18} strokeWidth={2} color="#111111" />
                </div>
              )}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
                  Step {currentIndex + 1} of {total}
                </div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111111', lineHeight: 1.2 }}>
                  {step.title}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: '1px solid #e5e7eb', borderRadius: 8,
                width: 28, height: 28, cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#6b7280',
                flexShrink: 0, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.borderColor = '#d1d5db'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
            >
              <X size={13} />
            </button>
          </div>

          {/* Content */}
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: '#4b5563', marginBottom: 20 }}>
            {step.content}
          </p>

          {/* Progress bar */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 18 }}>
            {Array.from({ length: total }).map((_, i) => (
              <div
                key={i}
                style={{
                  flex: i === currentIndex ? 2 : 1,
                  height: 3,
                  borderRadius: 2,
                  background: i === currentIndex ? '#111111' : i < currentIndex ? '#9ca3af' : '#e5e7eb',
                  transition: 'all 0.25s ease',
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst ? (
              <button
                onClick={onPrev}
                style={{
                  flex: 1, padding: '9px 14px', borderRadius: 10,
                  border: '1px solid #e5e7eb', background: '#ffffff',
                  color: '#374151', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 5, transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#e5e7eb'; }}
              >
                <ArrowLeft size={13} /> Back
              </button>
            ) : (
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '9px 14px', borderRadius: 10,
                  border: '1px solid #e5e7eb', background: '#ffffff',
                  color: '#6b7280', fontWeight: 600, fontSize: 13,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; }}
              >
                Skip tour
              </button>
            )}
            <button
              onClick={isLast ? onClose : onNext}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: 10,
                border: 'none', background: '#111111', color: '#ffffff',
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#333333'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#111111'; }}
            >
              {isLast ? (
                'Done'
              ) : (
                <>Next <ArrowRight size={13} /></>
              )}
            </button>
          </div>
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
