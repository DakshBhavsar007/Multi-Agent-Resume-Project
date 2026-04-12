"use client";
import React from "react";
import { useQuery } from '@tanstack/react-query';
import { portalUsage } from "../lib/portalApi";
import { usePortalAuthStore } from "../stores/portalAuthStore";

export default function UsageProgress() {
  const { jwt, tier } = usePortalAuthStore();
  
  const { data: summary } = useQuery({
    queryKey: ["portal-summary"],
    queryFn: portalUsage.summary,
    enabled: !!jwt,
    refetchInterval: 60000 // Refresh every minute
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
      <div className="flex justify-between items-center mb-3">
        <div className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
          tier === "business" ? "bg-purple-100 text-purple-700" : 
          tier === "starter" ? "bg-blue-100 text-blue-700" : 
          "bg-gray-200 text-gray-700"
        }`}>
          {tier} Plan
        </div>
      </div>
      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-1.5 relative">
        <div 
          className="absolute top-0 left-0 bg-accent h-full transition-all duration-500" 
          style={{ width: `${summary?.percentages?.parse || 0}%` }}
        ></div>
      </div>
      <div className="flex justify-between text-[11px] font-bold text-gray-400 mb-0">
        <span>{(summary?.limits?.parse?.count || 0).toLocaleString()} / {(summary?.limits?.parse?.limit || 100).toLocaleString()} parses</span>
      </div>
    </div>
  );
}
