import {create} from 'zustand'

export const useCandidateStore = create((set,get) => ({
  highlightedIds: [],
  activeFilters: {},
  
  setHighlightedIds: (ids) => set({highlightedIds:ids}),
  
  setHighlightedIdsWithTimeout: (ids,ms=5000) => {
    set({highlightedIds:ids})
    setTimeout(() => set({highlightedIds:[]}), ms)
  },
  
  setFilter: (key,val) => set(s => ({
    activeFilters:{...s.activeFilters,[key]:val}
  })),
  
  clearFilters: () => set({activeFilters:{}})
}))
