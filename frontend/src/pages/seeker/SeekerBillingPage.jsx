import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Zap, Crown, Sparkles, CreditCard, ShieldCheck } from 'lucide-react';
import { Header, Footer } from '../../components/user/site-chrome';
import { seekerAPI } from '../../lib/api';
import toast from 'react-hot-toast';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    badge: null,
    icon: '🌱',
    price: 0,
    period: '/month',
    description: 'Get started with job hunting basics.',
    color: '#6b7280',
    gradient: 'linear-gradient(135deg, #f9fafb, #f3f4f6)',
    textColor: '#111827',
    features: [
      '3 job applications/month',
      '1 active resume draft',
      'Basic templates',
      'Job search & alerts',
      'Company profiles',
    ],
    cta: 'Current Plan',
    featured: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    badge: 'Most Popular',
    icon: '⚡',
    price: 199,
    period: '/month',
    description: 'Everything you need to land your dream job faster.',
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #1e1b4b, #312e81)',
    textColor: '#fff',
    features: [
      'Unlimited applications',
      'Unlimited resume drafts',
      'Premium AI templates',
      'AI resume enhancer',
      'ATS score checker',
      'Priority job visibility',
      'Interview prep tools',
    ],
    cta: 'Upgrade to Premium',
    featured: true,
  },
];

