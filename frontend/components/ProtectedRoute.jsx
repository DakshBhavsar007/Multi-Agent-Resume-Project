"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const user = localStorage.getItem("vishleshan_user");
    if (user) {
      setAuthorized(true);
    } else {
      router.replace("/login");
    }
    setChecked(true);
  }, [router]);

  // Don't flash content before the check completes
  if (!checked) return null;
  if (!authorized) return null;

  return <>{children}</>;
}
