"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("vishleshan_user");
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed);
      } else {
        router.push("/login");
      }
    } catch {
      router.push("/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = () => {
    localStorage.removeItem("vishleshan_user");
    localStorage.removeItem("vish_jwt");
    localStorage.removeItem("vish_company");
    localStorage.removeItem("vish_api_key");
    router.push("/login");
  };

  return { user, loading, logout };
}
