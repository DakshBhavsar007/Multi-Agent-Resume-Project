"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * ProtectedRoute — wraps children and only renders them if
 * "vishleshan_user" exists in localStorage.
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
    const user = localStorage.getItem("vishleshan_user");
    if (user) {
      setAuthorized(true);
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
