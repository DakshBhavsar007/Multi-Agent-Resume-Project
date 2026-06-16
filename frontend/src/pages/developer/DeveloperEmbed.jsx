import React, { useState } from "react";
import { Link } from "react-router-dom";
import { usePortalAuthStore } from "../../stores/portalAuthStore";
import { useQuery } from "@tanstack/react-query";
import { Plus, X, Component, Shield, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import CopyButton from "../../components/CopyButton";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs";

export default function DeveloperEmbed() {
  const { tier } = usePortalAuthStore();
  const isBusiness = tier === "business" || tier === "enterprise";

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  
  // New Token State
  const [domain, setDomain] = useState("");
  const [permissions, setPermissions] = useState({ read: true, upload: false, chat: false });

  // Mock token fetch
  const { data: tokens, refetch } = useQuery({
    queryKey: ["embed-tokens"],
    queryFn: async () => [{
      id: "tok_123", domain: "hrms.yourcompany.com", token: "vish_embed_abc••••", perms: ["read", "upload"], created: "10 Mar 2026"
    }],
    enabled: isBusiness
  });

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!domain) return toast.error("Domain required");
    toast.success("Embed Token Generated");
    setIsNewModalOpen(false);
    refetch();
  };

  const codeSnippets = {
    HTML: `<div id="vishleshan-panel"></div>
<script src="https://cdn.vishleshan.ai/embed.js"></script>
<script>
Vishleshan.init({
  token: "vish_embed_xxxxx",
  container: "#vishleshan-panel",
  sessionId: "your-session-id",
  theme: "light"
});
</script>`,
    React: `import { VishleshanPanel } from '@vishleshan/react';

export default function CandidateView() {
  return (
    <VishleshanPanel
      token="vish_embed_xxxxx"
      sessionId="your-session-id"
      theme="light"
    />
  );
}`,
    Vue: `<template>
  <VishleshanPanel
    token="vish_embed_xxxxx"
    sessionId="your-session-id"
    theme="light"
  />
</template>

<script setup>
import { VishleshanPanel } from '@vishleshan/vue';
</script>`
  };
  const [activeTab, setActiveTab] = useState("HTML");

  if (!isBusiness) {
    return (
      <div className="w-full max-w-5xl mx-auto flex items-center justify-center min-h-[60vh] relative">
         <div className="bg-white border-2 border-gray-100 rounded-3xl p-10 max-w-lg w-full flex flex-col items-center text-center shadow-2xl relative z-10">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-6"><Component size={32} /></div>
            <h2 className="text-2xl font-black text-charcoal mb-3">Embed requires Business plan</h2>
            <p className="text-gray-500 font-medium mb-8">Drop in a beautifully styled React component to instantly bring AI resume parsing and matching directly into your UI.</p>
            <Link to="/developer/portal/billing" className="w-full py-4 bg-accent text-white font-bold rounded-2xl hover:bg-accent-dark transition-all text-center">Upgrade to Business &rarr;</Link>
         </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
           <h1 className="text-3xl font-black text-charcoal">Embed UI</h1>
           <p className="text-gray-500 font-medium mt-1">Configure your domains to mount Vishleshan directly inside your app.</p>
        </div>
      </div>

      {/* WHAT IS EMBED */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 mb-8 flex items-start gap-4 shadow-sm">
        <Component className="text-amber-500 shrink-0 mt-1" size={24} />
        <div>
          <h3 className="font-bold text-amber-900 text-lg mb-1">Embed the Vishleshan panel directly in your HR platform.</h3>
          <p className="text-amber-800 font-medium text-sm">Your users get AI-powered candidate intelligence without ever leaving your application. Manage access per domain below securely.</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6 mt-12">
         <h2 className="text-xl font-bold text-charcoal">Embed Tokens</h2>
         <button onClick={() => setIsNewModalOpen(true)} className="flex items-center gap-2 bg-charcoal text-white px-5 py-2.5 rounded-xl font-bold hover:bg-black transition-all shadow-md">
            <Plus size={18} /> Generate Token
         </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {tokens?.map(tok => (
          <div key={tok.id} className="bg-white border border-gray-200 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
             <div>
               <div className="flex items-center gap-2 mb-2">
                 <Shield className="text-gray-400" size={18} />
                 <h3 className="font-bold text-lg text-charcoal">{tok.domain}</h3>
               </div>
               <div className="flex items-center gap-2 text-sm">
                 <code className="bg-gray-100 text-gray-600 px-2 py-1 rounded font-mono font-medium">{tok.token}</code>
                 <CopyButton text={tok.token} />
               </div>
             </div>
             
             <div className="flex flex-col gap-3">
                 <div className="flex gap-2">
                   {tok.perms.map(p => <span key={p} className="bg-blue-50 text-blue-600 border border-blue-200 text-[10px] uppercase font-black px-2 py-0.5 rounded-full">{p}</span>)}
                 </div>
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Created {tok.created}</span>
              </div>

             <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
               <button onClick={()=>setIsCodeModalOpen(true)} className="flex-1 md:flex-none px-4 py-2 border-2 border-charcoal text-charcoal font-bold rounded-xl hover:bg-gray-100 transition-colors whitespace-nowrap">Get Code</button>
               <button className="flex-1 md:flex-none px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-xl transition-colors">Revoke</button>
             </div>
          </div>
        ))}
      </div>

      {/* GENERATE TOKEN MODAL */}
      <AnimatePresence>
        {isNewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm">
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative p-8">
              <button onClick={() => setIsNewModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-charcoal"><X size={20}/></button>
              
              <h2 className="text-2xl font-black text-charcoal mb-6">Create Embed Token</h2>
              <form onSubmit={handleGenerate} className="flex flex-col gap-6">
                <div>
                  <label className="text-sm font-semibold text-charcoal block mb-1">Allowed Domain*</label>
                  <input autoFocus type="text" placeholder="hrms.yourcompany.com" value={domain} onChange={e=>setDomain(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-medium text-sm" />
                  <p className="text-xs font-medium text-gray-400 mt-1 ml-1">No http://, just the domain name.</p>
                </div>

                <div>
                   <label className="text-sm font-semibold text-charcoal block mb-2">Permissions</label>
                   <div className="flex flex-col gap-3">
                     <label className="flex items-center gap-3 cursor-pointer">
                       <input type="checkbox" checked={permissions.read} onChange={e=>setPermissions({...permissions, read: e.target.checked})} className="w-4 h-4 accent-accent" />
                       <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Read</span><span className="text-xs text-gray-400 font-medium">View candidates and match scores</span></div>
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer">
                       <input type="checkbox" checked={permissions.upload} onChange={e=>setPermissions({...permissions, upload: e.target.checked})} className="w-4 h-4 accent-accent" />
                       <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Upload</span><span className="text-xs text-gray-400 font-medium">Allow resume file uploads from the UI</span></div>
                     </label>
                     <label className="flex items-center gap-3 cursor-pointer">
                       <input type="checkbox" checked={permissions.chat} onChange={e=>setPermissions({...permissions, chat: e.target.checked})} className="w-4 h-4 accent-accent" />
                       <div className="flex flex-col"><span className="text-sm font-bold text-gray-700">Chat</span><span className="text-xs text-gray-400 font-medium">Enable AI chatbot queries</span></div>
                     </label>
                   </div>
                </div>

                <button type="submit" className="w-full mt-2 bg-accent text-white py-3.5 rounded-xl font-bold hover:bg-accent-dark transition-all">Generate Token</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* GET CODE MODAL */}
      <AnimatePresence>
        {isCodeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm">
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="bg-[#1E1E1E] rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden relative border border-gray-800">
              <button onClick={() => setIsCodeModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white z-10"><X size={20}/></button>
              
              <div className="flex bg-[#2D2D2D] border-b border-gray-700 px-4 pt-4">
                 {Object.keys(codeSnippets).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 text-sm font-semibold transition-colors ${activeTab === tab ? 'text-accent border-b-2 border-accent bg-[#1E1E1E]' : 'text-gray-400 hover:text-white'}`}>
                      {tab}
                    </button>
                 ))}
              </div>
              <div className="p-6 relative">
                 <button onClick={() => {navigator.clipboard.writeText(codeSnippets[activeTab]); toast.success("Code copied!")}} className="absolute top-6 right-6 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded shadow transition-colors font-sans">Copy Code</button>
                 <SyntaxHighlighter language={activeTab.toLowerCase() === "html" ? "html" : "javascript"} style={vs2015} customStyle={{ background: "transparent", padding: 0, margin: 0, fontSize: "14px", lineHeight: "1.5" }}>
                   {codeSnippets[activeTab]}
                 </SyntaxHighlighter>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
