import {create} from 'zustand'

export const useSessionStore = create((set) => ({
  currentSession: null,
  setCurrentSession: (s) => set({currentSession:s}),
  clearSession: () => set({currentSession:null})
}))
