import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Shield, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import { useAdminAuthStore } from '../../stores/adminAuthStore';
import { API_HOST } from '../../lib/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const adminAuth = useAdminAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Background particle animation effect and auth check
  useEffect(() => {
    // Force dark mode for admin pages
    document.documentElement.classList.add('dark');

    // Auto-redirect if already logged in as admin
    if (adminAuth.adminToken) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [adminAuth.adminToken, navigate]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_HOST}/api/v1/admin/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const resData = await response.json();
      if (response.status === 429) {
        const retryAfter = resData.data?.retry_after_seconds || 60;
        toast.error(`Too many attempts. Please try again in ${retryAfter} seconds.`);
        return;
      }
      if (resData.success) {
        adminAuth.setAdminAuth(resData.data);
        toast.success("Welcome back, Administrator!");
        navigate('/admin/dashboard');
      } else {
        toast.error(resData.error || "Invalid admin credentials.");
      }
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #1e1b4b, #09090b 70%)',
      fontFamily: "'Inter', -apple-system, sans-serif",
      color: '#f4f4f5',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background glows */}
      <div style={{
        position: 'absolute',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0) 70%)',
        top: '10%',
        left: '20%',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        width: '500px',
        height: '500px',
        background: 'radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, rgba(236, 72, 153, 0) 70%)',
        bottom: '10%',
        right: '10%',
        zIndex: 0
      }} />

      {/* Glassmorphic Card Container */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(24, 24, 27, 0.7)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(63, 63, 70, 0.4)',
        borderRadius: '24px',
        padding: '40px 32px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        zIndex: 1,
        animation: 'fadeIn 0.6s ease-out'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #4f46e5 0%, #c084fc 100%)',
            boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)',
            marginBottom: '16px'
          }}>
            <Shield size={32} color="#ffffff" />
          </div>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '800',
            letterSpacing: '-0.75px',
            margin: '0 0 8px',
            background: 'linear-gradient(to right, #f4f4f5, #a1a1aa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Between Admin
          </h2>
          <p style={{ color: '#71717a', fontSize: '14px', margin: 0 }}>
            Enter your credentials to access the moderation console.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Email field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#a1a1aa' }}>Admin Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#52525b" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                placeholder="admin@between.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(9, 9, 11, 0.5)',
                  border: '1px solid rgba(63, 63, 70, 0.8)',
                  borderRadius: '12px',
                  padding: '14px 16px 14px 48px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366f1';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(63, 63, 70, 0.8)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Password field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#a1a1aa' }}>Admin Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#52525b" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  background: 'rgba(9, 9, 11, 0.5)',
                  border: '1px solid rgba(63, 63, 70, 0.8)',
                  borderRadius: '12px',
                  padding: '14px 44px 14px 48px',
                  color: '#ffffff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#6366f1';
                  e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(63, 63, 70, 0.8)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#52525b',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '8px',
              transition: 'transform 0.1s, opacity 0.2s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              "Sign In to Console"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
