"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import SyntaxHighlighter from "react-syntax-highlighter";
import { vs2015 } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { Play } from "lucide-react";
import { toast } from "react-hot-toast";

const SECTIONS = [
  { id: "getting-started", title: "Getting Started" },
  { id: "authentication", title: "Authentication" },
  { id: "sessions", title: "Sessions" },
  { id: "resume-ingestion", title: "Resume Ingestion", 
    sub: [
       { id: "file-upload", title: "File Upload" },
       { id: "gmail-sync", title: "Gmail Sync" },
       { id: "google-drive", title: "Google Drive" },
       { id: "ats-import", title: "ATS Import" },
    ]
  },
  { id: "candidates", title: "Candidates" },
  { id: "job-matching", title: "Job Matching" },
  { id: "ai-chatbot", title: "AI Chatbot" },
  { id: "webhooks", title: "Webhooks" },
  { id: "rate-limits", title: "Rate Limits & Errors" },
  { id: "sdks", title: "SDKs & Examples" }
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("getting-started");
  const [playgroundOpen, setPlaygroundOpen] = useState(false);
  const [pgEndpoint, setPgEndpoint] = useState(null);

  const scrollTo = (id) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openPlayground = (endpoint) => {
     setPgEndpoint(endpoint);
     setPlaygroundOpen(true);
  };

  return (
    <div className="w-full flex">
      {/* LEFT NAV */}
      <nav className="hidden lg:block w-64 shrink-0 pr-8 sticky top-8 max-h-[calc(100vh-64px)] overflow-y-auto custom-scrollbar">
         <h2 className="text-xl font-black text-charcoal mb-6">Documentation</h2>
         <ul className="flex flex-col gap-1.5 text-sm font-semibold">
           {SECTIONS.map(sec => (
             <li key={sec.id}>
               <button 
                 onClick={() => scrollTo(sec.id)} 
                 className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${activeSection === sec.id ? "bg-accent/10 text-accent" : "text-gray-500 hover:text-charcoal hover:bg-gray-100"}`}
               >
                 {sec.title}
               </button>
               {sec.sub && (
                 <ul className="flex flex-col gap-1 mt-1 mb-2 ml-4 border-l-2 border-gray-100 pl-2">
                   {sec.sub.map(subSec => (
                     <li key={subSec.id}>
                        <button 
                          onClick={() => scrollTo(subSec.id)} 
                          className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-colors ${activeSection === subSec.id ? "text-accent font-bold" : "text-gray-400 hover:text-charcoal"}`}
                        >
                          {subSec.title}
                        </button>
                     </li>
                   ))}
                 </ul>
               )}
             </li>
           ))}
         </ul>
      </nav>

      {/* RIGHT CONTENT */}
      <main className="flex-1 pb-32 max-w-4xl min-w-0 px-2 lg:px-8">
        <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:0.15}}>
          
          <section id="getting-started" className="mb-16 pt-8">
            <h1 className="text-4xl font-black text-charcoal mb-4">Getting Started</h1>
            <p className="text-gray-600 font-medium mb-6 leading-relaxed">
              Welcome to the Vishleshan Developer API. Our REST API allows you to programmatically ingest resumes, match candidate skills to job descriptions, interact with our AI-powered candidate querying chatbot, and stream structural entity extraction securely into your HR infrastructure.
            </p>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 mb-6">
              <h3 className="font-bold text-charcoal mb-4">Quick Start</h3>
              <ol className="flex flex-col gap-4 text-sm font-medium text-gray-600 list-decimal pl-4 marker:text-gray-400 marker:font-black">
                 <li><strong className="text-charcoal">Generate an API Key</strong> from the Keys dashboard.</li>
                 <li><strong className="text-charcoal">Send your first request</strong> attaching the <code className="bg-white border border-gray-200 rounded px-1.5">X-API-Key</code> header.</li>
                 <li><strong className="text-charcoal">Listen for Webhooks</strong> to be notified asynchronously when parsing completes.</li>
              </ol>
            </div>
          </section>

          <section id="authentication" className="mb-16 pt-8 border-t border-gray-200">
            <h2 className="text-3xl font-black text-charcoal mb-4">Authentication</h2>
            <p className="text-gray-600 font-medium mb-6 leading-relaxed">
              All API endpoints are authenticated using specific secret keys. Pass your key through the <code className="bg-gray-100 text-charcoal rounded px-1">X-API-Key</code> HTTP header.
            </p>
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 mb-6 text-sm font-semibold text-amber-800">
               Test keys have the prefix <code>vish_test_</code> and do not incur billing charges, but are tightly rate-limited. Production keys use <code>vish_live_</code>.
            </div>
            <SyntaxHighlighter language="bash" style={vs2015} customStyle={{ borderRadius: "12px", padding: "16px", fontSize: "13px" }}>
{`curl -X GET "https://api.vishleshan.ai/api/v1/sessions" \\
  -H "X-API-Key: vish_live_xxxxxxxx"`}
            </SyntaxHighlighter>
          </section>

          <section id="resume-ingestion" className="mb-16 pt-8 border-t border-gray-200">
            <h2 className="text-3xl font-black text-charcoal mb-4">Resume Ingestion</h2>
            
            <div id="file-upload" className="mb-12 pt-4">
              <div className="flex items-center gap-3 mb-4">
                 <span className="bg-amber-100 text-amber-600 font-black text-[10px] px-2 py-1 uppercase tracking-widest rounded">POST</span>
                 <h3 className="font-mono text-lg font-bold text-gray-800">/api/v1/parse</h3>
                 <button onClick={() => openPlayground({method:'POST', path:'/api/v1/parse'})} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors shadow-sm"><Play size={12}/> Try It</button>
              </div>
              <p className="text-gray-600 font-medium text-sm mb-6">Extracts structured data from a raw resume file synchronously.</p>
              
              <h4 className="font-bold text-charcoal text-sm uppercase mb-3 text-gray-400">Parameters</h4>
              <div className="overflow-x-auto mb-6">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="border-b-2 border-gray-100 text-charcoal font-bold bg-gray-50">
                      <th className="p-3 rounded-tl-xl">Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Required</th>
                      <th className="p-3 w-full rounded-tr-xl">Description</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-500 font-medium">
                    <tr className="border-b border-gray-50">
                      <td className="p-3 font-mono text-charcoal">file</td>
                      <td className="p-3 text-blue-500">binary</td>
                      <td className="p-3 text-red-500 font-bold">Yes</td>
                      <td className="p-3">The resume file. Supported: pdf, docx, txt.</td>
                    </tr>
                    <tr className="border-b border-gray-50">
                      <td className="p-3 font-mono text-charcoal">webhook_url</td>
                      <td className="p-3 text-blue-500">string</td>
                      <td className="p-3 text-gray-400">No</td>
                      <td className="p-3">URL to receive "resume.parsed" event.</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                 <div className="flex flex-col">
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 pl-1">Request</span>
                   <SyntaxHighlighter language="bash" style={vs2015} customStyle={{ borderRadius: "12px", padding: "16px", fontSize: "12px", flex: 1, margin: 0 }}>
{`curl -X POST "https://api.vishleshan.ai/api/v1/parse" \\
  -H "X-API-Key: YOUR_KEY" \\
  -F "file=@resume.pdf"`}
                   </SyntaxHighlighter>
                 </div>
                 <div className="flex flex-col">
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 pl-1">Response</span>
                   <SyntaxHighlighter language="json" style={vs2015} customStyle={{ borderRadius: "12px", padding: "16px", fontSize: "12px", flex: 1, margin: 0 }}>
{`{
  "success": true,
  "data": {
    "candidate_id": "cnd_12345",
    "status": "processing",
    "name": "Jane Doe",
    "skills": ["Python", "React"]
  }
}`}
                   </SyntaxHighlighter>
                 </div>
              </div>
            </div>
          </section>

          <section id="rate-limits" className="mb-16 pt-8 border-t border-gray-200">
            <h2 className="text-3xl font-black text-charcoal mb-4">Rate Limits & Errors</h2>
            <p className="text-gray-600 font-medium mb-6 leading-relaxed">
              Vishleshan uses standard HTTP response codes to indicate the success or failure of an API request.
            </p>
            
            <h4 className="font-bold text-charcoal text-sm uppercase mb-3 text-gray-400">Plan Quotas</h4>
            <div className="overflow-x-auto mb-8 border border-gray-200 rounded-xl">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-charcoal font-bold">
                    <th className="p-3">Tier</th>
                    <th className="p-3">Parses/mo</th>
                    <th className="p-3">Match Ops/mo</th>
                    <th className="p-3">Chat Queries/mo</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 font-medium">
                  <tr className="border-b border-gray-50"><td className="p-3 font-bold text-charcoal">Free</td><td className="p-3">100</td><td className="p-3">500</td><td className="p-3">100</td></tr>
                  <tr className="border-b border-gray-50"><td className="p-3 font-bold text-accent">Starter</td><td className="p-3">1,000</td><td className="p-3">10,000</td><td className="p-3">2,000</td></tr>
                  <tr className="border-b border-gray-0"><td className="p-3 font-bold text-blue-600">Business</td><td className="p-3">10,000</td><td className="p-3">Unlimited</td><td className="p-3">Unlimited</td></tr>
                </tbody>
              </table>
            </div>

            <h4 className="font-bold text-charcoal text-sm uppercase mb-3 text-gray-400">HTTP Status Codes</h4>
            <div className="overflow-x-auto mb-6">
               <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead>
                   <tr className="border-b-2 border-gray-100 text-charcoal font-bold">
                     <th className="pb-2 pr-4">Code</th>
                     <th className="pb-2 px-4">Status</th>
                     <th className="pb-2 pl-4 w-full">Meaning</th>
                   </tr>
                 </thead>
                 <tbody className="text-gray-500 font-medium">
                   <tr className="border-b border-gray-50">
                     <td className="py-2 pr-4 font-mono font-bold text-amber-600">400</td>
                     <td className="py-2 px-4">Bad Request</td>
                     <td className="py-2 pl-4">The request was unacceptable, often due to missing a required parameter.</td>
                   </tr>
                   <tr className="border-b border-gray-50">
                     <td className="py-2 pr-4 font-mono font-bold text-red-600">401</td>
                     <td className="py-2 px-4">Unauthorized</td>
                     <td className="py-2 pl-4">No valid API key provided.</td>
                   </tr>
                   <tr className="border-b border-gray-50">
                     <td className="py-2 pr-4 font-mono font-bold text-red-600">429</td>
                     <td className="py-2 px-4">Rate Limited</td>
                     <td className="py-2 pl-4">Too many requests hit the API or monthly quota exceeded.</td>
                   </tr>
                 </tbody>
               </table>
            </div>

            <SyntaxHighlighter language="json" style={vs2015} customStyle={{ borderRadius: "12px", padding: "16px", fontSize: "12px", margin: 0 }}>
{`// 429 Rate Limit Response payload
{
  "success": false,
  "error": "Monthly parse limit reached",
  "data": {
    "limit": 100,
    "used": 100,
    "tier": "free",
    "upgrade_url": "http://localhost:3001/portal/billing"
  }
}`}
            </SyntaxHighlighter>

          </section>

        </motion.div>
      </main>

      {/* PLAYGROUND MODAL */}
      {playgroundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm">
          <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden relative border border-gray-200 flex flex-col md:flex-row h-[500px]">
             
             <div className="w-full md:w-1/2 p-6 border-r border-gray-100 flex flex-col relative overflow-y-auto">
               <button onClick={()=>setPlaygroundOpen(false)} className="md:hidden absolute top-4 right-4 text-gray-400">✕</button>
               <h3 className="font-bold text-lg text-charcoal mb-6 flex items-center gap-2"><Play size={16} className="text-accent stroke-[3]" /> Live Playground</h3>
               
               <div className="flex flex-col gap-4">
                 <div className="flex flex-col gap-1.5">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">Endpoint</label>
                   <div className="flex font-mono text-sm border-2 border-gray-100 rounded-lg overflow-hidden bg-gray-50">
                     <div className="px-3 py-2 bg-amber-100 text-amber-700 font-bold">{pgEndpoint?.method}</div>
                     <div className="px-3 py-2 text-gray-600 font-medium w-full truncate">{pgEndpoint?.path}</div>
                   </div>
                 </div>
                 <div className="flex flex-col gap-1.5">
                   <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">API Key</label>
                   <input type="password" placeholder="vish_test_..." className="w-full px-3 py-2.5 bg-white border-2 border-gray-200 rounded-lg focus:border-accent outline-none font-mono text-sm" />
                 </div>
                 {pgEndpoint?.method === 'POST' && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest pl-1">File Body</label>
                      <input type="file" className="w-full px-3 py-2 bg-white border-2 border-gray-200 rounded-lg outline-none text-sm text-gray-500" />
                    </div>
                 )}
               </div>

               <button onClick={()=>toast('Cannot send live requests from playground right now',{icon:'🔧'})} className="mt-auto w-full bg-accent text-white py-3 rounded-xl font-bold hover:bg-accent-dark transition-all">Send Request</button>
             </div>
             
             <div className="w-full md:w-1/2 bg-[#1E1E1E] flex flex-col relative">
               <button onClick={()=>setPlaygroundOpen(false)} className="hidden md:block absolute top-4 right-4 text-gray-400 hover:text-white z-10 font-bold">✕</button>
               <div className="px-4 py-3 bg-[#2D2D2D] border-b border-gray-700 font-bold text-xs text-gray-400 uppercase tracking-widest">JSON Response</div>
               <div className="flex-1 overflow-y-auto p-4 text-sm text-gray-500 font-mono italic">
                 Hit "Send Request" to view output here...
               </div>
             </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
