import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSeekerAuthStore } from '../stores/seekerAuthStore';
import { useAuthStore } from '../stores/authStore';

export default function BrevoTracker() {
  const location = useLocation();
  const seeker = useSeekerAuthStore((state) => state.seeker);
  const company = useAuthStore((state) => state.company);

  useEffect(() => {
    const brevoKey = import.meta.env.VITE_BREVO_MA_KEY || 'gqq4aaawytrk7xx4oyj4s62z';
    if (!brevoKey) return;

    // Load Brevo SDK 2.0 tracker script
    if (!window.Brevo) {
      window.Brevo = [];
      window.Brevo.push([
        'init',
        {
          client_key: brevoKey,
        },
      ]);

      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.async = true;
      script.src = 'https://cdn.brevo.com/js/sdk-loader.js';
      
      const firstScript = document.getElementsByTagName('script')[0];
      if (firstScript && firstScript.parentNode) {
        firstScript.parentNode.insertBefore(script, firstScript);
      } else {
        document.head.appendChild(script);
      }
    }
  }, []);


  // Track page views on route changes
  useEffect(() => {
    if (window.Brevo) {
      window.Brevo.push(['page', location.pathname]);
    }
  }, [location.pathname]);

  // Identify logged-in users (Seekers or Recruiters/Companies)
  useEffect(() => {
    if (!window.Brevo) return;

    if (seeker && seeker.email) {
      window.Brevo.push([
        'identify',
        seeker.email,
        {
          FIRSTNAME: seeker.full_name?.split(' ')[0] || '',
          LASTNAME: seeker.full_name?.split(' ').slice(1).join(' ') || '',
          SMS: seeker.phone || '',
          USER_ROLE: 'seeker',
        },
      ]);
    } else if (company && company.email) {
      window.Brevo.push([
        'identify',
        company.email,
        {
          COMPANY: company.name || '',
          FIRSTNAME: company.name || '',
          USER_ROLE: 'recruiter',
        },
      ]);
    }
  }, [seeker, company]);


  return null;
}
