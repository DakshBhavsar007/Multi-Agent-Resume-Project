"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { portalKeys } from "../../../lib/portalApi";
import { Plus } from "lucide-react";
import KeyCard from "../../../components/KeyCard";
import NewKeyModal from "../../../components/NewKeyModal";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs";

export default function KeysPage() {
  const [activeEnv, setActiveEnv] = useState("production");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: keys, refetch, isLoading } = useQuery({
    queryKey: ["portal-keys"],
    queryFn: portalKeys.list,
  });

  const filteredKeys = activeEnv === "test" ? (keys?.test_keys || []) : (keys?.production_keys || []);

  const tabs = {
    cURL: `curl -X POST \\
  https://api.vishleshan.ai/api/v1/parse \\
  -H "X-API-Key: YOUR_KEY" \\
  -F "files=@resume.pdf"`,
    Python: `import requests

response = requests.post(
    "https://api.vishleshan.ai/api/v1/parse",
    headers={"X-API-Key": "YOUR_KEY"},
    files={"files": open("resume.pdf", "rb")}
)
print(response.json())`,
    JavaScript: `const formData = new FormData();
formData.append('files', resumeFile);

const response = await fetch('https://api.vishleshan.ai/api/v1/parse', {
  method: 'POST',
  headers: { 'X-API-Key': 'YOUR_KEY' },
  body: formData
});
const data = await response.json();`
  };
  const [activeTab, setActiveTab] = useState("cURL");

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
           <h1 className="text-3xl font-black text-charcoal">API Keys</h1>
           <p className="text-gray-500 font-medium mt-1">Manage your keys for authenticating API requests.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-accent text-white px-5 py-2.5 rounded-xl font-bold hover:bg-accent-dark transition-all shadow-md shadow-accent/20">
           <Plus size={18} /> New Key
        </button>
      </div>

      {/* ENVIRONMENT TOGGLE */}
      <div className="flex p-1 bg-white border border-gray-200 rounded-xl w-fit mb-8 shadow-sm">
         <button onClick={() => setActiveEnv("production")} className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeEnv === "production" ? "bg-gray-100 text-charcoal" : "text-gray-500 hover:text-charcoal"}`}>Production Keys</button>
         <button onClick={() => setActiveEnv("test")} className={`px-6 py-2 text-sm font-bold rounded-lg transition-all ${activeEnv === "test" ? "bg-gray-100 text-charcoal" : "text-gray-500 hover:text-charcoal"}`}>Test Keys</button>
      </div>

      {/* KEY CARDS */}
      <div className="flex flex-col gap-6 mb-16">
         {isLoading ? (
            <div className="flex flex-col gap-4">
              {[1,2,3].map(i => <div key={i} className="w-full h-40 bg-gray-100 rounded-2xl animate-pulse"></div>)}
            </div>
         ) : filteredKeys.length > 0 ? (
            filteredKeys.map(k => <KeyCard key={k.id} api_key={k} onUpdate={refetch} />)
         ) : (
            <div className="w-full text-center py-12 bg-white border border-gray-200 rounded-2xl flex flex-col items-center">
               <div className="text-4xl mb-4 text-gray-300">🔑</div>
               <h3 className="text-lg font-bold text-gray-600 mb-1">No {activeEnv} keys found</h3>
               <p className="text-sm font-medium text-gray-400 mb-4">Generate your first key to start making requests.</p>
               <button onClick={() => setIsModalOpen(true)} className="text-accent font-bold hover:underline">Create Key +</button>
            </div>
         )}
      </div>

      {/* INTEGRATION QUICKSTART */}
      <div className="bg-[#1E1E1E] rounded-2xl overflow-hidden shadow-xl border border-gray-800">
         <div className="p-6 border-b border-gray-700">
            <h3 className="font-bold text-white text-lg">Quick Integration Guide</h3>
            <p className="text-gray-400 text-sm mt-1">Make your first parse request using your API key.</p>
         </div>
         <div className="flex bg-[#2D2D2D] border-b border-gray-700 px-2">
           {Object.keys(tabs).map(tab => (
              <button 
               key={tab} 
               onClick={() => setActiveTab(tab)}
               className={`px-6 py-3 text-sm font-semibold transition-colors ${activeTab === tab ? 'text-accent border-b-2 border-accent bg-[#1E1E1E]' : 'text-gray-400 hover:text-white'}`}
              >
                {tab}
              </button>
           ))}
         </div>
         <div className="p-6 relative text-sm">
            <SyntaxHighlighter language={activeTab === "Python" ? "python" : activeTab === "cURL" ? "bash" : "javascript"} style={vs2015} customStyle={{ background: "transparent", padding: 0, margin: 0, lineHeight: "1.6" }}>
              {tabs[activeTab]}
            </SyntaxHighlighter>
         </div>
      </div>

      {/* MODAL */}
      <NewKeyModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={refetch} />
    </div>
  );
}
