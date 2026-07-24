import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSeekerAuthStore } from '../stores/seekerAuthStore';
import { usePortalAuthStore } from '../stores/portalAuthStore';
import { ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AlertBanner() {
  const recruiter = useAuthStore((state) => state.company);
  const seeker = useSeekerAuthStore((state) => state.seeker);
  const developer = usePortalAuthStore((state) => state.developer);
  const navigate = useNavigate();

  const [showBanner, setShowBanner] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);
  const [unverifiedPhone, setUnverifiedPhone] = useState(false);

  useEffect(() => {
    const localSeeker = (() => {
      try { return JSON.parse(localStorage.getItem('vish_seeker_data') || 'null'); } catch { return null; }
    })();
    const activeSeeker = seeker || localSeeker;

    if (recruiter) {
      setUnverifiedEmail(!recruiter.email_verified);
      setUnverifiedPhone(false);
      setShowBanner(!recruiter.email_verified);
    } else if (activeSeeker) {
      const emailUnverified = !activeSeeker.email_verified;
      const phoneUnverified = !activeSeeker.phone_verified;
      setUnverifiedEmail(emailUnverified);
      setUnverifiedPhone(phoneUnverified);
      setShowBanner(emailUnverified || phoneUnverified);
    } else if (developer) {
      setUnverifiedEmail(!developer.is_verified);
      setUnverifiedPhone(false);
      setShowBanner(!developer.is_verified);
    } else {
      setShowBanner(false);
    }
  }, [recruiter, seeker, developer]);

  if (!showBanner) return null;

  let redirectUrl = '';
  if (recruiter) {
    redirectUrl = '/dashboard/settings';
  } else if (seeker) {
    redirectUrl = '/jobs/profile';
  } else if (developer) {
    redirectUrl = '/developer/portal/settings';
  }

  const handleRedirect = () => {
    if (redirectUrl) {
      navigate(redirectUrl);
    }
  };

  return (
    <div className="w-full bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/30 py-2.5 px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-amber-800 dark:text-amber-300 backdrop-blur-md z-30 relative transition-all duration-300">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
        <span className="font-medium text-xs sm:text-sm">
          {unverifiedEmail && unverifiedPhone
            ? 'Your email and phone number are not verified.'
            : unverifiedEmail
            ? 'Your email address is not verified.'
            : 'Your phone number is not verified.'} Please complete verification.
        </span>
      </div>
      <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
        {unverifiedEmail && (
          <button
            onClick={handleRedirect}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm focus:outline-none"
          >
            Verify Email
          </button>
        )}
        {unverifiedPhone && (
          <button
            onClick={handleRedirect}
            className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm focus:outline-none"
          >
            Verify Phone
          </button>
        )}
      </div>
    </div>
  );
}
