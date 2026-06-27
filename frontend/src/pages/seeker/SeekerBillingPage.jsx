import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, Zap, Sparkles, CreditCard, ShieldCheck,
  Lock, RefreshCw, Smartphone, Clock, ArrowRight,
  Briefcase, FileText, Star, AlertCircle
} from 'lucide-react';
import { Header, Footer } from '../../components/user/site-chrome';
import { seekerAPI } from '../../lib/api';
import toast from 'react-hot-toast';
import { useSeekerAuthStore } from '../../stores/seekerAuthStore';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    label: 'Get started',
    price: 0,
    period: 'forever',
    description: 'Essential tools to begin your job search.',
    features: [
      { text: '3 job applications / month', icon: Briefcase },
      { text: '1 active resume draft', icon: FileText },
      { text: 'Basic resume templates', icon: FileText },
      { text: 'Job search & alerts', icon: Star },
      { text: 'Company profiles', icon: Star },
    ],
    cta: 'Current Plan',
    featured: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    label: 'Most popular',
    price: 199,
    period: 'per month',
    description: 'Everything you need to land your dream job, faster.',
    features: [
      { text: 'Unlimited job applications', icon: Briefcase },
      { text: 'Unlimited resume drafts', icon: FileText },
      { text: 'Premium AI templates', icon: Sparkles },
      { text: 'AI resume enhancer', icon: Sparkles },
      { text: 'ATS score checker', icon: Check },
      { text: 'Priority job visibility', icon: Star },
      { text: 'Interview prep tools', icon: Star },
    ],
    cta: 'Upgrade to Premium',
    featured: true,
  },
];

const TRUST_ITEMS = [
  { icon: Lock, text: '256-bit SSL encryption' },
  { icon: RefreshCw, text: 'Cancel anytime' },
  { icon: Smartphone, text: 'UPI, cards & more' },
  { icon: Clock, text: 'Instant activation' },
];

