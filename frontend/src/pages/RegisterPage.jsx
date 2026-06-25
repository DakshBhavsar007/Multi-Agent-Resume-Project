import React from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle, Copy, Check, Sparkles, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { authAPI } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiKeys, setApiKeys] = useState(null);
  
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedPublic, setCopiedPublic] = useState(false);
  const [savedKeys, setSavedKeys] = useState(false);
  
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const jwt = localStorage.getItem("vish_jwt");
    if (jwt) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData(s => ({ ...s, [e.target.name]: e.target.value }));
  };

  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/\d/.test(pass)) score++;
    if (/[!@#$%^&*]/.test(pass)) score++;
    return score;
  };

  const getStrengthColor = (score) => {
    if (score === 0) return "bg-gray-200";
    if (score === 1) return "bg-red-500";
    if (score === 2) return "bg-amber-500";
    return "bg-green-500";
  };

  const getStrengthLabel = (score) => {
    if (score === 0) return "";
    if (score === 1) return "Weak";
    if (score === 2) return "Fair";
    return "Strong";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    
    setLoading(true);
    setError("");
    try {
      const payload = {
        name: formData.companyName,
        email: formData.email,
        password: formData.password
      };
      const res = await authAPI.register(payload);
      setApiKeys(res);
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else if (type === 'public') {
      setCopiedPublic(true);
      setTimeout(() => setCopiedPublic(false), 2000);
    }
  };

  const handleCopyBoth = () => {
    const text = `Secret Key: ${apiKeys?.secret_key}\nPublic Key: ${apiKeys?.api_key || apiKeys?.public_key}`;
    navigator.clipboard.writeText(text);
    toast.success("Both keys copied!");
  };

  const goToDashboard = () => {
    if (!savedKeys) return;
    if (apiKeys) {
      setAuth(apiKeys);
      localStorage.setItem("vish_jwt", apiKeys.jwt_token);
      localStorage.setItem("vish_api_key", apiKeys.api_key || "");
      localStorage.setItem("vish_company", JSON.stringify(apiKeys));
    }
    navigate("/dashboard");
  };

  const strengthScore = calculateStrength(formData.password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream py-12">
      <div className="bg-white p-12 rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.1)] w-[440px] max-w-[90vw]">
        
        {step === 1 && (
          <>
            <div className="text-center mb-8">
              <span className="text-accent text-3xl font-bold tracking-tight">
                Between
              </span>
              <h1 className="text-xl font-semibold text-charcoal mt-4">Create your account</h1>
              <p className="text-muted text-sm mt-1">Start hiring smarter with AI</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Company Name</label>
                <input
                  type="text" name="companyName" value={formData.companyName} onChange={handleChange}
                  className="w-full p-3 border-[1.5px] border-gray-200 rounded-lg text-[15px] focus:border-accent focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Work Email</label>
                <input
                  type="email" name="email" value={formData.email} onChange={handleChange}
                  className="w-full p-3 border-[1.5px] border-gray-200 rounded-lg text-[15px] focus:border-accent focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"} name="password"
                    value={formData.password} onChange={handleChange}
                    className="w-full p-3 border-[1.5px] border-gray-200 rounded-lg text-[15px] focus:border-accent focus:outline-none transition-colors pr-12"
                    required
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                
                {formData.password.length > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${getStrengthColor(strengthScore)} transition-all duration-300`} style={{width: `${(strengthScore/3)*100}%`}}></div>
                    </div>
                    <span className={`text-xs ${strengthScore === 3 ? 'text-green-600' : 'text-gray-500'}`}>
                      {getStrengthLabel(strengthScore)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                    className="w-full p-3 border-[1.5px] border-gray-200 rounded-lg text-[15px] focus:border-accent focus:outline-none transition-colors pr-12"
                    required
                  />
                  <button
                    type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-accent transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <button
                type="submit" disabled={loading}
                className="w-full h-12 mt-6 bg-accent hover:bg-[#1D4ED8] text-white rounded-lg font-semibold transition-colors flex items-center justify-center disabled:opacity-70"
              >
                {loading ? <><Loader2 className="animate-spin mr-2" size={20} /> Loading...</> : "Create Account"}
              </button>
            </form>

            <div className="text-center text-sm text-charcoal mt-6">
              Already have an account?{" "}
              <a href="/login" className="text-accent font-medium hover:underline">Sign in &rarr;</a>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="flex flex-col">
            <motion.div 
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="flex justify-center mb-4 text-green-500"
            >
              <CheckCircle size={64} />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-center text-charcoal mb-6 flex items-center justify-center gap-2">
              <span>Account Created!</span>
              <Sparkles className="text-amber-500" size={24} />
            </h2>
            
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg mb-6 flex items-start gap-3 text-red-800 text-sm">
              <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <p>Save your API keys now — they will never be shown again after you leave this page.</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5 flex justify-between">
                  <span>Secret Key (keep private)</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type={showSecretKey ? "text" : "password"}
                    readOnly
                    value={apiKeys?.secret_key || "vish_live_secretkey"}
                    className="flex-1 p-2 border-[1.5px] border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none font-mono"
                  />
                  <button onClick={() => setShowSecretKey(!showSecretKey)} className="px-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-medium">
                    {showSecretKey ? "Hide" : "Show"}
                  </button>
                  <button onClick={() => handleCopy(apiKeys?.secret_key, 'secret')} className="px-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-sm font-medium flex items-center gap-1 min-w-[90px] justify-center">
                    {copiedSecret ? <><Check size={16}/> Copied!</> : <><Copy size={16}/> Copy</>}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Public Key (safe for frontend)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={apiKeys?.api_key || apiKeys?.public_key || "vish_pub_publickey"}
                    className="flex-1 p-2 border-[1.5px] border-gray-200 rounded-lg text-sm bg-gray-50 focus:outline-none font-mono"
                  />
                  <button onClick={() => handleCopy(apiKeys?.api_key || apiKeys?.public_key, 'public')} className="px-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg text-sm font-medium flex items-center gap-1 min-w-[90px] justify-center">
                    {copiedPublic ? <><Check size={16}/> Copied!</> : <><Copy size={16}/> Copy</>}
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={handleCopyBoth}
              className="w-full py-2 mb-6 border-2 border-accent text-accent font-medium rounded-lg hover:bg-blue-50 transition-colors"
            >
              Copy Both Keys
            </button>

            <label className="flex items-center gap-2 mb-6 cursor-pointer">
              <input 
                type="checkbox" 
                checked={savedKeys}
                onChange={(e) => setSavedKeys(e.target.checked)}
                className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent accent-[#2563EB]"
              />
              <span className="text-sm font-medium text-charcoal">✓ I have saved my API keys securely</span>
            </label>

            <button
              onClick={goToDashboard}
              disabled={!savedKeys}
              className="w-full h-12 bg-accent hover:bg-[#1D4ED8] text-white rounded-lg font-semibold transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Go to Dashboard &rarr;
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
