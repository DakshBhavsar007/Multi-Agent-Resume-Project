import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useSeekerAuthStore } from '../stores/seekerAuthStore';
import { usePortalAuthStore } from '../stores/portalAuthStore';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import VerificationModal from './VerificationModal';

export default function AlertBanner() {
  const recruiter = useAuthStore((state) => state.company);
  const seeker = useSeekerAuthStore((state) => state.seeker);
  const developer = usePortalAuthStore((state) => state.developer);

  const [activeVerification, setActiveVerification] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);
  const [unverifiedPhone, setUnverifiedPhone] = useState(false);

  useEffect(() => {
    if (recruiter) {
      setUnverifiedEmail(!recruiter.email_verified);
      setUnverifiedPhone(!recruiter.phone_verified);
      setShowBanner(!recruiter.email_verified || !recruiter.phone_verified);
    } else if (seeker) {
      setUnverifiedEmail(!seeker.email_verified);
      setUnverifiedPhone(!seeker.phone_verified);
      setShowBanner(!seeker.email_verified || !seeker.phone_verified);
    } else if (developer) {
      setUnverifiedEmail(!developer.is_verified);
      setUnverifiedPhone(!developer.phone_verified);
      setShowBanner(!developer.is_verified || !developer.phone_verified);
    } else {
      setShowBanner(false);
    }
  }, [recruiter, seeker, developer]);

  if (!showBanner) return null;

  let emailValue = '';
  let phoneValue = '';
  let role = '';
  let updateSuccessCallback = () => {};

  if (recruiter) {
    emailValue = recruiter.email;
    phoneValue = recruiter.phone || '';
    role = 'recruiter';
    updateSuccessCallback = (type) => {
      const updated = { ...recruiter };
      if (type === 'email') updated.email_verified = true;
      if (type === 'phone') updated.phone_verified = true;
      useAuthStore.getState().setAuth(updated);
    };
  } else if (seeker) {
    emailValue = seeker.email;
    phoneValue = seeker.phone || '';
    role = 'seeker';
    updateSuccessCallback = (type) => {
      const updates = {};
      if (type === 'email') updates.email_verified = true;
      if (type === 'phone') updates.phone_verified = true;
      useSeekerAuthStore.getState().updateSeeker(updates);
    };
  } else if (developer) {
    emailValue = developer.email;
    phoneValue = developer.phone || '';
    role = 'developer';
    updateSuccessCallback = (type) => {
      const updated = { ...developer };
      if (type === 'email') updated.is_verified = true;
      if (type === 'phone') updated.phone_verified = true;
      usePortalAuthStore.getState().setAuth(updated);
    };
  }

  return (
    <>
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
              onClick={() => setActiveVerification({ type: 'email', value: emailValue, role })}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-sm focus:outline-none"
            >
              Verify Email
            </button>
          )}
          {unverifiedPhone && (
            <button
              onClick={() => {
                if (!phoneValue) {
                  // Direct to complete phone input
                  alert('Please enter your phone number in your profile/settings section to verify.');
                  return;
                }
                setActiveVerification({ type: 'phone', value: phoneValue, role });
              }}
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm focus:outline-none"
            >
              Verify Phone
            </button>
          )}
        </div>
      </div>

      {activeVerification && (
        <VerificationModal
          isOpen={true}
          onClose={() => setActiveVerification(null)}
          type={activeVerification.type}
          value={activeVerification.value}
          role={activeVerification.role}
          onSuccess={() => updateSuccessCallback(activeVerification.type)}
        />
      )}
    </>
  );
}
