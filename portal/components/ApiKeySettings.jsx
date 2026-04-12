"use client";

import { useState } from "react";
import { toast } from "react-hot-toast";
import { Key, Copy, AlertTriangle, Plus, CheckCircle, Eye, EyeOff, Shield } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ApiKeySettings({ userId }) {
  const [loading, setLoading] = useState(false);
  const [generatedKey, setGeneratedKey] = useState(null);
  const [label, setLabel] = useState("My Key");
  const [copied, setCopied] = useState(false);
  const [showKey, setShowKey] = useState(true);

  const handleGenerate = async () => {
    if (!userId) {
      toast.error("User ID is required");
      return;
    }

    setLoading(true);
    setGeneratedKey(null);

    try {
      const res = await fetch(`${API_BASE}/auth/generate-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, label }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to generate key");
      }

      setGeneratedKey(data.data.api_key);
      toast.success("API key generated successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to generate key");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    toast.success("Key copied to clipboard");
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-[#2A2A2A] flex items-center gap-3">
          <Shield size={24} className="text-[#C8871A]" />
          API Key Settings
        </h2>
        <p className="text-gray-500 font-medium mt-1">
          Generate keys to authenticate with the Vishleshan Dashboard.
        </p>
      </div>

      {/* Generate Section */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-6">
        <h3 className="font-bold text-[#2A2A2A] mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
          <Key size={14} className="text-[#C8871A]" />
          Generate New Key
        </h3>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Key label (e.g. Production, Testing)"
            className="flex-1 px-4 py-2.5 border-2 border-gray-100 rounded-xl text-sm font-medium focus:border-[#C8871A] focus:outline-none bg-gray-50 transition-colors"
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-6 py-2.5 bg-[#C8871A] text-white rounded-xl font-bold text-sm hover:bg-[#A06B10] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-orange-500/20 flex items-center gap-2"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <Plus size={16} strokeWidth={3} />
            )}
            {loading ? "Generating..." : "Generate Key"}
          </button>
        </div>
      </div>

      {/* Generated Key Display */}
      {generatedKey && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-black text-amber-800 text-sm">
                Save This Key — Shown Only Once
              </h4>
              <p className="text-amber-700 text-xs font-medium mt-1">
                Copy and store this key securely. Once you close this page, you will NOT be able to see it again.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-amber-200 p-4 flex items-center gap-3">
            <code className="flex-1 text-sm font-mono text-[#2A2A2A] break-all select-all">
              {showKey ? generatedKey : "•".repeat(generatedKey.length)}
            </code>

            <button
              onClick={() => setShowKey(!showKey)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors shrink-0"
              title={showKey ? "Hide key" : "Show key"}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>

            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 ${
                copied
                  ? "bg-green-100 text-green-700 border border-green-200"
                  : "bg-gray-100 text-[#2A2A2A] hover:bg-gray-200 border border-gray-200"
              }`}
            >
              {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
