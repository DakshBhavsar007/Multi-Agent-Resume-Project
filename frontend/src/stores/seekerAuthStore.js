import { create } from 'zustand';

const SEEKER_TOKEN_KEY = 'vish_seeker_token';
const SEEKER_DATA_KEY = 'vish_seeker_data';

export const useSeekerAuthStore = create((set, get) => ({
  seeker: null,
  seekerToken: '',
  isAuthenticated: false,

  setAuth: (data) => {
    const token = data.seeker_token || '';
    const seeker = data.seeker || null;
    if (token) localStorage.setItem(SEEKER_TOKEN_KEY, token);
    if (seeker) localStorage.setItem(SEEKER_DATA_KEY, JSON.stringify(seeker));
    set({ seeker, seekerToken: token, isAuthenticated: !!token });
  },

  updateSeeker: (updates) => {
    const current = get().seeker;
    const updated = { ...current, ...updates };
    localStorage.setItem(SEEKER_DATA_KEY, JSON.stringify(updated));
    set({ seeker: updated });
  },

  clearAuth: () => {
    localStorage.removeItem(SEEKER_TOKEN_KEY);
    localStorage.removeItem(SEEKER_DATA_KEY);
    set({ seeker: null, seekerToken: '', isAuthenticated: false });
    window.location.href = '/jobs/login';
  },

  initFromStorage: () => {
    const token = localStorage.getItem(SEEKER_TOKEN_KEY) || '';
    const seeker = JSON.parse(localStorage.getItem(SEEKER_DATA_KEY) || 'null');
    if (token && seeker) {
      set({ seeker, seekerToken: token, isAuthenticated: true });
    }
  },

  getToken: () => {
    return get().seekerToken || localStorage.getItem(SEEKER_TOKEN_KEY) || '';
  },
}));
