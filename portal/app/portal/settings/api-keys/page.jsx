"use client";

import ApiKeySettings from "../../../../components/ApiKeySettings";
import OpenDashboardButton from "../../../../components/OpenDashboardButton";
import { usePortalAuthStore } from "../../../../stores/portalAuthStore";
import { useState } from "react";
import { Key, ExternalLink } from "lucide-react";

export default function ApiKeySettingsPage() {
  const { developer } = usePortalAuthStore();
  const [storedKey, setStoredKey] = useState("");

  const userId = developer?.id || developer?.company_id || "";

  return (
    <div className="w-full max-w-4xl mx-auto pb-12 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-charcoal">API Key Settings</h1>
        <p className="text-gray-500 font-medium mt-1">
          Generate keys and open the Vishleshan Dashboard directly.
        </p>
      </div>

      {/* Generate Key Section */}
      <ApiKeySettings userId={userId} />

      {/* Open Dashboard Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <h3 className="font-bold text-[#2A2A2A] mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
          <ExternalLink size={14} className="text-[#C8871A]" />
          Open Dashboard
        </h3>
        <p className="text-gray-500 text-sm font-medium mb-4">
          Paste your API key below to instantly open the Vishleshan Dashboard.
        </p>

        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={storedKey}
            onChange={(e) => setStoredKey(e.target.value)}
            placeholder="Paste your vsh_... key here"
            className="flex-1 px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-mono focus:border-[#C8871A] focus:outline-none bg-gray-50 transition-colors"
          />
          <OpenDashboardButton apiKey={storedKey} />
        </div>
      </div>
    </div>
  );
}
