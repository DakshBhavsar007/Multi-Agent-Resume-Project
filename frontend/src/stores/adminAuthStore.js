import { create } from 'zustand';

export const useAdminAuthStore = create((set) => ({
  adminToken: localStorage.getItem("admin_jwt") || "",
  adminUser: JSON.parse(localStorage.getItem("admin_user") || "null"),

  setAdminAuth: (data) => {
    if (data) {
      const token = data.jwt_token || "";
      const user = {
        id: "admin",
        email: data.email,
        name: data.name || "Between Admin",
        role: "admin"
      };
      localStorage.setItem("admin_jwt", token);
      localStorage.setItem("admin_user", JSON.stringify(user));
      set({
        adminToken: token,
        adminUser: user
      });
    }
  },

  clearAdminAuth: () => {
    localStorage.removeItem("admin_jwt");
    localStorage.removeItem("admin_user");
    set({ adminToken: "", adminUser: null });
  },

  initFromStorage: () => {
    const token = localStorage.getItem("admin_jwt") || "";
    const user = JSON.parse(localStorage.getItem("admin_user") || "null");
    set({ adminToken: token, adminUser: user });
  }
}));
