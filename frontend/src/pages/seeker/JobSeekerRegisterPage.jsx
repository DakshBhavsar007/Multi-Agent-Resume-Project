import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { seekerAPI } from '../../lib/api';
import { useSeekerAuthStore } from '../../stores/seekerAuthStore';
import toast from 'react-hot-toast';

export default function JobSeekerRegisterPage() {
  const navigate = useNavigate();
  const setAuth = useSeekerAuthStore(s => s.setAuth);
  const [form, setForm] = useState({ full_name: '', email: '', password: '', location: '', headline: '' });
  const [loading, setLoading] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const data = await seekerAPI.register(form);
      setAuth(data);
      localStorage.setItem('vish_seeker_token', data.seeker_token);
      localStorage.setItem('vish_seeker_data', JSON.stringify(data.seeker));
      toast.success('Account created! Welcome to Vishleshan 🎉');
      navigate('/jobs/dashboard');
    } catch (err) {
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div style={styles.page}>
      <div style={styles.left}>
        <div style={styles.brand}>
          <div style={styles.logo}>V</div>
          <span style={styles.brandName}>Vishleshan</span>
        </div>
        <div style={styles.leftContent}>
          <h1 style={styles.leftHeading}>Start your<br/><span style={styles.accent}>job search</span><br/>smarter</h1>
          <p style={styles.leftSub}>Join thousands of candidates using AI to land their dream roles faster.</p>
        </div>
      </div>

      <div style={styles.right}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Create your account</h2>
            <p style={styles.cardSub}>Job Seeker Portal — Free forever</p>
          </div>

          <form onSubmit={handle} style={styles.form}>
            <div style={styles.row}>
              <Field label="Full Name *" type="text" placeholder="Daksh Bhavsar" value={form.full_name} onChange={set('full_name')} required />
              <Field label="Location" type="text" placeholder="Ahmedabad, India" value={form.location} onChange={set('location')} />
            </div>
            <Field label="Email address *" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required fullWidth />
            <Field label="Headline" type="text" placeholder="e.g. Full Stack Developer · 3 years exp" value={form.headline} onChange={set('headline')} fullWidth />
            <Field label="Password *" type="password" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} required fullWidth />

            <button type="submit" disabled={loading} style={styles.btn}>
              {loading ? 'Creating account…' : 'Create Account →'}
            </button>
          </form>

          <div style={styles.footer}>
            Already have an account? <Link to="/jobs/login" style={{ color: '#2563eb', fontWeight: 600 }}>Sign in</Link>
          </div>
          <div style={styles.companyLink}>
            Are you a company? <Link to="/register" style={{ color: '#6366f1' }}>Company Register →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, fullWidth, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: fullWidth ? '1 0 100%' : '1' }}>
      <label style={styles.label}>{label}</label>
      <input {...props} style={styles.input} />
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
  left: {
    flex: '0 0 38%', background: 'linear-gradient(135deg,#1e3a5f,#2563eb)',
    padding: '48px', display: 'flex', flexDirection: 'column', color: '#fff',
  },
  brand: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '80px' },
  logo: {
    width: '38px', height: '38px', borderRadius: '10px',
    background: '#fff', color: '#2563eb', fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
  },
  brandName: { fontSize: '20px', fontWeight: 700 },
  leftContent: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  leftHeading: { fontSize: '40px', fontWeight: 800, lineHeight: 1.25, margin: '0 0 16px' },
  accent: { color: '#93c5fd' },
  leftSub: { fontSize: '16px', color: '#bfdbfe', lineHeight: 1.6 },
  right: { flex: 1, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 48px' },
  card: {
    background: '#fff', borderRadius: '20px', padding: '44px',
    width: '100%', maxWidth: '520px', boxShadow: '0 4px 40px rgba(0,0,0,0.08)',
  },
  cardHeader: { marginBottom: '28px' },
  cardTitle: { fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 6px' },
  cardSub: { fontSize: '13px', color: '#6b7280', margin: 0 },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  row: { display: 'flex', gap: '12px' },
  label: { fontSize: '12px', fontWeight: 600, color: '#374151' },
  input: {
    padding: '11px 14px', border: '1.5px solid #e5e7eb', borderRadius: '10px',
    fontSize: '14px', color: '#111827', outline: 'none', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box',
  },
  btn: {
    padding: '13px', background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
    color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px',
    fontWeight: 600, cursor: 'pointer', marginTop: '4px',
  },
  footer: { textAlign: 'center', fontSize: '13px', color: '#6b7280', marginTop: '20px' },
  companyLink: { textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '10px' },
};