function PlanCard({ plan, isActive, onUpgrade, loading }) {
  const isFree = plan.id === 'free';
  const isCurrentPlan = isActive;
  const isLoading = loading === plan.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.21, 0.45, 0.32, 0.9] }}
      style={{
        flex: 1,
        minWidth: 280,
        maxWidth: 400,
        position: 'relative',
        borderRadius: 20,
        border: plan.featured ? '2px solid #111111' : '1.5px solid #e5e7eb',
        background: plan.featured ? '#111111' : '#ffffff',
        boxShadow: plan.featured
          ? '0 20px 48px rgba(0,0,0,0.18)'
          : '0 2px 16px rgba(0,0,0,0.05)',
        overflow: 'visible',
      }}
    >
      {/* Badge */}
      {plan.featured && (
        <motion.div
          initial={{ y: -8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25 }}
          style={{
            position: 'absolute',
            top: -14,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ffffff',
            color: '#111111',
            borderRadius: 20,
            padding: '4px 16px',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            border: '1.5px solid #111111',
          }}
        >
          {plan.label}
        </motion.div>
      )}

      <div style={{ padding: '32px 28px 28px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Plan name */}
        <div style={{ marginBottom: 20 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: plan.featured ? 'rgba(255,255,255,0.5)' : '#9ca3af',
            marginBottom: 6,
          }}>
            Plan
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: plan.featured ? '#ffffff' : '#111111', lineHeight: 1 }}>
            {plan.name}
          </div>
        </div>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: plan.featured ? 'rgba(255,255,255,0.6)' : '#6b7280', paddingBottom: 8 }}>
            Rs
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={plan.price}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              style={{ fontSize: 52, fontWeight: 900, color: plan.featured ? '#ffffff' : '#111111', lineHeight: 1 }}
            >
              {plan.price}
            </motion.span>
          </AnimatePresence>
          <span style={{ fontSize: 14, color: plan.featured ? 'rgba(255,255,255,0.5)' : '#9ca3af', paddingBottom: 10, marginLeft: 4 }}>
            / {plan.period}
          </span>
        </div>

        <p style={{
          fontSize: 13.5, color: plan.featured ? 'rgba(255,255,255,0.65)' : '#6b7280',
          lineHeight: 1.55, marginBottom: 24,
        }}>
          {plan.description}
        </p>

        <hr style={{ border: 'none', borderTop: plan.featured ? '1px solid rgba(255,255,255,0.12)' : '1px solid #f3f4f6', marginBottom: 22 }} />

        {/* Features */}
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
          {plan.features.map((f, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 + i * 0.04 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}
            >
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                background: plan.featured ? 'rgba(255,255,255,0.15)' : '#f3f4f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={11} strokeWidth={3} color={plan.featured ? '#ffffff' : '#111111'} />
              </div>
              <span style={{ color: plan.featured ? 'rgba(255,255,255,0.85)' : '#374151' }}>{f.text}</span>
            </motion.li>
          ))}
        </ul>

        {/* CTA Button */}
        <motion.button
          whileHover={!isFree && !isCurrentPlan ? { scale: 1.02 } : {}}
          whileTap={!isFree && !isCurrentPlan ? { scale: 0.98 } : {}}
          onClick={() => !isFree && !isCurrentPlan && onUpgrade(plan.id)}
          disabled={isFree || isCurrentPlan || isLoading}
          style={{
            width: '100%',
            padding: '14px 20px',
            borderRadius: 12,
            border: plan.featured
              ? 'none'
              : isCurrentPlan ? '1.5px solid #e5e7eb' : '1.5px solid #111111',
            fontWeight: 700,
            fontSize: 14,
            cursor: (isFree || isCurrentPlan) ? 'default' : 'pointer',
            background: plan.featured
              ? isCurrentPlan ? 'rgba(255,255,255,0.12)' : '#ffffff'
              : isCurrentPlan ? '#f3f4f6' : '#111111',
            color: plan.featured
              ? isCurrentPlan ? 'rgba(255,255,255,0.5)' : '#111111'
              : isCurrentPlan ? '#9ca3af' : '#ffffff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.18s ease',
          }}
        >
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                width: 15, height: 15, borderRadius: '50%',
                border: '2px solid rgba(0,0,0,0.15)',
                borderTopColor: plan.featured ? '#111111' : '#ffffff',
                animation: 'spin 0.7s linear infinite',
                display: 'inline-block'
              }} />
              Processing
            </span>
          ) : isCurrentPlan ? (
            <><ShieldCheck size={15} /> Current Plan</>
          ) : isFree ? (
            'Free forever'
          ) : (
            <><CreditCard size={15} /> {plan.cta} <ArrowRight size={13} /></>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function SeekerBillingPage() {
  const updateSeeker = useSeekerAuthStore(s => s.updateSeeker);
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(true);

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    setLoadingPlan(true);
    seekerAPI.getBillingCurrent()
      .then(data => setCurrentPlan(data?.plan || 'free'))
      .catch(() => setCurrentPlan(localStorage.getItem('seeker_tier') || 'free'))
      .finally(() => setLoadingPlan(false));
  }, []);

  const handleUpgrade = async (planId) => {
    setLoading(planId);
    try {
      const orderData = await seekerAPI.billingSubscribe(planId);

      // Mock order flow — backend returned a mock order (no real Razorpay keys)
      if (!orderData || orderData.order_id?.startsWith('order_mock_') || !orderData.razorpay_key_id) {
        await seekerAPI.billingVerify({
          razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(7),
          razorpay_order_id: orderData?.order_id || 'order_mock_test',
          razorpay_signature: 'sig_mock_' + Math.random().toString(36).substring(7),
          plan: planId,
        });
        setCurrentPlan(planId);
        localStorage.setItem('seeker_tier', planId);
        updateSeeker({ tier: planId });
        toast.success('Welcome to Between Premium!');
        setLoading(null);
        return;
      }

      // Real Razorpay flow
      const rzp = new window.Razorpay({
        key: orderData.razorpay_key_id,
        order_id: orderData.order_id,
        name: 'Between',
        description: `Upgrade to ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
        amount: orderData.amount,
        currency: 'INR',
        theme: { color: '#111111' },
        prefill: { name: localStorage.getItem('seeker_name') || '' },
        handler: async (response) => {
          try {
            await seekerAPI.billingVerify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId,
            });
            setCurrentPlan(planId);
            localStorage.setItem('seeker_tier', planId);
            updateSeeker({ tier: planId });
            toast.success('Welcome to Between Premium!');
          } catch {
            toast.error('Payment verification failed. Please contact support.');
          } finally {
            setLoading(null);
          }
        },
      });
      rzp.on('payment.failed', () => {
        toast.error('Payment failed. Please try again.');
        setLoading(null);
      });
      rzp.open();
    } catch (e) {
      toast.error(e.message || 'Failed to initiate payment');
      setLoading(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <Header />
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Hero section */}
      <section style={{ paddingTop: 80, paddingBottom: 48, textAlign: 'center', maxWidth: 640, margin: '0 auto', paddingLeft: 24, paddingRight: 24 }}>
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#f3f4f6', borderRadius: 20,
            padding: '5px 14px', marginBottom: 20,
            border: '1px solid #e5e7eb',
          }}
        >
          <Sparkles size={13} color="#111111" />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#111111', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
            Job Seeker Plans
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          style={{
            fontSize: 'clamp(30px, 5vw, 48px)',
            fontWeight: 900, lineHeight: 1.1,
            color: '#111111', marginBottom: 16,
            fontFamily: "'Space Grotesk', system-ui, sans-serif",
            letterSpacing: '-0.02em',
          }}
        >
          Land your dream job,{' '}
          <span style={{ position: 'relative', display: 'inline-block' }}>
            faster
            <svg
              style={{ position: 'absolute', bottom: -4, left: 0, width: '100%' }}
              height="6" viewBox="0 0 120 6" fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M2 4C30 1 90 1 118 4" stroke="#111111" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          style={{ fontSize: 16, color: '#6b7280', lineHeight: 1.65 }}
        >
          Unlock AI-powered resume tools, unlimited applications, and priority visibility — all for just Rs 199/month.
        </motion.p>
      </section>

      {/* Plan cards */}
      <section style={{ padding: '0 24px 80px', display: 'flex', justifyContent: 'center' }}>
        {loadingPlan ? (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 860 }}>
            {[0, 1].map(i => (
              <div key={i} style={{
                flex: 1, minWidth: 280, maxWidth: 400, height: 520,
                borderRadius: 20, background: '#f3f4f6',
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 860, paddingTop: 16, width: '100%' }}>
            {PLANS.map(plan => (
              <PlanCard
                key={plan.id}
                plan={plan}
                isActive={currentPlan === plan.id}
                onUpgrade={handleUpgrade}
                loading={loading}
              />
            ))}
          </div>
        )}
      </section>

      {/* Trust badges */}
      <section style={{ padding: '0 24px 80px', textAlign: 'center' }}>
        <div style={{
          maxWidth: 700, margin: '0 auto',
          background: '#ffffff', borderRadius: 16,
          border: '1.5px solid #e5e7eb',
          padding: '24px 32px',
          display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap',
        }}>
          {TRUST_ITEMS.map(({ icon: Icon, text }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280', fontWeight: 600 }}
            >
              <Icon size={15} color="#111111" strokeWidth={2} />
              {text}
            </motion.div>
          ))}
        </div>

        {/* FAQ / note */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 8,
            maxWidth: 420, margin: '20px auto 0',
            background: '#f9fafb', borderRadius: 10,
            padding: '12px 16px',
            border: '1px solid #e5e7eb',
          }}
        >
          <AlertCircle size={14} color="#9ca3af" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, color: '#9ca3af', lineHeight: 1.55, margin: 0, textAlign: 'left' }}>
            All payments are processed securely via Razorpay. Your subscription can be cancelled at any time from your profile settings.
          </p>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
