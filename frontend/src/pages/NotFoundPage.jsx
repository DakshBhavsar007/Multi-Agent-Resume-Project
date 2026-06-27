import React from "react";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, AlertCircle } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative ambient backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl -z-10" />

      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-3xl inline-flex items-center justify-center">
            <AlertCircle size={48} className="animate-pulse" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-8xl font-black tracking-tighter bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
            404
          </h1>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Page Not Found
          </h2>
          <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: '#d1d5db' }}>
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#2563eb] hover:bg-blue-700 text-white font-medium text-sm px-6 py-2.5 rounded-full transition-all shadow-lg hover:shadow-blue-500/20"
          >
            <Home size={16} />
            Go to Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-gray-800 hover:bg-gray-900 text-gray-300 hover:text-white font-medium text-sm px-6 py-2.5 rounded-full transition-all"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
}
