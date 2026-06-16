import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import { Check, Copy, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { portalAuth, portalBilling } from "../../lib/portalApi";
import { usePortalAuthStore } from "../../stores/portalAuthStore";

export default function DeveloperRegisterPage() {
  const [step, setStep] = useState(1);
  const navigate = useNavigate();
  const { setAuth } = usePortalAuthStore();

  // Form State
  const [form, setForm] = useState({ company_name: "", email: "", password: "", website_url: "" });
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState("starter");
  const [loading, setLoading] = useState(false);
  const [apiKeysData, setApiKeysData] = useState(null);

  // UI state
  const [showTestSecret, setShowTestSecret] = useState(false);
  const [showLiveSecret, setShowLiveSecret] = useState(false);
  const [keysSaved, setKeysSaved] = useState(false);

  useEffect(() => {
    // Dynamically load Razorpay
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    portalBilling.plans()
      .then(d => { if (d && d.length > 0) setPlans(d); })
      .catch(e => {
        setPlans([
          { id: "free", name: "Free", price: 0, features: ["100 free parses/month", "Community support", "Basic formatting", "No SLA"] },
          { id: "starter", name: "Starter", price: 2999, features: ["1000 parses/month", "Email support", "All output formats", "99% uptime"] },
          { id: "business", name: "Business", price: 9999, features: ["10000 parses/month", "Priority support", "Custom prompts", "99.9% uptime SLA"] }
        ]);
      });

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleStep1 = (e) => {
    e.preventDefault();
    if (!form.company_name || !form.email || !form.password) {
      return toast.error("Please fill all required fields");
    }
    setStep(2);
  };

  const proceedWithRegistration = async () => {
    setLoading(true);
    try {
      const data = await portalAuth.register({...form, tier: selectedPlan});
      setApiKeysData(data); // Expecting keys and credentials
      setStep(3);
    } catch (e) {
      toast.error(e.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async () => {
    const planDetails = plans.find(p => p.id === selectedPlan);
    if (!planDetails) return;

    // Temporarily bypass Razorpay integration. 
    // Directly proceed to registration with the selected tier limits.
    await proceedWithRegistration();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const copyAllKeys = () => {
    const text = `Vishleshan API Keys\n\nTest Public: ${apiKeysData?.test_public_key || '...'}\nTest Secret: ${apiKeysData?.test_secret_key || '...'}\n\nLive Public: ${apiKeysData?.public_key || '...'}\nLive Secret: ${apiKeysData?.secret_key || '...'}`;
    copyToClipboard(text);
  };

  const finishSetup = () => {
    if (!keysSaved) return toast.error("Please confirm you have saved the keys");
    setAuth(apiKeysData);
    if (typeof window !== "undefined" && apiKeysData?.jwt_token) {
      localStorage.setItem("portal_jwt", apiKeysData.jwt_token);
      localStorage.setItem("portal_dev", JSON.stringify(apiKeysData));
    }
    navigate("/developer/portal/dashboard");
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center font-sans p-6 pb-20 pt-10">
      
      {/* STEP 1 */}
      {step === 1 && (
        <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl shadow-gray-200/50 border border-gray-100">
          <div className="mb-8 text-center">
             <h1 className="text-3xl font-black text-charcoal mb-2">Get your API Key</h1>
             <p className="text-gray-500 font-medium tracking-tight">Start integrating Vishleshan in minutes</p>
          </div>
          <form onSubmit={handleStep1} className="flex flex-col gap-4">
             <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-charcoal">Company Name*</label>
                <input autoFocus type="text" value={form.company_name} onChange={e=>setForm({...form, company_name:e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-medium" required />
             </div>
             <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-charcoal">Work Email*</label>
                <input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-medium" required />
             </div>
             <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-charcoal">Password*</label>
                <input type="password" value={form.password} onChange={e=>setForm({...form, password:e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-medium" required minLength={8}/>
                <div className="flex gap-1 mt-1">
                  <div className={`h-1 w-1/3 rounded-full ${form.password.length > 0 ? "bg-red-400" : "bg-gray-200"}`}></div>
                  <div className={`h-1 w-1/3 rounded-full ${form.password.length > 5 ? "bg-amber-400" : "bg-gray-200"}`}></div>
                  <div className={`h-1 w-1/3 rounded-full ${form.password.length > 8 ? "bg-green-400" : "bg-gray-200"}`}></div>
                </div>
             </div>
             <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-charcoal">Website URL (optional)</label>
                <input type="url" placeholder="https://" value={form.website_url} onChange={e=>setForm({...form, website_url:e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-medium" />
             </div>
             <button type="submit" className="w-full mt-4 bg-accent text-white py-3.5 rounded-xl font-bold hover:bg-accent-dark transition-all shadow-md shadow-accent/20">
                Continue &rarr;
              </button>
             <p className="text-center text-sm font-medium text-gray-500 mt-4">Already have an account? <Link to="/developer/login" className="text-accent hover:underline">Sign In</Link></p>
          </form>
        </motion.div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} className="w-full max-w-5xl">
           <div className="text-center mb-12">
             <h1 className="text-3xl lg:text-4xl font-black text-charcoal mb-3">Choose your plan</h1>
             <p className="text-gray-500 font-medium">Select a tier that fits your usage.</p>
           </div>
           <div className="grid md:grid-cols-3 gap-6">
             {plans.map(p => (
               <div key={p.id} onClick={() => setSelectedPlan(p.id)} className={`cursor-pointer border-2 rounded-3xl p-6 bg-white transition-all ${selectedPlan === p.id ? "border-accent shadow-xl shadow-amber-500/10 scale-105" : "border-gray-100 hover:border-gray-300"}`}>
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-xl font-bold uppercase">{p.name}</h3>
                   {p.id === "starter" && <span className="bg-amber-100 text-amber-800 text-[10px] font-black uppercase px-2 py-1 rounded-full">Popular</span>}
                   {selectedPlan === p.id && <Check className="text-accent" />}
                 </div>
                 <div className="mb-6 border-b border-gray-100 pb-6">
                   <span className="text-4xl font-black">₹{p.price}</span>
                   <span className="text-gray-500 font-medium text-sm">/month</span>
                 </div>
                 <ul className="flex flex-col gap-3 font-medium text-sm text-gray-600 mb-8 min-h-[160px]">
                   {p.features.map(f => (
                     <li key={f} className="flex gap-2 items-start"><Check size={16} className="text-green-500 shrink-0 mt-0.5" /> <span>{f}</span></li>
                   ))}
                 </ul>
                 <button className={`w-full py-3 rounded-xl font-bold ${selectedPlan === p.id ? "bg-accent text-white" : "bg-gray-100 text-charcoal"}`}>
                   {selectedPlan === p.id ? "Selected ✓" : "Select Plan"}
                 </button>
               </div>
             ))}
           </div>
           <div className="mt-12 flex justify-center sticky bottom-4">
              <button disabled={loading} onClick={handleSelectPlan} className="bg-charcoal text-white px-10 py-4 rounded-full font-bold shadow-2xl hover:bg-black transition-all flex items-center gap-3 disabled:opacity-50">
                {loading ? "Processing..." : `Pay \u20B9${plans.find(p=>p.id===selectedPlan)?.price || '0'} & Register →`}
              </button>
           </div>
           <p className="text-center mt-4 text-sm font-medium text-gray-500">
             <button onClick={()=>setStep(1)} className="hover:text-charcoal hover:underline">← Back to Details</button>
           </p>
        </motion.div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <motion.div initial={{opacity:0, scale:0.9}} animate={{opacity:1, scale:1}} className="w-full max-w-4xl bg-white rounded-3xl p-10 shadow-2xl shadow-gray-200/50">
           <div className="flex flex-col items-center mb-8">
              <motion.div initial={{scale:0}} animate={{scale:1}} className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6">
                <Check size={40} className="stroke-[3]" />
              </motion.div>
              <h1 className="text-4xl font-black text-charcoal ">Welcome to Vishleshan!</h1>
            </div>

           <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-8 flex items-start gap-3">
             <AlertTriangle className="text-red-500 shrink-0 mt-0.5" />
             <div>
               <h4 className="font-bold text-red-800">Copy your secret keys NOW.</h4>
               <p className="text-sm font-medium text-red-600 mt-1">For security reasons, they will <strong className="font-black">NEVER</strong> be shown again. If you lose them, you will have to generate new keys.</p>
             </div>
           </div>

           <div className="grid md:grid-cols-2 gap-6 mb-8">
             {/* TEST KEYS */}
             <div className="border border-gray-200 rounded-2xl p-6 bg-gray-50 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gray-400"></div>
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">Test Keys <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full font-semibold">Development</span></h3>
                
                <div className="flex flex-col gap-3">
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Public Key</span>
                    <div className="flex items-center gap-2 mt-1 bg-white border border-gray-200 rounded-lg p-2 px-3">
                      <code className="text-sm flex-1 text-gray-600 font-mono truncate">{apiKeysData?.test_public_key || "vish_pub_test_..."}</code>
                      <button onClick={()=>copyToClipboard(apiKeysData?.test_public_key)} className="text-gray-400 hover:text-charcoal"><Copy size={16}/></button>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Secret Key</span>
                    <div className="flex items-center gap-2 mt-1 bg-white border border-gray-200 rounded-lg p-2 px-3">
                      <code className="text-sm flex-1 text-gray-600 font-mono truncate">
                        {showTestSecret ? (apiKeysData?.test_secret_key || "vish_test_...") : "••••••••••••••••••••••••"}
                      </code>
                      <button onClick={()=>setShowTestSecret(!showTestSecret)} className="text-gray-400 hover:text-charcoal mr-1">{showTestSecret ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                      <button onClick={()=>copyToClipboard(apiKeysData?.test_secret_key)} className="text-gray-400 hover:text-charcoal"><Copy size={16}/></button>
                    </div>
                  </div>
                </div>
             </div>

             {/* LIVE KEYS */}
             <div className="border-2 border-accent rounded-2xl p-6 bg-[#fffcf5] relative overflow-hidden shadow-lg shadow-amber-500/5">
                <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>
                <h3 className="font-bold text-accent-dark mb-4 flex items-center gap-2">Live Keys <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full font-semibold">Production</span></h3>
                
                <div className="flex flex-col gap-3">
                  <div>
                    <span className="text-xs font-bold text-accent uppercase tracking-widest pl-1">Public Key</span>
                    <div className="flex items-center gap-2 mt-1 bg-white border border-accent/20 rounded-lg p-2 px-3">
                      <code className="text-sm flex-1 text-gray-700 font-mono truncate">{apiKeysData?.public_key || apiKeysData?.api_key || "vish_pub_..."}</code>
                      <button onClick={()=>copyToClipboard(apiKeysData?.public_key || apiKeysData?.api_key)} className="text-gray-400 hover:text-charcoal"><Copy size={16}/></button>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-red-500 uppercase tracking-widest pl-1">Secret Key</span>
                    <div className="flex items-center gap-2 mt-1 bg-white border border-red-200 rounded-lg p-2 px-3">
                      <code className="text-sm flex-1 text-red-600 font-mono truncate font-bold">
                        {showLiveSecret ? (apiKeysData?.secret_key) : "••••••••••••••••••••••••"}
                      </code>
                      <button onClick={()=>setShowLiveSecret(!showLiveSecret)} className="text-gray-400 hover:text-charcoal mr-1">{showLiveSecret ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                      <button onClick={()=>copyToClipboard(apiKeysData?.secret_key)} className="text-gray-400 hover:text-charcoal"><Copy size={16}/></button>
                    </div>
                  </div>
                </div>
             </div>
           </div>

           <div className="flex flex-col items-center border-t border-gray-100 pt-8 mt-4 gap-6">
              <button onClick={copyAllKeys} className="px-6 py-2.5 rounded-xl border-2 border-charcoal font-bold text-charcoal hover:bg-gray-100 transition-colors flex gap-2 items-center">
                <Copy size={18} /> Copy All Keys
              </button>

              <label className="flex items-center gap-3 cursor-pointer bg-gray-50 border border-gray-200 px-5 py-3 rounded-xl select-none w-full justify-center max-w-lg">
                <input type="checkbox" checked={keysSaved} onChange={e=>setKeysSaved(e.target.checked)} className="w-5 h-5 accent-accent" />
                <span className="font-semibold text-charcoal">✓ I have securely saved all my API keys</span>
              </label>

              <button 
                onClick={finishSetup} 
                disabled={!keysSaved}
                className="w-full max-w-lg bg-accent text-white py-4 rounded-2xl font-bold tracking-wide hover:bg-accent-dark transition-all shadow-md shadow-accent/20 disabled:opacity-50 disabled:grayscale"
              >
                Go to Developer Dashboard &rarr;
              </button>
           </div>
        </motion.div>
      )}
    </div>
  );
}
