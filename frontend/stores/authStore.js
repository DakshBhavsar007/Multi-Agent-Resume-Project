import {create} from 'zustand'
export const useAuthStore = create((set) => ({
  company: null, apiKey: "", jwt: "", tier: "free",
  
  setAuth: (data) => {
    set({
      company: data,
      apiKey: data.api_key || data.secret_key || "",
      jwt: data.jwt_token || "",
      tier: data.tier || "free"
    })
  },
  
  clearAuth: () => {
    localStorage.clear()
    set({company:null,apiKey:"",jwt:"",tier:"free"})
    window.location.href="/login"
  },
  
  initFromStorage: () => {
    const company = JSON.parse(
      localStorage.getItem("vish_company") || "null"
    )
    const jwt = localStorage.getItem("vish_jwt") || ""
    const apiKey = localStorage.getItem("vish_api_key")||""
    if (company && jwt) {
      set({company, jwt, apiKey, 
           tier: company.tier || "free"})
    }
  }
}))
