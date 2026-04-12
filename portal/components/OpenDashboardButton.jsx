"use client";

import { useState } from "react";
import { ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function OpenDashboardButton({ apiKey }) {
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    if (!apiKey) {
      toast.error("No API key available. Generate one first.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/token-from-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Invalid API key");
      }

      // Open the Vishleshan dashboard in a new tab via the redirect URL
      const redirectUrl = data.data.redirect_url;
      window.open(redirectUrl, "_blank");

      toast.success("Opening Vishleshan Dashboard...");
    } catch (err) {
      toast.error(err.message || "Invalid API key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleOpen}
      disabled={loading || !apiKey}
      className="group relative px-8 py-3.5 bg-gradient-to-r from-[#C8871A] to-[#A06B10] text-white rounded-xl font-black text-sm shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all flex items-center gap-2.5"
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          Authenticating...
        </>
      ) : (
        <>
          Open Vishleshan Dashboard
          <ExternalLink size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </>
      )}
    </button>
  );
}
