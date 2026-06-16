import {create} from 'zustand'

export const useChatStore = create((set) => ({
  isOpen: true,
  history: [],
  toggleChat: () => set(s => ({isOpen:!s.isOpen})),
  addMessage: ({ role, content, referenced = [] }) =>
    set(s => ({
      history: [...s.history, { role, content, referenced }]
    })),
  clearHistory: () => set({history:[]}),
  setHistory: (h) => set({history:h})
}))
