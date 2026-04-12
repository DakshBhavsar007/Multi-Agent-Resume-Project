import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { portalKeys } from "../lib/portalApi";
import { toast } from "react-hot-toast";
import CopyButton from "./CopyButton";

export default function NewKeyModal({ isOpen, onClose, onSuccess }) {
  const [keyName, setKeyName] = useState("");
  const [isTest, setIsTest] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [generatedKey, setGeneratedKey] = useState(null);
  const [showSecret, setShowSecret] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!keyName.trim()) return toast.error("Key name is required");
    setLoading(true);
    try {
      const resp = await portalKeys.generate({ key_name: keyName, environment: isTest ? "test" : "production" });
      setGeneratedKey(resp);
      toast.success("Key generated!");
      onSuccess();
    } catch (err) {
      toast.error(err.message || "Failed to generate key");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setKeyName("");
    setIsTest(false);
    setGeneratedKey(null);
    setShowSecret(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm">
          <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden relative">
            
            <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-charcoal"><X size={20}/></button>
            
            {generatedKey ? (
               <div className="p-8 flex flex-col items-center">
                 <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4"><CheckCircle size={32}/></div>
                 <h2 className="text-2xl font-black text-charcoal mb-2">New Key Generated</h2>
                 
                 <div className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 flex items-start gap-3">
                   <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                   <p className="text-sm font-semibold text-amber-800">Save your secret key securely. It will be shown <strong className="font-black">only once</strong>.</p>
                 </div>

                 <div className="w-full flex flex-col gap-4 mb-6">
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Public Key</span>
                      <div className="flex items-center gap-2 mt-1 bg-gray-50 border border-gray-200 rounded-lg p-2 px-3">
                        <code className="text-sm flex-1 text-gray-600 font-mono truncate">{generatedKey.public_key}</code>
                        <CopyButton text={generatedKey.public_key} />
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Secret Key</span>
                      <div className="flex items-center gap-2 mt-1 bg-gray-50 border border-gray-200 rounded-lg p-2 px-3">
                        <code className="text-sm flex-1 text-gray-600 font-mono truncate">
                          {showSecret ? generatedKey.secret_key : "••••••••••••••••••••••••"}
                        </code>
                        <button onClick={()=>setShowSecret(!showSecret)} className="text-gray-400 hover:text-charcoal">{showSecret ? <EyeOff size={16}/>: <Eye size={16}/>}</button>
                        <CopyButton text={generatedKey.secret_key} />
                      </div>
                    </div>
                 </div>

                 <div className="w-full flex flex-col gap-2">
                    <button onClick={() => {
                        navigator.clipboard.writeText(`API Key: ${generatedKey.key_name}\nPublic: ${generatedKey.public_key}\nSecret: ${generatedKey.secret_key}`);
                        toast.success("Copied both keys");
                    }} className="w-full py-3 rounded-xl border-2 border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-colors">Copy Both Keys</button>
                    <button onClick={handleClose} className="w-full py-3 rounded-xl bg-accent text-white font-bold hover:bg-accent-dark transition-colors">Done</button>
                 </div>
               </div>
            ) : (
               <div className="p-8">
                 <h2 className="text-2xl font-black text-charcoal mb-6">Create API Key</h2>
                 <form onSubmit={handleGenerate} className="flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                       <label className="text-sm font-semibold text-charcoal">Key Name*</label>
                       <input autoFocus type="text" placeholder="e.g. Production Backend" value={keyName} onChange={e=>setKeyName(e.target.value)} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none font-medium" />
                    </div>
                    
                    <div className="flex flex-col gap-2 mt-2">
                       <label className="text-sm font-semibold text-charcoal mb-1">Environment</label>
                       <div className="flex p-1 bg-gray-100 rounded-xl">
                          <button type="button" onClick={() => setIsTest(false)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isTest ? "bg-white shadow-sm text-charcoal" : "text-gray-500 hover:text-charcoal"}`}>Production</button>
                          <button type="button" onClick={() => setIsTest(true)} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isTest ? "bg-white shadow-sm text-charcoal" : "text-gray-500 hover:text-charcoal"}`}>Test</button>
                       </div>
                       <p className="text-xs font-medium text-gray-500 pl-1 mt-1">
                          {isTest ? "Test limits apply. Cannot be used for billing." : "Standard quotas apply. Ensure this key is kept securely."}
                       </p>
                    </div>

                    <button disabled={loading} type="submit" className="w-full mt-6 bg-accent text-white py-3.5 rounded-xl font-bold hover:bg-accent-dark transition-all disabled:opacity-50">
                       {loading ? "Generating..." : "Generate Key"}
                    </button>
                 </form>
               </div>
            )}
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
