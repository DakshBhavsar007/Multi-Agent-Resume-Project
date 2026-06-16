import React, { useState } from "react";
import { Eye, EyeOff, Edit2, RotateCcw, Trash2, ChevronDown, ChevronUp, BarChart as BarChartIcon, Key } from "lucide-react";
import CopyButton from "../CopyButton";
import { portalKeys } from "../../lib/portalApi";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { toast } from "react-hot-toast";

export default function KeyCard({ api_key, onUpdate }) {
  const [showSecret, setShowSecret] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ["key-usage", api_key.id],
    queryFn: () => portalKeys.getUsage(api_key.id, "7d"),
    enabled: expanded
  });

  const handleRename = async () => {
    const newName = window.prompt("Enter new key name:", api_key.key_name);
    if (newName && newName.trim()) {
      try {
        await portalKeys.rename(api_key.id, { key_name: newName });
        toast.success("Key renamed successfully");
        onUpdate();
      } catch (e) {
        toast.error("Failed to rename key");
      }
    }
  };

  const handleRotate = async () => {
    if (window.confirm("Are you sure you want to rotate this secret key? The old key will immediately stop working!")) {
      try {
        const res = await portalKeys.rotate(api_key.id);
        toast.success("Key rotated successfully. Save your new secret!");
        window.prompt("Copy your new SECRET KEY now (it will only be shown this one time):", res.secret_key);
        onUpdate();
      } catch (e) {
        toast.error("Failed to rotate key");
      }
    }
  };

  const handleRevoke = async () => {
    if (window.confirm("Are you SURE you want to revoke this key? This action is permanent!")) {
      try {
        await portalKeys.revoke(api_key.id);
        toast.success("Key revoked");
        onUpdate();
      } catch (e) {
        toast.error("Failed to revoke key");
      }
    }
  };

  const formatDate = (ds) => ds ? new Date(ds).toLocaleDateString() : 'N/A';

  return (
    <div className={`bg-white border rounded-2xl p-6 shadow-sm transition-all ${!api_key.is_active ? 'opacity-75 grayscale' : 'border-gray-200'}`}>
      {/* HEADER ROW */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <Key size={20} className="text-gray-400" />
          <h3 className="font-bold text-lg text-charcoal">{api_key.key_name}</h3>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
            {api_key.environment === "test" ? "Test" : "Production"}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <div className={`w-2 h-2 rounded-full ${api_key.is_active ? "bg-green-500" : "bg-red-500"}`}></div>
          <span className={api_key.is_active ? "text-green-600" : "text-red-600"}>{api_key.is_active ? "Active" : "Revoked"}</span>
        </div>
      </div>

      {/* INFO ROW */}
      <div className="flex gap-8 text-[13px] font-medium text-gray-500 mb-8 pb-6 border-b border-gray-100">
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-[10px] uppercase tracking-wider font-bold">Created</span>
          <span>{formatDate(api_key.created_at)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-[10px] uppercase tracking-wider font-bold">Last Used</span>
          <span>{formatDate(api_key.last_used_at) || "Never"}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-gray-400 text-[10px] uppercase tracking-wider font-bold">This Month</span>
          <span>{api_key.this_month_calls || 0} calls</span>
        </div>
      </div>

      {/* KEY VALUES */}
      <div className="flex flex-col gap-4 mb-4">
        <div>
           <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Secret Key</label>
           <div className="flex items-center gap-2 mt-1 bg-gray-50 border border-gray-200 rounded-lg p-2 px-3">
             <input type="text" value={showSecret ? (api_key.secret_key || "") : (api_key.secret_key_masked || "••••••••••••••••••••••••")} readOnly className="text-sm flex-1 text-gray-600 font-mono bg-transparent outline-none truncate" />
             <button type="button" onClick={() => setShowSecret(!showSecret)} className="text-gray-400 hover:text-charcoal mr-1">
               {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
             </button>
             {showSecret && <CopyButton text={api_key.secret_key || ""} />}
           </div>
        </div>
        <div>
           <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Public Key</label>
           <div className="flex items-center gap-2 mt-1 bg-gray-50 border border-gray-200 rounded-lg p-2 px-3">
             <input type="text" value={api_key.public_key || ""} readOnly className="text-sm flex-1 text-gray-600 font-mono bg-transparent outline-none truncate" />
             <CopyButton text={api_key.public_key || ""} />
           </div>
        </div>
      </div>

      {/* USAGE MINI CHART */}
      <div className="mt-6 border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50">
        <button onClick={() => setExpanded(!expanded)} className="w-full px-4 py-3 flex text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors items-center justify-between">
          <span className="flex items-center gap-2"><BarChartIcon size={16} /> {expanded ? "Hide Usage" : "Show Usage"} (Last 7 Days)</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expanded && (
           <div className="p-4 h-[160px] bg-white border-t border-gray-100">
              {usageLoading ? (
                 <div className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-400">Loading data...</div>
              ) : usageData && usageData.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usageData} margin={{top:5, right:5, bottom:0, left:-25}}>
                       <XAxis dataKey="date" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                       <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                       <Tooltip cursor={{fill: '#F5F0E8'}} contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                       <Bar dataKey="calls" fill="#C8871A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                 </ResponsiveContainer>
              ) : (
                 <div className="w-full h-full flex items-center justify-center text-sm font-medium text-gray-400">No usage recorded</div>
              )}
           </div>
        )}
      </div>

      {/* ACTIONS ROW */}
      {api_key.is_active && (
        <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
          <button onClick={handleRename} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"><Edit2 size={14}/> Rename</button>
          <button onClick={handleRotate} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><RotateCcw size={14}/> Rotate Secret</button>
          <button onClick={handleRevoke} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14}/> Revoke</button>
        </div>
      )}
    </div>
  );
}
