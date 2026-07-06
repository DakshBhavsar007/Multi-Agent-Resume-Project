import { useEffect } from 'react';
import { useSeekerAuthStore } from '../stores/seekerAuthStore';
import { useAuthStore } from '../stores/authStore';
import { usePortalAuthStore } from '../stores/portalAuthStore';

export default function BrevoConversations() {
  const seeker = useSeekerAuthStore((state) => state.seeker);
  const company = useAuthStore((state) => state.company);
  const developer = usePortalAuthStore((state) => state.developer);

  useEffect(() => {
    // Read the Conversations ID from environment variables, fallback to VITE_BREVO_MA_KEY if shared
    const conversationsId = import.meta.env.VITE_BREVO_CONVERSATIONS_ID || import.meta.env.VITE_BREVO_MA_KEY || 'gqq4aaawytrk7xx4oyj4s62z';
    if (!conversationsId) return;

    if (!window.BrevoConversations) {
      // Define window.BrevoConversationsSetup before loading the script
      window.BrevoConversationsSetup = {
        buttonPosition: 'br' // Bottom-Right position by default
      };

      (function(d, w, c) {
        w.BrevoConversationsID = conversationsId;
        w[c] = w[c] || function() {
          (w[c].q = w[c].q || []).push(arguments);
        };
        const s = d.createElement('script');
        s.async = true;
        s.src = 'https://conversations-widget.brevo.com/brevo-conversations.js';
        if (d.head) d.head.appendChild(s);
      })(document, window, 'BrevoConversations');
    }
  }, []);

  // Update integration data when a user logs in or updates their profile
  useEffect(() => {
    if (!window.BrevoConversations) return;

    if (seeker && seeker.email) {
      window.BrevoConversations('updateIntegrationData', {
        email: seeker.email,
        firstName: seeker.full_name?.split(' ')[0] || '',
        lastName: seeker.full_name?.split(' ').slice(1).join(' ') || '',
        phone: seeker.phone || '',
        userRole: 'seeker'
      });
    } else if (company && company.email) {
      window.BrevoConversations('updateIntegrationData', {
        email: company.email,
        firstName: company.name || '',
        userRole: 'recruiter'
      });
    } else if (developer && developer.email) {
      window.BrevoConversations('updateIntegrationData', {
        email: developer.email,
        firstName: developer.company_name || '',
        userRole: 'developer'
      });
    }
  }, [seeker, company, developer]);

  return null;
}