function PlanCard({ plan, isActive, onUpgrade, loading }) {
  const isFree = plan.id === 'free';
  const isCurrentPlan = isActive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: isFree ? 0 : -6, scale: isFree ? 1 : 1.01 }}
      transition={{ duration: 0.45, ease: [0.21, 0.45, 0.32, 0.9] }}
      style={{
        background: plan.gradient,
        borderRadius: 24,
        padding: '2px',
        boxShadow: plan.featured
          ? '0 20px 60px rgba(99,102,241,0.35), 0 0 0 1px rgba(99,102,241,0.2)'
          : '0 4px 20px rgba(0,0,0,0.06)',
        position: 'relative',
        flex: 1,
        maxWidth: 400,
        minWidth: 280,
      }}
    >
      {plan.badge && (
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          style={{
            position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: '#fff', borderRadius: 20, padding: '4px 16px',
            fontSize: 11, fontWeight: 800, letterSpacing: '0.06em',
            textTransform: 'uppercase', whiteSpace: 'nowrap',
            boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
          }}
        >
          {plan.badge}
        </motion.div>
      )}

      <div style={{
        background: isFree ? '#fff' : 'rgba(255,255,255,0.04)',
        borderRadius: 22,
        padding: 32,
        height: '100%',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Icon + Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <span style={{ fontSize: 32 }}>{plan.icon}</span>
          <div>
            <div style={{
              fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: isFree ? '#6b7280' : 'rgba(196,181,253,0.9)',
              marginBottom: 2,
            }}>
              Plan
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: plan.textColor, lineHeight: 1 }}>
              {plan.name}
            </div>
          </div>
        </div>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, margin: '20px 0 4px' }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: isFree ? '#9ca3af' : 'rgba(196,181,253,0.8)' }}>₹</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={plan.price}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ fontSize: 48, fontWeight: 900, color: plan.textColor, lineHeight: 1 }}
            >
              {plan.price}
            </motion.span>
          </AnimatePresence>
          <span style={{ fontSize: 14, color: isFree ? '#9ca3af' : 'rgba(196,181,253,0.7)', marginLeft: 2 }}>
            {plan.period}
          </span>
        </div>

        <p style={{ fontSize: 13.5, color: isFree ? '#6b7280' : 'rgba(203,213,225,0.85)', marginBottom: 24, lineHeight: 1.5 }}>
          {plan.description}
        </p>

        <hr style={{ border: 'none', borderTop: isFree ? '1px solid #f3f4f6' : '1px solid rgba(255,255,255,0.1)', marginBottom: 20 }} />

        {/* Features */}
        <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
          {plan.features.map((f, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}
            >
              <CheckCircle2 size={16} style={{ color: plan.featured ? '#a78bfa' : '#10b981', flexShrink: 0 }} />
              <span style={{ color: isFree ? '#374151' : '#e2e8f0' }}>{f}</span>
            </motion.li>
          ))}
        </ul>

        {/* CTA */}
        <motion.button
          whileHover={!isFree && !isCurrentPlan ? { scale: 1.03 } : {}}
          whileTap={!isFree && !isCurrentPlan ? { scale: 0.97 } : {}}
          onClick={() => !isFree && !isCurrentPlan && onUpgrade(plan.id)}
          disabled={isFree || isCurrentPlan || loading === plan.id}
          style={{
            width: '100%', padding: '14px 20px', borderRadius: 14, border: 'none',
            fontWeight: 800, fontSize: 14, cursor: (isFree || isCurrentPlan) ? 'default' : 'pointer',
            background: isCurrentPlan
              ? (isFree ? '#f3f4f6' : 'rgba(255,255,255,0.12)')
              : (isFree ? '#f3f4f6' : 'linear-gradient(135deg, #818cf8, #c084fc)'),
            color: isCurrentPlan
              ? (isFree ? '#9ca3af' : 'rgba(255,255,255,0.6)')
              : (isFree ? '#9ca3af' : '#fff'),
            boxShadow: (!isFree && !isCurrentPlan) ? '0 8px 24px rgba(99,102,241,0.35)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading === plan.id ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              Processing…
            </span>
          ) : isCurrentPlan ? (
            <><ShieldCheck size={16} /> Current Plan</>
          ) : isFree ? (
            'Free Forever'
          ) : (
            <><CreditCard size={15} /> {plan.cta}</>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function SeekerBillingPage() {
  const [currentPlan, setCurrentPlan] = useState('free');
  const [loading, setLoading] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

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
    seekerAPI.getBillingCurrent().then(data => {
      setCurrentPlan(data?.plan || 'free');
    }).catch(() => {
      const stored = localStorage.getItem('seeker_tier') || 'free';
      setCurrentPlan(stored);
    }).finally(() => setLoadingPlan(false));
  }, []);

  const handleUpgrade = async (planId) => {
    setLoading(planId);
    try {
      const orderData = await seekerAPI.billingSubscribe(planId);

      if (!orderData || orderData.order_id?.startsWith('order_mock_')) {
        // Mock mode - simulate payment
        await seekerAPI.billingVerify({
          razorpay_payment_id: 'pay_mock_' + Math.random().toString(36).substring(7),
          razorpay_order_id: orderData?.order_id || 'order_mock_test',
          razorpay_signature: 'sig_mock_' + Math.random().toString(36).substring(7),
          plan: planId,
        });
        setCurrentPlan(planId);
        localStorage.setItem('seeker_tier', planId);
        toast.success(`🎉 Welcome to Between ${planId.charAt(0).toUpperCase() + planId.slice(1)}!`);
        setLoading(null);
        return;
      }

      const rzp = new window.Razorpay({
        key: orderData.razorpay_key_id || 'rzp_test_mock',
        order_id: orderData.order_id,
        name: 'Between',
        description: `Upgrade to ${planId.toUpperCase()} Plan`,
        amount: orderData.amount,
        currency: 'INR',
        theme: { color: '#6366f1' },
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
            toast.success(`🎉 Welcome to Between ${planId.charAt(0).toUpperCase() + planId.slice(1)}!`);
          } catch {
            toast.error('Payment verification failed');
          } finally {
            setLoading(null);
          }
        },
      });
      rzp.on('payment.failed', () => { toast.error('Payment failed'); setLoading(null); });
      rzp.open();
    } catch (e) {
      toast.error(e.message || 'Failed to initiate payment');
      setLoading(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: "'Inter', sans-serif" }}>
      <Header />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Hero */}
      <section style={{ padding: '72px 24px 40px', textAlign: 'center', maxWidth: 700, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
            borderRadius: 20, padding: '6px 16px', marginBottom: 20,
          }}
        >
          <Sparkles size={14} style={{ color: '#6366f1' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Job Seeker Plans
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 900, lineHeight: 1.1, color: '#111827', marginBottom: 16 }}
        >
          Land your dream job,{' '}
          <span style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            faster
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          style={{ fontSize: 17, color: '#6b7280', lineHeight: 1.6, marginBottom: 0 }}
        >
          Unlock AI-powered resume tools, unlimited applications, and priority visibility for just ₹199/month.
        </motion.p>
      </section>

      {/* Plans */}
      <section style={{ padding: '20px 24px 80px', display: 'flex', justifyContent: 'center' }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 900, width: '100%' }}>
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
      </section>

      {/* Trust badges */}
      <section style={{ padding: '0 24px 80px', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { icon: '🔒', label: '256-bit SSL encryption' },
            { icon: '🔄', label: 'Cancel anytime' },
            { icon: '🇮🇳', label: 'Pay with UPI, cards & more' },
            { icon: '⚡', label: 'Instant activation' },
          ].map((b, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6b7280', fontWeight: 600 }}
            >
              <span style={{ fontSize: 18 }}>{b.icon}</span>
              {b.label}
            </motion.div>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
