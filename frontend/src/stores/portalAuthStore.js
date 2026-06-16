import {create} from 'zustand'

export const usePortalAuthStore = create((set) => ({
  developer: null, 
  jwt: "", 
  tier: "free",
  company_name: "",
  
  setAuth: (d) => {
    set({
      developer: d, 
      jwt: d.jwt_token || "",
      tier: d.tier || "free",
      company_name: d.company_name || ""
    })
  },
  
  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("portal_jwt")
      localStorage.removeItem("portal_dev")
      window.location.href = "/developer/login"
    }
    set({developer: null, jwt: "", tier: "free"})
  },
  
  initFromStorage: () => {
    if (typeof window !== "undefined") {
      const jwt = localStorage.getItem("portal_jwt") || ""
      const dev = JSON.parse(localStorage.getItem("portal_dev") || "null")
      if (jwt && dev) {
        set({
          jwt, 
          developer: dev,
          tier: dev.tier || "free",
          company_name: dev.company_name || ""
        })
      }
    }
  }
}))
