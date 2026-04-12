"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2, Shield } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AuthVerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState("verifying"); // verifying | success | error
  const [errorMsg, setErrorMsg] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setErrorMsg("No token provided in the URL.");
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || "Verification failed");
        }

        const userData = data.data;

        // Save to localStorage for the portal session
        localStorage.setItem("vishleshan_user", JSON.stringify(userData));

        // Also store the raw JWT so the portal can use it for API calls
        localStorage.setItem("portal_jwt", token);
        localStorage.setItem(
          "portal_dev",
          JSON.stringify({
            email: userData.email,
            id: userData.user_id,
          })
        );

        setUser(userData);
        setStatus("success");

        // Navigate to the portal dashboard after a brief success display
        setTimeout(() => {
          router.push("/portal/dashboard");
        }, 1500);
      } catch (err) {
        setStatus("error");
        setErrorMsg(err.message || "Token invalid or expired");
      }
    })();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-10 max-w-md w-full text-center">
        {status === "verifying" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-6">
              <Loader2 size={32} className="text-[#C8871A] animate-spin" />
            </div>
            <h2 className="text-xl font-black text-[#2A2A2A] mb-2">
              Verifying Your Identity
            </h2>
            <p className="text-gray-500 font-medium text-sm">
              Validating your login token...
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-black text-[#2A2A2A] mb-2">
              Welcome Back!
            </h2>
            <p className="text-gray-500 font-medium text-sm mb-1">
              Authenticated as <strong className="text-[#2A2A2A]">{user?.email}</strong>
            </p>
            <p className="text-xs text-gray-400 font-medium mt-3">
              Redirecting to dashboard...
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
              <XCircle size={32} className="text-red-500" />
            </div>
            <h2 className="text-xl font-black text-[#2A2A2A] mb-2">
              Token Invalid or Expired
            </h2>
            <p className="text-gray-500 font-medium text-sm mb-6">
              {errorMsg}
            </p>
            <button
              onClick={() => router.push("/login")}
              className="px-6 py-2.5 bg-[#C8871A] text-white rounded-xl font-bold text-sm hover:bg-[#A06B10] transition-colors"
            >
              Back to Login
            </button>
          </>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          <Shield size={12} /> Vishleshan Secure Auth
        </div>
      </div>
    </div>
  );
}
