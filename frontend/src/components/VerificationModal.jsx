import React, { useState, useEffect } from 'react';
import { Mail, Phone, X, ShieldCheck, Loader2, MessageSquare, PhoneCall } from 'lucide-react';
import axios from 'axios';

const getApiBase = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.endsWith('/api/v1') ? envUrl.slice(0, -7) : envUrl;
  }
  if (typeof window !== "undefined") {
    const host = window.location.origin;
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      return "http://127.0.0.1:8000";
    }
    return host;
  }
  return "http://127.0.0.1:8000";
};

const API_BASE_URL = getApiBase();

export default function VerificationModal({ isOpen, onClose, type, value, role, userEmail, onSuccess, isSignup }) {
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccess('');
      setOtp('');
      sendOtp();
    }
  }, [isOpen, type, value]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  if (!isOpen) return null;

  const sendOtp = async (method = 'sms') => {
    setIsSending(true);
    setError('');
    setSuccess('');
    try {
      let endpoint = '';
      let payload = { role };
      
      if (type === 'email') {
        endpoint = `${API_BASE_URL}/api/v1/auth/verification/send-email-otp`;
        payload.email = value;
        payload.is_signup = isSignup || false;
      } else {
        endpoint = `${API_BASE_URL}/api/v1/auth/verification/send-phone-otp`;
        payload.phone = value;
        payload.email = userEmail || '';
        payload.method = method;
      }

      const res = await axios.post(endpoint, payload);
      if (res.data.success) {
        setSuccess(res.data.data.message || `OTP sent successfully to your ${type}.`);
        setCountdown(type === 'email' ? 30 : 60);
      } else {
        setError(res.data.error || 'Failed to send verification code.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || `Failed to send verification code to your ${type}.`);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const minLength = type === 'email' ? 6 : 4;
    if (!otp || otp.length < minLength) {
      setError(`Please enter a valid ${minLength === 6 ? '6-digit' : '4 or 6-digit'} verification code.`);
      return;
    }
    
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      let endpoint = '';
      let payload = { role, otp };

      if (type === 'email') {
        endpoint = `${API_BASE_URL}/api/v1/auth/verification/verify-email-otp`;
        payload.email = value;
      } else {
        endpoint = `${API_BASE_URL}/api/v1/auth/verification/verify-phone-otp`;
        payload.phone = value;
        payload.email = userEmail || '';
      }

      const res = await axios.post(endpoint, payload);
      if (res.data.success) {
        setSuccess('Verification successful!');
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1500);
      } else {
        setError(res.data.error || 'Invalid verification code.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 p-6 shadow-2xl backdrop-blur-md">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-charcoal dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex flex-col items-center text-center mt-2 mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-3">
            {type === 'email' ? <Mail className="w-6 h-6" /> : <Phone className="w-6 h-6" />}
          </div>
          <h3 className="text-xl font-bold text-charcoal dark:text-white">
            Verify Your {type === 'email' ? 'Email Address' : 'Phone Number'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1 max-w-[280px]">
            We have sent a verification code to <span className="font-semibold text-charcoal dark:text-white">{value}</span>
          </p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 text-xs text-red-600 dark:text-red-400 font-medium">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            {success}
          </div>
        )}

        {/* Verification Form */}
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              Verification Code
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full text-center text-2xl font-bold tracking-[8px] py-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-charcoal dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isSending}
            className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                Verify Code
              </>
            )}
          </button>
        </form>

        {/* Resend Logic */}
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-zinc-400">
          {type === 'phone' ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-400 dark:text-zinc-500">Didn't receive the code?</p>
              <div className="flex items-center justify-center gap-4">
                {countdown > 0 ? (
                  <span className="text-xs font-medium text-gray-400 dark:text-zinc-500 bg-gray-50 dark:bg-zinc-900/50 px-3 py-1.5 rounded-full border border-gray-100 dark:border-zinc-800/40">
                    Resend in {countdown}s
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => sendOtp('sms')}
                      disabled={isSending || isLoading}
                      className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors focus:outline-none bg-blue-50/50 dark:bg-blue-950/20 px-3 py-1.5 rounded-lg border border-blue-100/30 dark:border-blue-900/30"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Resend SMS
                    </button>
                    <button
                      type="button"
                      onClick={() => sendOtp('voice')}
                      disabled={isSending || isLoading}
                      className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors focus:outline-none bg-emerald-50/50 dark:bg-emerald-950/20 px-3 py-1.5 rounded-lg border border-emerald-100/30 dark:border-emerald-900/30"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      Get via Call
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div>
              Didn't receive the code?{' '}
              {countdown > 0 ? (
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  Resend in {countdown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => sendOtp('sms')}
                  disabled={isSending || isLoading}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                >
                  Resend Code
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
