import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { KeyRound, ArrowLeft, CheckCircle2, AlertCircle, Loader2, Mail } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const type = searchParams.get('type') || 'recruiter';

  // If no token, show forgot password form
  if (!token) {
    return <ForgotPasswordForm type={type} />;
  }

  return <ResetPasswordForm token={token} type={type} />;
}

function ForgotPasswordForm({ type }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const endpointMap = {
    recruiter: '/api/v1/auth/forgot-password',
    seeker: '/api/v1/seeker/auth/forgot-password',
    developer: '/api/developer/auth/forgot-password',
  };

  const loginMap = {
    recruiter: '/login',
    seeker: '/seeker/login',
    developer: '/developer/login',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}${endpointMap[type]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
      } else {
        setError(data?.error || 'Something went wrong');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h1 className="font-display text-xl text-charcoal mb-2">Check Your Email</h1>
          <p className="text-gray-500 text-sm mb-6">
            If an account exists with <strong>{email}</strong>, we've sent a password reset link. Check your inbox (and spam folder).
          </p>
          <Link
            to={loginMap[type]}
            className="inline-flex items-center gap-2 text-sm text-accent font-medium hover:underline"
          >
            <ArrowLeft size={16} /> Back to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Mail size={28} className="text-accent" />
          </div>
          <h1 className="font-display text-xl text-charcoal">Forgot Password</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your email and we'll send a reset link.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 text-red-700 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-accent text-white font-display font-medium text-sm hover:bg-accent/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to={loginMap[type]}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-accent font-medium"
          >
            <ArrowLeft size={14} /> Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

function ResetPasswordForm({ token, type }) {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const endpointMap = {
    recruiter: '/api/v1/auth/reset-password',
    seeker: '/api/v1/seeker/auth/reset-password',
    developer: '/api/developer/auth/reset-password',
  };

  const loginMap = {
    recruiter: '/login',
    seeker: '/seeker/login',
    developer: '/developer/login',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}${endpointMap[type]}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate(loginMap[type]), 3000);
      } else {
        setError(data?.error || 'Invalid or expired reset link');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-green-600" />
          </div>
          <h1 className="font-display text-xl text-charcoal mb-2">Password Reset!</h1>
          <p className="text-gray-500 text-sm">Your password has been updated. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <KeyRound size={28} className="text-accent" />
          </div>
          <h1 className="font-display text-xl text-charcoal">Reset Password</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your new password below.</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 text-red-700 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-accent text-white font-display font-medium text-sm hover:bg-accent/90 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
