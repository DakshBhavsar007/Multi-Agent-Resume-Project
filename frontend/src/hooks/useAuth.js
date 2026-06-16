"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * useAuth — reads "vishleshan_user" from localStorage.
 *
 * If not found → redirect to /login.
 * Returns { user, logout } where logout clears localStorage and redirects.
 *
 * Usage:
 *   const { user, logout } = useAuth();
 */
export function useAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("vishleshan_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed);
      } else {
        navigate("/login");
      }
    } catch {
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const logout = () => {
    localStorage.removeItem("vishleshan_user");
    localStorage.removeItem("vish_jwt");
    localStorage.removeItem("vish_company");
    localStorage.removeItem("vish_api_key");
    navigate("/login");
  };

  return { user, loading, logout };
}
