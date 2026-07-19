import {create} from 'zustand'
export const useAuthStore = create((set) => ({
  company: null, apiKey: "", jwt: "", tier: "free",
  
  setAuth: (data) => {
    if (data) {
      localStorage.setItem("vish_jwt", data.jwt_token || "");
      localStorage.setItem("vish_api_key", data.api_key || data.secret_key || "");
      localStorage.setItem("vish_company", JSON.stringify(data));
      localStorage.setItem("between_user", JSON.stringify({
        id: data.id || data.company_id,
        user_id: data.id || data.company_id,
        email: data.email,
        name: data.name || data.email?.split("@")[0] || "User",
        tier: data.tier || "free",
        role: data.role || (data.is_admin ? "admin" : "recruiter"),
        is_admin: data.is_admin || false
      }));
    }
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
      if (!localStorage.getItem("between_user")) {
        localStorage.setItem("between_user", JSON.stringify({
          id: company.id || company.company_id,
          user_id: company.id || company.company_id,
          email: company.email,
          name: company.name || company.email?.split("@")[0] || "User",
          tier: company.tier || "free",
          role: company.role || (company.is_admin ? "admin" : "recruiter"),
          is_admin: company.is_admin || false
        }));
      }
    }
  }
}))
