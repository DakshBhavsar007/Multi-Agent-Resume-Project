"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * ProtectedRoute — wraps children and only renders them if
 * "between_user" exists in localStorage.
 *
 * Otherwise redirects to /login.
 *
 * Usage in a layout or page:
 *   <ProtectedRoute>
 *     <DashboardContent />
 *   </ProtectedRoute>
 */
export default function ProtectedRoute({ children }) {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const userRaw = localStorage.getItem("between_user");
    const jwt = localStorage.getItem("vish_jwt");

    if (userRaw && jwt) {
      try {
        const user = JSON.parse(userRaw);
        // Block admin user or admin token from entering recruiter dashboard
        if (user.role === "admin" || user.is_admin || user.id === "admin") {
          // If logged in as admin, redirect to admin dashboard, else to recruiter login
          const adminJwt = localStorage.getItem("admin_jwt");
          if (adminJwt) {
            navigate("/admin/dashboard", { replace: true });
          } else {
            localStorage.removeItem("between_user");
            localStorage.removeItem("vish_jwt");
            navigate("/login", { replace: true });
          }
          return;
        }
        setAuthorized(true);
      } catch (e) {
        navigate("/login", { replace: true });
      }
    } else {
      navigate("/login", { replace: true });
    }
    setChecked(true);
  }, [navigate]);

  // Don't flash content before the check completes
  if (!checked) return null;
  if (!authorized) return null;

  return <>{children}</>;
}
