import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { authAPI } from '../lib/api';
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
  Lock 
} from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { company } = useAuthStore();
  const [companyName, setCompanyName] = useState(company?.name || '');
  const [logo, setLogo] = useState(localStorage.getItem('vish_company_logo') || '');
  
  const [activeTab, setActiveTab] = useState('api-keys'); // 'profile' | 'api-keys' | 'notifications' | 'account'
  const [copiedKeyId, setCopiedKeyId] = useState(null);
  
  // New key modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState('production');

  const { data: keysData, refetch: refetchKeys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => authAPI.getKeys(),
    retry: false
  });

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

          {(activeTab === 'notifications' || activeTab === 'account') && (
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.03)] border border-gray-100 p-12 text-center flex flex-col items-center justify-center space-y-4 min-h-[300px]">
              <div className="w-12 h-12 rounded-full bg-[#EFF6FF]/50 text-[#2563EB] flex items-center justify-center">
                <Lock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-charcoal text-md">Feature Mocked</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                  This Settings sub-tab is currently mocked for the Sem-IV project demonstration.
                </p>
              </div>
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
