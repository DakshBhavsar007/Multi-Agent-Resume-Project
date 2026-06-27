import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { authAPI, billingAPI } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import PageTransition from '../components/PageTransition';
import { 
  Building, 
  Key, 
  Upload, 
  X, 
  Plus, 
  Copy, 
  Trash2, 
  Bell, 
  User, 
  Check, 
  Lock,
  CreditCard,
  AlertTriangle
} from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const { company, clearAuth, tier, setAuth } = useAuthStore();
  const [companyName, setCompanyName] = useState(company?.name || '');
  const [logo, setLogo] = useState(localStorage.getItem('vish_company_logo') || '');

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };
  
  const [activeTab, setActiveTab] = useState(tabFromUrl || 'api-keys'); // 'profile' | 'api-keys' | 'notifications' | 'account' | 'billing'
  const [copiedKeyId, setCopiedKeyId] = useState(null);
  
  // New key modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState('production');

  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    // Dynamically load Razorpay
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const { data: keysData, refetch: refetchKeys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => authAPI.getKeys(),
    retry: false
  });

  const { data: plans } = useQuery({
    queryKey: ["recruiter-billing-plans"],
    queryFn: billingAPI.plans,
    initialData: [
      { id: "free", name: "Starter Plan", price: 0, features: ["One active session", "Up to 100 resumes", "Basic AI screening", "Standard support"] },
      { id: "business", name: "Business Plan", price: 1499, features: ["Five active sessions", "Up to 2,000 resumes", "Advanced matching", "API access"] },
      { id: "enterprise", name: "Enterprise Plan", price: 3999, features: ["Unlimited sessions", "Priority VIP support", "Custom integrations", "Advanced analytics"] }
    ]
  });

  const { data: currentSub, refetch: refetchSub } = useQuery({
    queryKey: ["recruiter-billing-current"],
    queryFn: async () => {
      try {
        return await billingAPI.current();
      } catch (e) {
        return { plan: company?.tier || tier || "free", status: "active" };
      }
    }
  });

  const [loadingPlan, setLoadingPlan] = useState(null);
  const [cancelModal, setCancelModal] = useState(false);

  const handleUpgrade = async (planId) => {
    setLoadingPlan(planId);
    try {
      const orderData = await billingAPI.subscribe(planId);
      if (orderData.order_id.startsWith("order_mock_")) {
         setTimeout(async () => {
           try {
             await billingAPI.verifyPayment({
               razorpay_payment_id: "pay_mock_" + Math.random().toString(36).substring(7),
               razorpay_order_id: orderData.order_id,
               razorpay_signature: "sig_mock_" + Math.random().toString(36).substring(7),
               plan: planId
             });
             toast.success("Successfully upgraded plan (Mock Mode)!");
             
             const updatedCompany = { ...company, tier: planId, jwt_token: localStorage.getItem("vish_jwt") };
             setAuth(updatedCompany);
             refetchSub();
             window.location.reload();
           } catch (err) {
             toast.error("Mock upgrade verification failed");
             setLoadingPlan(null);
           }
         }, 1000);
         return;
      }

      const rzp = new window.Razorpay({
        key: orderData.razorpay_key_id || "rzp_test_mock",
        order_id: orderData.order_id,
        name: "Between",
        description: `Upgrade to ${planId.toUpperCase()} Plan`,
        theme: { color: "#111111" },
        handler: async function(response) {
          try {
            await billingAPI.verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              plan: planId
            });
            toast.success("Successfully upgraded plan!");
            
            const updatedCompany = { ...company, tier: planId, jwt_token: localStorage.getItem("vish_jwt") };
            setAuth(updatedCompany);
            refetchSub();
            window.location.reload();
          } catch (err) {
            toast.error("Payment verification failed");
          }
        }
      });

      rzp.on('payment.failed', function () { toast.error("Payment failed"); setLoadingPlan(null); });
      rzp.open();
    } catch (e) {
      toast.error(e.message || "Failed to initiate payment");
      setLoadingPlan(null);
    }
  };

  const handleCancel = async () => {
    try {
      await billingAPI.cancel();
      toast.success("Subscription cancelled. Downgraded to Starter Plan.");
      setCancelModal(false);
      
      const updatedCompany = { ...company, tier: "free", jwt_token: localStorage.getItem("vish_jwt") };
      setAuth(updatedCompany);
      refetchSub();
      window.location.reload();
    } catch (e) {
      toast.error(e.message || "Failed to cancel subscription");
    }
  };

  const activePlan = currentSub?.plan || company?.tier || tier || "free";

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Image must be smaller than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogo('');
  };

  const handleSave = () => {
    if (logo) {
      localStorage.setItem('vish_company_logo', logo);
    } else {
      localStorage.removeItem('vish_company_logo');
    }
    window.dispatchEvent(new Event('company_logo_updated'));
    toast.success("Settings saved");
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }
    try {
      await authAPI.generateKey({
        key_name: newKeyName,
        environment: newKeyEnv
      });
      toast.success("API key generated successfully");
      setShowCreateModal(false);
      setNewKeyName('');
      refetchKeys();
    } catch (err) {
      toast.error(err.message || "Failed to generate key");
    }
  };

  const handleCopyKey = (keyString, id) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKeyId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const keys = Array.isArray(keysData) ? keysData : [];

  const tabItems = [
    { id: 'profile', label: 'Company profile', icon: Building },
    { id: 'api-keys', label: 'API keys', icon: Key },
    { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: User },
  ];

  return (
    <PageTransition className="max-w-6xl mx-auto py-8 px-4 w-full overflow-y-auto h-full space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-black text-charcoal tracking-tight">Settings</h1>
        <p className="text-sm font-medium text-gray-500 mt-1">Manage your account, API keys, and company profile.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* LEFT TAB BAR */}
        <div className="w-full lg:w-64 bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible">
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs tracking-wide transition-all text-left whitespace-nowrap lg:whitespace-normal w-full ${
                  isSelected 
                    ? 'bg-blue-50 text-accent border border-blue-100/50' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-charcoal'
                }`}
              >
                <Icon size={16} className={isSelected ? 'text-accent' : 'text-gray-400'} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* RIGHT CONTENT CARD */}
        <div className="flex-1 w-full">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-gray-100 p-8 space-y-6">
              <h2 className="text-md font-bold text-charcoal flex items-center gap-2 pb-4 border-b border-gray-100">
                <Building className="w-5 h-5 text-accent" /> Company profile
              </h2>
              
              <div className="space-y-5 max-w-lg">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-0.5">Admin Email</label>
                  <input type="text" value={company?.email || 'N/A'} readOnly className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-0.5">Company Name</label>
                  <input 
                    type="text" 
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)} 
                    className="w-full p-3 bg-white border border-gray-200 focus:border-accent rounded-xl text-sm font-bold text-charcoal focus:outline-none transition-colors" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-0.5">Company Logo / Profile Image</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 relative group shadow-inner">
                      {logo ? (
                        <>
                          <img src={logo} alt="Preview" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={handleRemoveLogo} 
                            className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            title="Remove logo"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <Building className="w-8 h-8 text-gray-300" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="cursor-pointer bg-gray-50 hover:bg-gray-100 text-charcoal border border-gray-200 px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm inline-block w-max">
                        <Upload size={12} className="inline mr-1.5" /> Upload Image
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoChange} 
                          className="hidden" 
                        />
                      </label>
                      <span className="text-[9px] text-gray-400 font-medium">PNG, JPG or SVG up to 2MB</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-0.5">Account Tier</label>
                  <span className="inline-block bg-blue-50 border border-blue-100 text-accent font-black px-3 py-1.5 rounded-xl text-[10px] uppercase tracking-widest">
                    {company?.tier || 'Free'}
                  </span>
                </div>
                <div className="pt-4">
                  <button onClick={handleSave} className="bg-[#2A2A2A] hover:bg-black text-white px-6 py-3 rounded-xl text-xs font-bold shadow-md transition-colors w-full sm:w-auto">
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-gray-100 p-8 space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                <h2 className="text-md font-bold text-charcoal flex items-center gap-2">
                  <Key className="w-5 h-5 text-accent" /> API keys
                </h2>
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-2 bg-accent hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-sm active:scale-95"
                >
                  <Plus size={14} /> Create key
                </button>
              </div>

              {/* Keys List */}
              {keys.length > 0 ? (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden shadow-inner">
                  {keys.map((key, i) => (
                    <div key={key.id || i} className="flex items-center justify-between p-4 hover:bg-gray-50/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-accent flex items-center justify-center shrink-0">
                          <Key size={16} />
                        </div>
                        <div>
                          <span className="font-bold text-sm text-charcoal">{key.key_name || 'API Key'}</span>
                          <div className="text-[11px] text-gray-500 font-mono mt-0.5 tracking-tight">
                            {key.secret_key ? `${key.secret_key.slice(0, 16)}••••••••${key.secret_key.slice(-4)}` : `${key.public_key?.slice(0, 16)}...`}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right hidden sm:block">
                          <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                            key.environment === 'production' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-yellow-50 text-yellow-600 border-yellow-100'
                          }`}>
                            {key.environment || 'production'}
                          </span>
                          <div className="text-[9px] text-gray-400 font-medium mt-1">
                            Created {key.created_at ? new Date(key.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'recently'}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleCopyKey(key.secret_key || key.public_key, key.id)}
                            className="p-2 text-gray-400 hover:text-charcoal hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copy API key"
                          >
                            {copiedKeyId === key.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                          </button>
                          <button 
                            onClick={async () => {
                              if (window.confirm("Permanently revoke this API key? This cannot be undone.")) {
                                try {
                                  await authAPI.deleteKey(key.id);
                                  toast.success("API key revoked");
                                  refetchKeys();
                                } catch(e) { toast.error(e.message); }
                              }
                            }}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Revoke key"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 text-sm py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <p className="font-semibold text-gray-500">No API keys generated yet.</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">Generate a credentials pair to authenticate your developer platform calls.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-gray-100 p-8 space-y-6">
              <h2 className="text-md font-bold text-charcoal flex items-center gap-2 pb-4 border-b border-gray-100">
                <Bell className="w-5 h-5 text-accent" /> Notifications
              </h2>
              <div className="divide-y divide-gray-100">
                {[
                  { label: "New candidate applied", desc: "Get notified when a candidate joins a session.", defaultVal: true },
                  { label: "Weekly digest", desc: "A summary of activity across sessions.", defaultVal: false },
                  { label: "Fraud alerts", desc: "Immediate alert when a suspicious resume is flagged.", defaultVal: true },
                ].map((it, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0">
                    <div>
                      <div className="font-bold text-sm text-charcoal">{it.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{it.desc}</div>
                    </div>
                    <ToggleSwitch defaultOn={it.defaultVal} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-gray-100 p-8 space-y-6">
              <h2 className="text-md font-bold text-charcoal flex items-center gap-2 pb-4 border-b border-gray-100">
                <User className="w-5 h-5 text-accent" /> Account
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-0.5">Admin Full name</label>
                  <input type="text" className="w-full p-3 bg-white border border-gray-200 focus:border-accent rounded-xl text-sm font-bold text-charcoal focus:outline-none transition-colors" defaultValue={company?.name ? `${company.name} Administrator` : "Admin"} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-0.5">Email</label>
                  <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium focus:outline-none" defaultValue={company?.email || "admin@company.com"} readOnly />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-0.5">Role</label>
                  <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 font-medium focus:outline-none" defaultValue="Owner / Admin" readOnly />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block pl-0.5">Language</label>
                  <input type="text" className="w-full p-3 bg-white border border-gray-200 focus:border-accent rounded-xl text-sm font-bold text-charcoal focus:outline-none transition-colors" defaultValue="English (US)" />
                </div>
              </div>
              <div className="border-t border-gray-100 pt-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="font-bold text-sm text-charcoal">Sign out of workspace</div>
                  <div className="text-xs text-gray-500 mt-0.5">You'll need to sign in again to access the dashboard.</div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl border border-red-200 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors shrink-0"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}

          {activeTab === 'billing' && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-gray-100 p-8 space-y-6">
              <h2 className="text-md font-bold text-charcoal flex items-center gap-2 pb-4 border-b border-gray-100">
                <CreditCard className="w-5 h-5 text-accent" /> Recruiter subscription
              </h2>

              {/* Current plan card */}
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-accent"></div>
                <div className="flex flex-col gap-2 pl-2">
                  <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest pl-0.5">Current Plan</span>
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-charcoal flex items-center gap-3">
                      <CreditCard size={24} className="text-accent" /> {plans.find(p=>p.id===activePlan)?.name || (activePlan.charAt(0).toUpperCase() + activePlan.slice(1)) + " Plan"}
                    </h2>
                    <span className="bg-green-100 text-green-700 text-[9px] uppercase font-black px-2 py-0.5 rounded-full">● {currentSub?.status || "Active"}</span>
                  </div>
                  {activePlan !== "free" && (
                    <p className="text-gray-500 font-medium text-xs mt-1">₹{plans.find(p=>p.id===activePlan)?.price.toLocaleString()}/month. Status is active.</p>
                  )}
                </div>
                {activePlan !== "free" && (
                  <button onClick={() => setCancelModal(true)} className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">Cancel Plan</button>
                )}
              </div>

              {/* Comparison grid */}
              <div>
                <h3 className="font-bold text-md text-charcoal mb-4">Available recruiter plans</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {plans.map(p => {
                    const isActive = activePlan === p.id;
                    return (
                      <div key={p.id} className={`flex flex-col border rounded-2xl p-6 bg-white transition-all relative overflow-hidden ${isActive ? "border-accent shadow-[0_4px_20px_rgba(59,130,246,0.15)]" : "border-gray-100"}`}>
                        {isActive && <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>}
                        
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-bold text-charcoal">{p.name}</h3>
                          {isActive && <span className="bg-blue-50 text-accent text-[9px] font-black uppercase px-2 py-0.5 rounded-md">Current</span>}
                        </div>
                        
                        <div className="mb-4 pb-4 border-b border-gray-100">
                           <span className="text-3xl font-black text-charcoal">₹{p.price}</span>
                           <span className="text-gray-500 font-medium text-xs">/month</span>
                        </div>
                        
                        <ul className="flex flex-col gap-2.5 font-medium text-xs text-gray-500 mb-6 flex-1">
                          {p.features.map(f => (
                            <li key={f} className="flex gap-2 items-start">
                              <Check size={14} className="text-green-500 shrink-0 mt-0.5" /> 
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>

                        {!isActive && (
                          <button 
                            disabled={loadingPlan === p.id}
                            onClick={() => handleUpgrade(p.id)} 
                            className="w-full py-2.5 rounded-xl font-bold text-xs bg-charcoal text-white hover:bg-black transition-all disabled:opacity-50"
                          >
                            {loadingPlan === p.id ? "Processing..." : `Upgrade to ${p.name.split(" ")[0]}`}
                          </button>
                        )}
                        {isActive && (
                          <div className="w-full py-2.5 rounded-xl font-bold text-xs bg-gray-50 text-gray-400 text-center cursor-default">
                            Current Plan
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cancel Modal */}
              {cancelModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/40 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative p-6 space-y-4">
                    <div className="w-12 h-12 bg-red-100 text-red-500 rounded-full flex items-center justify-center"><AlertTriangle size={24}/></div>
                    <div>
                      <h2 className="text-lg font-black text-charcoal">Cancel Subscription?</h2>
                      <p className="text-gray-500 font-medium text-xs leading-relaxed mt-1">
                        Downgrading will revert your account to the Starter Plan tier. You will lose access to premium active sessions and increased resume capacity.
                      </p>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button onClick={()=>setCancelModal(false)} className="flex-1 py-2.5 bg-gray-100 text-gray-500 font-bold rounded-xl hover:bg-gray-200 text-xs transition-colors">Keep Plan</button>
                      <button onClick={handleCancel} className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 text-xs transition-colors shadow-md shadow-red-500/20">Yes, Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* NEW API KEY GENERATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-charcoal">Create New API Key</h3>
                <p className="text-xs text-gray-400 mt-0.5">Generate credentials for your external client calls.</p>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-charcoal transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Key Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Production Client, Staging Key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="w-full p-3 bg-white border border-gray-200 focus:border-accent rounded-xl text-sm font-bold text-charcoal focus:outline-none transition-colors"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Environment</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewKeyEnv('production')}
                    className={`py-2 px-4 rounded-xl border text-xs font-bold transition-all ${
                      newKeyEnv === 'production' 
                        ? 'border-accent bg-blue-50 text-accent' 
                        : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Production
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewKeyEnv('test')}
                    className={`py-2 px-4 rounded-xl border text-xs font-bold transition-all ${
                      newKeyEnv === 'test' 
                        ? 'border-accent bg-blue-50 text-accent' 
                        : 'border-gray-200 text-gray-500 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Test / Sandbox
                  </button>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="py-2.5 px-4 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-5 bg-accent hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageTransition>
  );
}

function ToggleSwitch({ defaultOn }) {
  const [on, setOn] = useState(!!defaultOn);
  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      className={`w-12 h-7 rounded-full p-0.5 transition shrink-0 ${on ? "bg-accent" : "bg-gray-100 border border-gray-200"}`}
    >
      <span className={`block w-6 h-6 bg-white rounded-full shadow transition-transform ${on ? "translate-x-5" : "translate-x-0 border border-gray-200/50"}`} />
    </button>
  );
}

